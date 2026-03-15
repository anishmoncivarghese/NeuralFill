export class CryptoManager {
  /**
   * Generates a new AES-GCM 256-bit key.
   */
  static async generateKey() {
    return await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Exports a CryptoKey to a storable JWK format.
   */
  static async exportKey(key) {
    return await crypto.subtle.exportKey("jwk", key);
  }

  /**
   * Imports a JWK back into a CryptoKey.
   */
  static async importKey(jwk) {
    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts a JSON object and returns base64 string combining IV and Ciphertext.
   */
  static async encryptData(key, data) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    // Combine IV (12 bytes) and encrypted content
    const encryptedArray = new Uint8Array(encryptedContent);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to Base64 to safely store in chrome.storage
    return btoa(String.fromCharCode.apply(null, combined));
  }

  /**
   * Decrypts a base64 string into the original JSON object.
   */
  static async decryptData(key, encryptedBase64) {
    const combinedStr = atob(encryptedBase64);
    const combined = new Uint8Array(combinedStr.length);
    for (let i = 0; i < combinedStr.length; i++) {
        combined[i] = combinedStr.charCodeAt(i);
    }
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const encryptedContent = combined.slice(12);

    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedContent
    );

    const decoder = new TextDecoder();
    const decodedStr = decoder.decode(decryptedContent);
    return JSON.parse(decodedStr);
  }
}
