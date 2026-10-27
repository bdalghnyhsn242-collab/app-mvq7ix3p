import {
  decode as b64decode,
  encode as b64encode,
} from "https://deno.land/std@0.168.0/encoding/base64.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, usage);
}

function bytesToBase64(bytes: Uint8Array) {
  return b64encode(bytes);
}

function base64ToBytes(value: string) {
  return new Uint8Array(b64decode(value));
}

export async function encryptText(plainText: string, secret: string): Promise<string> {
  const key = await deriveKey(secret, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText),
  );
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);
  return bytesToBase64(combined);
}

export async function decryptText(cipherText: string, secret: string): Promise<string> {
  const combined = base64ToBytes(cipherText);
  if (combined.length < 13) throw new Error("Invalid cipher text");

  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);
  const key = await deriveKey(secret, ["decrypt"]);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  return decoder.decode(plainBuffer);
}
