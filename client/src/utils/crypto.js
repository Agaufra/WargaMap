import CryptoJS from 'crypto-js';
import { chacha20 } from '@noble/ciphers/chacha.js';
import { utf8ToBytes, bytesToUtf8, hexToBytes, bytesToHex } from '@noble/ciphers/utils.js';

// Standard keys for demonstration (In production, use environment variables)
const AES_KEY = 'cs_128_bit_key_!'; // 16 characters = 128 bits
const CHACHA_KEY = utf8ToBytes('cs_256_bit_secure_chat_key_!!!!_').slice(0, 32); // 32 bytes = 256 bits

const key = CryptoJS.enc.Utf8.parse(AES_KEY.padEnd(16, '!').slice(0, 16));

/**
 * AES-128 Encryption for Auth (Deterministic)
 */
export const encryptAES = (data) => {
  const text = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
};

export const decryptAES = (ciphertext) => {
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  return decryptedData;
};

/**
 * ChaCha20 Encryption for Chat
 */
export const encryptChaCha20 = (text) => {
  const nonce = new Uint8Array(12); // Use a simple zero nonce for demonstration or random
  window.crypto.getRandomValues(nonce);
  
  const data = utf8ToBytes(text);
  const cipher = chacha20(CHACHA_KEY, nonce, data);
  
  // Combine nonce and cipher for transport
  return {
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(cipher)
  };
};

export const decryptChaCha20 = (encryptedObj) => {
  const { nonce, ciphertext } = encryptedObj;
  const nonceBytes = hexToBytes(nonce);
  const cipherBytes = hexToBytes(ciphertext);
  
  const decrypted = chacha20(CHACHA_KEY, nonceBytes, cipherBytes);
  return bytesToUtf8(decrypted);
};
