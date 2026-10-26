import crypto from 'crypto';

function getAesKey() {
  const keyString = process.env.CASINO_API_SECRET;
  if (!keyString) {
    throw new Error('CASINO_API_SECRET is not set in .env');
  }
  return keyString;
}

//  Create proper 32-byte key for AES-256
function createKey(keyString) {
  const keyBuffer = Buffer.from(keyString, 'utf8');
  if (keyBuffer.length >= 32) {
    return keyBuffer.slice(0, 32);
  } else {
    // Pad with zeros if key is too short
    const paddedKey = Buffer.alloc(32);
    keyBuffer.copy(paddedKey);
    return paddedKey;
  }
}

//  Match PHP openssl_encrypt with OPENSSL_RAW_DATA + base64_encode
export function encrypt(payload) {
  try {
    const text =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    const key = createKey(getAesKey());

    // Create cipher with AES-256-ECB (like PHP)
    const cipher = crypto.createCipheriv('aes-256-ecb', key, null);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
  } catch (error) {
    console.error('🔒 Encryption error:', error);
    throw error;
  }
}

export function decrypt(cipherText) {
  try {
    const key = createKey(getAesKey());

    // Create decipher with AES-256-ECB (like PHP)
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);

    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(
      'Payload decryption failed or invalid JSON: ' + error.message
    );
  }
}
