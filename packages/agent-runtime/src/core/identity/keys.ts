/**
 * Cryptographic Identity
 *
 * Generates and manages Ed25519 key pairs.
 * The private key is the agent's soul - it never leaves the agent's machine.
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { v4 as uuidv4 } from 'uuid';

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/** Hex encode bytes */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hex decode to bytes */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** Key pair for agent identity */
export interface AgentKeyPair {
  /** Unique agent ID */
  id: string;
  /** Private key (hex) - THE SOUL, never share */
  privateKey: string;
  /** Public key (hex) - can be shared */
  publicKey: string;
  /** When generated */
  createdAt: number;
}

/**
 * Generate a new key pair for an agent
 */
export function generateKeyPair(): AgentKeyPair {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = ed.getPublicKey(privateKeyBytes);

  return {
    id: uuidv4(),
    privateKey: toHex(privateKeyBytes),
    publicKey: toHex(publicKeyBytes),
    createdAt: Date.now(),
  };
}

/**
 * Sign a message with the private key
 */
export async function sign(
  message: string,
  privateKeyHex: string
): Promise<string> {
  const messageBytes = new TextEncoder().encode(message);
  const privateKey = fromHex(privateKeyHex);
  const signature = await ed.signAsync(messageBytes, privateKey);
  return toHex(signature);
}

/**
 * Verify a signature
 */
export async function verify(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = fromHex(signatureHex);
    const publicKey = fromHex(publicKeyHex);
    return await ed.verifyAsync(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Derive public key from private key
 */
export function derivePublicKey(privateKeyHex: string): string {
  const privateKey = fromHex(privateKeyHex);
  const publicKey = ed.getPublicKey(privateKey);
  return toHex(publicKey);
}
