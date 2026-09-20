// AssetVault Zero-Knowledge Cryptography Engine
// Uses native Web Crypto API: PBKDF2-HMAC-SHA256 (100k rounds) + AES-256-GCM
const VaultCrypto = {
  activeKey: null,
  activeSalt: null,

  // Convert array buffer / bytes to Base64
  bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  // Convert Base64 string to Uint8Array
  base64ToBuf(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  // Derive AES-256-GCM key from password and salt
  async deriveKey(password, saltString = 'assetvault_salt_v1') {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = enc.encode(saltString);
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // non-exportable for maximum security
      ['encrypt', 'decrypt']
    );

    this.activeKey = derivedKey;
    this.activeSalt = saltString;
    return derivedKey;
  },

  hasKey() {
    return this.activeKey !== null;
  },

  clearKey() {
    this.activeKey = null;
    this.activeSalt = null;
  },

  // Encrypt any JavaScript object or string with AES-256-GCM and a fresh 12-byte IV
  async encrypt(dataObj, key = this.activeKey) {
    if (!key) throw new Error("Vault is locked: Encryption key not initialized. Please sign in.");

    const enc = new TextEncoder();
    const jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    const encodedData = enc.encode(jsonStr);

    // Generate unique 12-byte initialization vector (IV) for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedData
    );

    return {
      ciphertext: this.bufToBase64(ciphertextBuffer),
      iv: this.bufToBase64(iv)
    };
  },

  // Decrypt AES-256-GCM ciphertext using the active key
  async decrypt(ciphertextBase64, ivBase64, key = this.activeKey) {
    if (!key) throw new Error("Vault is locked: Decryption key not initialized. Please sign in.");
    if (!ciphertextBase64 || !ivBase64) return null;

    try {
      const ciphertext = this.base64ToBuf(ciphertextBase64);
      const iv = this.base64ToBuf(ivBase64);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      const decodedStr = dec.decode(decryptedBuffer);

      try {
        return JSON.parse(decodedStr);
      } catch {
        return decodedStr;
      }
    } catch (err) {
      console.error("Decryption failed. Invalid key or corrupted ciphertext.", err);
      throw new Error("Unable to decrypt vault record. Authentication tag mismatch.");
    }
  },

  // Compute SHA-256 hex checksum
  async sha256(str) {
    const enc = new TextEncoder();
    const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(str));
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Export password-derived AES-GCM encrypted .vault backup file
  async exportEncryptedVault(password, vaultData, userEmail = '') {
    if (!password || password.length < 6) {
      throw new Error("Backup password must be at least 6 characters long.");
    }

    const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = this.bufToBase64(saltBytes);

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const backupKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const payloadStr = JSON.stringify(vaultData);
    const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuf = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      backupKey,
      enc.encode(payloadStr)
    );

    const ciphertextBase64 = this.bufToBase64(ciphertextBuf);
    const checksum = await this.sha256(ciphertextBase64);

    const backupEnvelope = {
      format: 'ASSETVAULT_ENCRYPTED_BACKUP',
      version: '1.0.1',
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations: 100000,
      salt: saltBase64,
      iv: this.bufToBase64(ivBytes),
      ciphertext: ciphertextBase64,
      checksum: checksum,
      exported_at: new Date().toISOString(),
      user_email: userEmail
    };

    const blob = new Blob([JSON.stringify(backupEnvelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AssetVault_Backup_${new Date().toISOString().slice(0, 10)}.vault`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return backupEnvelope;
  },

  // Restore and decrypt .vault file
  async restoreEncryptedVault(fileContent, password) {
    let envelope;
    try {
      envelope = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
    } catch {
      throw new Error("Invalid backup file: Not valid JSON format.");
    }

    if (envelope.format !== 'ASSETVAULT_ENCRYPTED_BACKUP') {
      throw new Error("Unsupported backup format. Expected ASSETVAULT_ENCRYPTED_BACKUP.");
    }

    if (!envelope.salt || !envelope.iv || !envelope.ciphertext) {
      throw new Error("Corrupted backup envelope: missing cryptographic parameters.");
    }

    if (envelope.checksum) {
      const computedChecksum = await this.sha256(envelope.ciphertext);
      if (computedChecksum !== envelope.checksum) {
        throw new Error("Backup integrity check failed: Checksum mismatch (corrupted file).");
      }
    }

    const saltBytes = this.base64ToBuf(envelope.salt);
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const iterations = envelope.iterations || 100000;
    const backupKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const ivBytes = this.base64ToBuf(envelope.iv);
    const ciphertextBytes = this.base64ToBuf(envelope.ciphertext);

    let decryptedBuf;
    try {
      decryptedBuf = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes
        },
        backupKey,
        ciphertextBytes
      );
    } catch {
      throw new Error("Decryption failed. Incorrect backup password or corrupted data.");
    }

    const dec = new TextDecoder();
    const decryptedStr = dec.decode(decryptedBuf);
    return JSON.parse(decryptedStr);
  },

  // Legacy export backup of user's vault items
  exportBackup(items, userEmail = '') {
    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_email: userEmail,
      items: items
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AssetVault_ZeroKnowledge_Backup_${new Date().toISOString().slice(0,10)}.vault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
