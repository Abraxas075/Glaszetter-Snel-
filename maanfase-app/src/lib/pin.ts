import type { PinData } from './types';

const ITERATIONS = 150_000;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toHex(bits);
}

export async function createPin(pin: string): Promise<PinData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt.buffer), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS };
}

export async function verifyPin(pin: string, data: PinData): Promise<boolean> {
  const h = await derive(pin, fromHex(data.salt), data.iterations);
  if (h.length !== data.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ data.hash.charCodeAt(i);
  return diff === 0;
}
