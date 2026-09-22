// AssetVault Client-Side Cryptography Engine
// Implements Web Crypto API AES-256-GCM encryption, PBKDF2 key derivation,
// file validation before encryption, and client-encrypted .vault bundle packaging.
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

  // Client-side document binary encryption: Takes ArrayBuffer, returns { ciphertextBuffer, iv, metadata }
  async encryptBuffer(arrayBuffer, key = this.activeKey) {
    if (!key) throw new Error("Vault is locked: Encryption key not initialized. Please sign in.");
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      arrayBuffer
    );
    return {
      ciphertextBuffer: ciphertextBuffer,
      iv: this.bufToBase64(iv),
      metadata: {
        alg: "AES-GCM",
        key_bits: 256,
        tag_bits: 128
      }
    };
  },

  // Client-side document binary decryption: Takes ArrayBuffer or Base64, returns decrypted ArrayBuffer
  async decryptBuffer(ciphertext, ivBase64, key = this.activeKey) {
    if (!key) throw new Error("Vault is locked: Decryption key not initialized. Please sign in.");
    if (!ciphertext || !ivBase64) return null;

    const iv = this.base64ToBuf(ivBase64);
    const dataBuffer = (typeof ciphertext === 'string') ? this.base64ToBuf(ciphertext) : ciphertext;

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        dataBuffer
      );
      return decryptedBuffer;
    } catch (err) {
      console.error("Document decryption failed.", err);
      throw new Error("Unable to decrypt document. Authentication tag mismatch or invalid vault key.");
    }
  },

  // Compute SHA-256 hex checksum
  async sha256(str) {
    const enc = new TextEncoder();
    const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(str));
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Validate original file in browser before client-side encryption (Requirement 5)
  async validateFile(file) {
    if (!file) throw new Error("No file selected.");
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error(`File size (${(file.size / (1024*1024)).toFixed(1)} MB) exceeds the 25 MB depository limit.`);
    }
    if (file.size < 4) {
      throw new Error("File is empty or corrupted (under 4 bytes).");
    }

    const ext = (file.name || '').split('.').pop().toLowerCase();
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
    if (!allowed.includes(ext)) {
      throw new Error(`Invalid file extension '.${ext}'. Supported document formats: PDF, PNG, JPG, JPEG, WEBP.`);
    }

    const mime = (file.type || '').toLowerCase();
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/pjpeg', 'image/webp'];
    if (mime && !allowedMimes.includes(mime)) {
      throw new Error(`Invalid MIME type '${file.type}'. Expected PDF or image format.`);
    }

    // Inspect magic bytes header
    const headerBuf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);

    // Detect and reject executable / script headers regardless of filename
    if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
      throw new Error("Executable file (MZ/DOS/EXE) detected. Upload rejected for security.");
    }
    if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
      throw new Error("Linux executable (ELF) detected. Upload rejected for security.");
    }
    if (bytes[0] === 0x23 && bytes[1] === 0x21) {
      throw new Error("Script file (#! shell) detected. Upload rejected for security.");
    }

    // Extension-specific signature checks
    if (ext === 'pdf') {
      if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        throw new Error("File signature does not match PDF format. Fake or corrupted file rejected.");
      }
    } else if (ext === 'png') {
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        throw new Error("File signature does not match PNG image format. Fake or corrupted file rejected.");
      }
    } else if (ext === 'jpg' || ext === 'jpeg') {
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
        throw new Error("File signature does not match JPEG image format. Fake or corrupted file rejected.");
      }
    } else if (ext === 'webp') {
      const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
      const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (riff !== 'RIFF' || webp !== 'WEBP') {
        throw new Error("File signature does not match WEBP image format. Fake or corrupted file rejected.");
      }
    }

    // Image dimension decode verification
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      await new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objUrl);
          if (img.width > 0 && img.height > 0) {
            resolve({ width: img.width, height: img.height });
          } else {
            reject(new Error("Malformed image: Invalid or zero image dimensions."));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objUrl);
          reject(new Error("Malformed image file: Browser was unable to decode image data."));
        };
        img.src = objUrl;
      });
    }

    return true;
  },

  // Export password-derived AES-GCM encrypted .vault backup file (Requirement 6)
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

    // Embed version metadata into inner vault payload
    const versionedPayload = {
      backup_version: 1,
      schema_version: 6,
      app_version: "2.0.0",
      created_at: new Date().toISOString(),
      currency: vaultData.currency || vaultData.profile?.currency || 'INR',
      encryption_format: "AES-256-GCM",
      ...vaultData
    };

    const payloadStr = JSON.stringify(versionedPayload);
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
      backup_version: 1,
      schema_version: 6,
      app_version: '2.0.0',
      created_at: new Date().toISOString(),
      currency: versionedPayload.currency,
      encryption_format: 'AES-256-GCM',
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

  // Restore and decrypt .vault file with version & compatibility validation (Requirement 6)
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

    // Version compatibility check
    if (envelope.backup_version && envelope.backup_version > 1) {
      throw new Error(`Unsupported future backup version (v${envelope.backup_version}). Please upgrade AssetVault.`);
    }

    if (envelope.schema_version && envelope.schema_version > 6) {
      throw new Error(`Unsupported future schema version (${envelope.schema_version}). Please upgrade AssetVault.`);
    }

    if (envelope.encryption_format && !['AES-256-GCM', 'AES-GCM'].includes(envelope.encryption_format)) {
      throw new Error(`Unsupported encryption format '${envelope.encryption_format}'. Only AES-256-GCM is supported.`);
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
    a.download = `AssetVault_Encrypted_Backup_${new Date().toISOString().slice(0,10)}.vault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
