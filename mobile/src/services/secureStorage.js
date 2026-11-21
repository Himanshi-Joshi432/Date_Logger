import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync } from 'expo-crypto';

/**
 * Encrypted on-device storage.
 *
 * - The login token lives in the OS keychain / Android Keystore (expo-secure-store).
 * - Everything else personal (profile, cached journal, bucket list, log draft) is
 *   sealed with AES-256-GCM before it reaches AsyncStorage. The key is generated on
 *   this device and kept only in the keychain, so a copy of the app's storage
 *   (backup, rooted phone, file dump) is unreadable on its own.
 *
 * Values written before this existed are plain text. They are still read, and are
 * re-written encrypted the first time they are seen.
 */

const TOKEN_KEY = 'date_logger_token';
const DATA_KEY_NAME = 'date_logger_storage_key';
const PREFIX = 'enc:v1:';

const KEYCHAIN_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

let keyPromise = null;

/** Loads the device key, creating it on first use. Shared so parallel calls don't race. */
function getKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = await SecureStore.getItemAsync(DATA_KEY_NAME, KEYCHAIN_OPTIONS);
      if (stored) return AESEncryptionKey.import(stored, 'base64');
      const key = await AESEncryptionKey.generate();
      await SecureStore.setItemAsync(DATA_KEY_NAME, await key.encoded('base64'), KEYCHAIN_OPTIONS);
      return key;
    })().catch((e) => {
      keyPromise = null; // allow a retry on the next call
      throw e;
    });
  }
  return keyPromise;
}

function utf8Encode(text) {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes) {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  // Fallback for engines without TextDecoder.
  const codePoints = [];
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) codePoints.push(b);
    else if (b < 0xe0) codePoints.push(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0)
      codePoints.push(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else
      codePoints.push(
        ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
      );
  }
  let out = '';
  for (let i = 0; i < codePoints.length; i += 0x4000) {
    out += String.fromCodePoint.apply(null, codePoints.slice(i, i + 0x4000));
  }
  return out;
}

async function encrypt(plaintext) {
  const key = await getKey();
  const sealed = await aesEncryptAsync(utf8Encode(plaintext), key);
  return PREFIX + (await sealed.combined('base64'));
}

async function decrypt(stored) {
  const key = await getKey();
  const sealed = AESSealedData.fromCombined(stored.slice(PREFIX.length));
  const bytes = await aesDecryptAsync(sealed, key, { output: 'bytes' });
  return utf8Decode(bytes);
}

export const secureStorage = {
  async getItem(name) {
    const stored = await AsyncStorage.getItem(name);
    if (stored == null) return null;

    if (!stored.startsWith(PREFIX)) {
      // Legacy plain-text value: seal it in place (awaited, so a later write by the
      // caller can't be overwritten by this one), then hand it back.
      try {
        await AsyncStorage.setItem(name, await encrypt(stored));
      } catch (e) {}
      return stored;
    }

    try {
      return await decrypt(stored);
    } catch (e) {
      // Key no longer matches (e.g. storage restored onto another phone). The data is
      // unreadable, so drop it; callers treat this as "nothing cached".
      await AsyncStorage.removeItem(name).catch(() => {});
      return null;
    }
  },

  async setItem(name, value) {
    await AsyncStorage.setItem(name, await encrypt(String(value)));
  },

  removeItem(name) {
    return AsyncStorage.removeItem(name);
  },

  multiRemove(names) {
    return AsyncStorage.multiRemove(names);
  },
};

/** Login token, kept in the keychain rather than app storage. */
export const tokenStore = {
  async get() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS);
    if (token) return token;

    // Move a token saved by an older version out of plain AsyncStorage.
    const legacy = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy, KEYCHAIN_OPTIONS);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    return legacy;
  },

  set(token) {
    return SecureStore.setItemAsync(TOKEN_KEY, token, KEYCHAIN_OPTIONS);
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS).catch(() => {}),
      AsyncStorage.removeItem(TOKEN_KEY).catch(() => {}),
    ]);
  },
};
