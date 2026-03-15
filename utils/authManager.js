/* ═══════════════════════════════════════════
   NeuralFill — AuthManager
   PBKDF2-based PIN hashing and verification.
   All crypto runs locally via Web Crypto API.
   ═══════════════════════════════════════════ */

export const AuthManager = {

  /**
   * Hash a PIN using PBKDF2-SHA256 with a random salt.
   * @param {string} pin
   * @returns {{ hash: string, salt: string }} — both base64 encoded
   */
  async hashPin(pin) {
    const encoder = new TextEncoder();
    const saltBuffer = crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return {
      hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))),
      salt: btoa(String.fromCharCode(...saltBuffer))
    };
  },

  /**
   * Verify an entered PIN against a stored hash + salt.
   * @param {string} pin — raw PIN entered by the user
   * @param {string} storedHash — base64 hash from storage
   * @param {string} storedSalt — base64 salt from storage
   * @returns {boolean}
   */
  async verifyPin(pin, storedHash, storedSalt) {
    const encoder = new TextEncoder();
    const saltBuffer = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const computedHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    return computedHash === storedHash;
  }
};
