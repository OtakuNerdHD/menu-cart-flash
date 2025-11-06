export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function importAesKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get('PAYMENT_ENC_KEY');
  if (!keyB64) throw new Error('Missing PAYMENT_ENC_KEY env');
  const raw = b64ToBytes(keyB64);
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptPlain(plain: string): Promise<{ cipher_b64: string; iv_b64: string }> {
  const key = await importAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain));
  return { cipher_b64: bytesToB64(new Uint8Array(cipherBuf)), iv_b64: bytesToB64(iv) };
}

export async function decryptToPlain(cipher_b64: string, iv_b64: string): Promise<string> {
  const key = await importAesKey();
  const iv = b64ToBytes(iv_b64);
  const cipher = b64ToBytes(cipher_b64);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(new Uint8Array(plainBuf));
}
