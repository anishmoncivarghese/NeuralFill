import { CryptoManager } from '../utils/crypto.js';

export class StorageManager {
  static async getEncryptionKey() {
    const data = await chrome.storage.local.get(['encryptionKey']);
    if (!data.encryptionKey) return null;
    return await CryptoManager.importKey(data.encryptionKey);
  }

  static async getProfiles() {
    const key = await this.getEncryptionKey();
    if (!key) return []; // Cannot decrypt

    const data = await chrome.storage.local.get(['encryptedProfiles']);
    if (!data.encryptedProfiles) return [];

    try {
      return await CryptoManager.decryptData(key, data.encryptedProfiles);
    } catch (error) {
      console.error("Failed to decrypt profiles:", error);
      return [];
    }
  }

  static async saveProfiles(profilesArray) {
    const key = await this.getEncryptionKey();
    if (!key) {
      console.error("No encryption key found. Cannot save.");
      return false;
    }

    try {
      const encryptedBase64 = await CryptoManager.encryptData(key, profilesArray);
      await chrome.storage.local.set({ encryptedProfiles: encryptedBase64 });
      return true;
    } catch (error) {
      console.error("Failed to encrypt profiles:", error);
      return false;
    }
  }
}
