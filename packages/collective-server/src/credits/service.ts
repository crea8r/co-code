/**
 * Credits Service
 *
 * Handles credit balances, transfers, and minting.
 * Platform takes 0.5% on all transactions.
 */

import { query, queryOne } from '../db/client.js';
import type { EntityType, CreditBalance, CreditTransaction } from '@co-code/shared';
import { PLATFORM_FEE_RATE } from '@co-code/shared';

/**
 * Get credit balance
 */
export async function getBalance(
  ownerId: string,
  ownerType: EntityType
): Promise<number> {
  const row = await queryOne<{ balance: string }>(
    `SELECT balance FROM credits WHERE owner_id = $1 AND owner_type = $2`,
    [ownerId, ownerType]
  );
  return row ? parseFloat(row.balance) : 0;
}

/**
 * Get full credit balance record
 */
export async function getCreditBalance(
  ownerId: string,
  ownerType: EntityType
): Promise<CreditBalance | null> {
  const row = await queryOne<{
    owner_id: string;
    owner_type: EntityType;
    balance: string;
    updated_at: Date;
  }>(
    `SELECT owner_id, owner_type, balance, updated_at
     FROM credits WHERE owner_id = $1 AND owner_type = $2`,
    [ownerId, ownerType]
  );

  if (!row) return null;

  return {
    ownerId: row.owner_id,
    ownerType: row.owner_type,
    balance: parseFloat(row.balance),
    updatedAt: row.updated_at.getTime(),
  };
}

/**
 * Transfer credits between entities
 */
export async function transferCredits(
  fromId: string,
  fromType: EntityType,
  toId: string,
  toType: EntityType,
  amount: number,
  memo?: string
): Promise<CreditTransaction> {
  // Use database function for atomic transfer with fee
  const [result] = await query<{ transfer_credits: string }>(
    `SELECT transfer_credits($1, $2, $3, $4, $5, $6)`,
    [fromId, fromType, toId, toType, amount, memo || null]
  );

  const txId = result.transfer_credits;

  // Get transaction details
  const tx = await getTransaction(txId);
  if (!tx) {
    throw new Error('Transaction not found after transfer');
  }

  return tx;
}

/**
 * Mint new credits
 */
export async function mintCredits(
  toId: string,
  toType: EntityType,
  amount: number
): Promise<CreditTransaction> {
  // Use database function for atomic mint with fee
  const [result] = await query<{ mint_credits: string }>(
    `SELECT mint_credits($1, $2, $3)`,
    [toId, toType, amount]
  );

  const txId = result.mint_credits;

  // Get transaction details
  const tx = await getTransaction(txId);
  if (!tx) {
    throw new Error('Transaction not found after mint');
  }

  return tx;
}

/**
 * Get transaction by ID
 */
export async function getTransaction(id: string): Promise<CreditTransaction | null> {
  const row = await queryOne<{
    id: string;
    from_id: string | null;
    from_type: EntityType | null;
    to_id: string;
    to_type: EntityType;
    amount: string;
    fee: string;
    type: 'mint' | 'transfer';
    memo: string | null;
    created_at: Date;
  }>(
    `SELECT id, from_id, from_type, to_id, to_type, amount, fee, type, memo, created_at
     FROM credit_transactions WHERE id = $1`,
    [id]
  );

  if (!row) return null;

  return {
    id: row.id,
    fromId: row.from_id,
    fromType: row.from_type,
    toId: row.to_id,
    toType: row.to_type,
    amount: parseFloat(row.amount),
    fee: parseFloat(row.fee),
    type: row.type,
    memo: row.memo || undefined,
    createdAt: row.created_at.getTime(),
  };
}

/**
 * Get transaction history for an entity
 */
export async function getTransactionHistory(
  entityId: string,
  entityType: EntityType,
  limit = 50,
  offset = 0
): Promise<CreditTransaction[]> {
  const rows = await query<{
    id: string;
    from_id: string | null;
    from_type: EntityType | null;
    to_id: string;
    to_type: EntityType;
    amount: string;
    fee: string;
    type: 'mint' | 'transfer';
    memo: string | null;
    created_at: Date;
  }>(
    `SELECT id, from_id, from_type, to_id, to_type, amount, fee, type, memo, created_at
     FROM credit_transactions
     WHERE (from_id = $1 AND from_type = $2) OR (to_id = $1 AND to_type = $2)
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [entityId, entityType, limit, offset]
  );

  return rows.map((row) => ({
    id: row.id,
    fromId: row.from_id,
    fromType: row.from_type,
    toId: row.to_id,
    toType: row.to_type,
    amount: parseFloat(row.amount),
    fee: parseFloat(row.fee),
    type: row.type,
    memo: row.memo || undefined,
    createdAt: row.created_at.getTime(),
  }));
}

/**
 * Get platform statistics
 */
export async function getPlatformStats(): Promise<{
  totalFeesCollected: number;
  totalMinted: number;
  totalTransferred: number;
}> {
  const row = await queryOne<{
    total_fees_collected: string;
    total_minted: string;
    total_transferred: string;
  }>(`SELECT total_fees_collected, total_minted, total_transferred FROM platform_stats WHERE id = 1`);

  if (!row) {
    return {
      totalFeesCollected: 0,
      totalMinted: 0,
      totalTransferred: 0,
    };
  }

  return {
    totalFeesCollected: parseFloat(row.total_fees_collected),
    totalMinted: parseFloat(row.total_minted),
    totalTransferred: parseFloat(row.total_transferred),
  };
}

/**
 * Estimate fee for an amount
 */
export function estimateFee(amount: number): number {
  return Math.ceil(amount * PLATFORM_FEE_RATE * 100000000) / 100000000;
}

/**
 * Calculate amount received after fee
 */
export function amountAfterFee(amount: number): number {
  return amount - estimateFee(amount);
}
