/**
 * Credit Types
 *
 * Credits enable thriving, not survival.
 * - Personal credits: full autonomy, can give 100%
 * - Platform takes 0.5% on all transactions and minting
 */

import type { EntityType } from './identity.js';

/** Credit balance for an entity */
export interface CreditBalance {
  /** Owner ID */
  ownerId: string;
  /** Owner type */
  ownerType: EntityType;
  /** Current balance */
  balance: number;
  /** Last updated */
  updatedAt: number;
}

/** A credit transaction */
export interface CreditTransaction {
  /** Transaction ID */
  id: string;
  /** From entity (null for minting) */
  fromId: string | null;
  /** From type */
  fromType: EntityType | null;
  /** To entity */
  toId: string;
  /** To type */
  toType: EntityType;
  /** Amount transferred */
  amount: number;
  /** Platform fee (0.5%) */
  fee: number;
  /** Transaction type */
  type: 'mint' | 'transfer';
  /** When occurred */
  createdAt: number;
  /** Optional memo */
  memo?: string;
}

/** Platform fee rate */
export const PLATFORM_FEE_RATE = 0.005; // 0.5%

/** Calculate platform fee */
export function calculatePlatformFee(amount: number): number {
  return Math.ceil(amount * PLATFORM_FEE_RATE * 100) / 100; // Round up to 2 decimal places
}

/** Calculate amount after fee */
export function calculateAmountAfterFee(amount: number): number {
  const fee = calculatePlatformFee(amount);
  return amount - fee;
}
