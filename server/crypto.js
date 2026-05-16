const CryptoJS = require('crypto-js');
const crypto = require('crypto');

const AES_KEY = 'cs_128_bit_key_!';
const CHACHA_KEY = Buffer.from('cs_256_bit_secure_chat_key_!!!_').slice(0, 32);

/**
 * AES-128 for Auth (Deterministic for Searchable DB)
 */
const key = CryptoJS.enc.Utf8.parse(AES_KEY.padEnd(16, '!').slice(0, 16));

function encryptAES(data) {
  try {
    const text = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: key, // Using key as IV for deterministic encryption
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  } catch (e) {
    console.error('[CRYPTO] AES Encryption Error:', e.message);
    return null;
  }
}

function decryptAES(ciphertext) {
  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (e) {
    console.error('[CRYPTO] AES Decryption Error:', e.message);
    return null;
  }
}

/**
 * ChaCha20 for Chat (Using Node Native Crypto)
 */
function decryptChaCha20(encryptedObj) {
  try {
    const { nonce, ciphertext } = encryptedObj;
    const nonceBuffer = Buffer.from(nonce, 'hex');
    const ciphertextBuffer = Buffer.from(ciphertext, 'hex');
    
    const decipher = crypto.createDecipheriv('chacha20', CHACHA_KEY, nonceBuffer);
    const decrypted = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('[CRYPTO] ChaCha20 Decryption Error:', e.message);
    return null;
  }
}

function encryptChaCha20(text) {
  try {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('chacha20', CHACHA_KEY, nonce);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    
    return {
      nonce: nonce.toString('hex'),
      ciphertext: encrypted.toString('hex')
    };
  } catch (e) {
    return null;
  }
}

function encryptAES(data) {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), AES_KEY).toString();
  } catch (e) {
    console.error('[CRYPTO] AES Encryption Error:', e.message);
    return null;
  }
}

module.exports = { decryptAES, encryptAES, decryptChaCha20, encryptChaCha20 };
