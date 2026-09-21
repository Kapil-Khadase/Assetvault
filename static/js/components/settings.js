// User Settings, Security Hardening & Disaster Recovery Component
const SettingsComponent = {
  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Settings & Security';

    container.innerHTML = `
      <div class="settings-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            <i data-lucide="shield-check" style="color: var(--gold-light);"></i>
            Security, Privacy & Depository Settings
          </h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Manage your depository preferences, account security, zero-knowledge backups, and privacy controls.</p>
        </div>

        <!-- Encryption Password Loss Warning Banner (Requirement 13) -->
        <div class="glass-card" style="margin-bottom: 24px; border-left: 4px solid var(--gold-primary); background: rgba(212, 175, 55, 0.08); padding: 16px 20px; display: flex; align-items: flex-start; gap: 14px;">
          <i data-lucide="alert-triangle" style="color: var(--gold-light); min-width: 22px; margin-top: 2px;"></i>
          <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
            <strong style="color: #fff; font-size: 0.9rem;">Zero-Knowledge Cryptographic Notice:</strong><br />
            AssetVault uses zero-knowledge client-side encryption. If you lose your password, encrypted documents and zero-knowledge vault entries cannot be recovered by AssetVault or server administrators. No master key or backdoor exists.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <!-- Left Column: Profile, Valuation & Health -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Profile & Base Currency -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 20px;"><i data-lucide="user" style="color: var(--gold-light);"></i> Profile & Currency</h3>
              
              <form onsubmit="SettingsComponent.handleSaveProfile(event)">
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-control" id="settings-name" required />
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Email Address</label>
                  <input type="email" class="form-control" id="settings-email" disabled style="opacity: 0.6;" />
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label">Base Valuation Currency</label>
                  <select class="form-control" id="settings-currency" onchange="SettingsComponent.onCurrencyChange(this.value)">
                    <option value="INR" selected>Indian Rupee (INR - ₹)</option>
                    <option value="USD">US Dollar (USD - $)</option>
                    <option value="EUR">Euro (EUR - €)</option>
                    <option value="GBP">British Pound (GBP - £)</option>
                  </select>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                  <label class="form-label">Target Portfolio Milestone (₹)</label>
                  <input type="number" step="1000" class="form-control" id="settings-target-val" />
                </div>

                <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save Profile Preferences</button>
              </form>
            </div>

            <!-- Change Password Card (Requirement 6, 12) -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 16px;"><i data-lucide="key" style="color: var(--gold-light);"></i> Change Password</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">
                Updating your password re-keys your active session and invalidates all other devices.
              </p>

              <form onsubmit="SettingsComponent.handleChangePassword(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label">Current Password *</label>
                  <input type="password" class="form-control" id="pwd-current" required placeholder="Enter current password" />
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label">New Password (min 8 chars, 1 digit, 1 special) *</label>
                  <input type="password" class="form-control" id="pwd-new" required minlength="8" placeholder="Enter strong new password" />
                </div>

                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label">Confirm New Password *</label>
                  <input type="password" class="form-control" id="pwd-confirm" required minlength="8" placeholder="Re-enter new password" />
                </div>

                <button type="submit" class="btn btn-secondary" id="btn-change-pwd">
                  <i data-lucide="check"></i> Update Password
                </button>
              </form>
            </div>

            <!-- System Health Diagnostics Card -->
            <div class="glass-card">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--gold-light); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="activity" style="width: 16px; color: var(--gold-button);"></i> System Health & Engine Diagnostics
              </h4>
              <div id="health-card-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; font-size: 0.82rem;">
                <div style="color: var(--text-muted);"><i data-lucide="loader" class="spin"></i> Probing server health...</div>
              </div>
            </div>
          </div>

          <!-- Right Column: Backups, Market Feeds, Session & Danger Zone -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Complete Encrypted Vault Backup & Restore (Requirement 4) -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 14px;"><i data-lucide="archive" style="color: var(--gain-green);"></i> Complete Encrypted Vault Backup</h3>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45;">
                Generates a fully self-contained, password-encrypted <code style="color: var(--gold-button);">.vault</code> file bundling your physical holdings, transactions, price alerts, goals, and client-side encrypted documents with unique IVs.
              </p>

              <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <button type="button" class="btn btn-gold" onclick="SettingsComponent.openExportModal()">
                  <i data-lucide="download"></i> Export Complete .vault Bundle
                </button>
                <button type="button" class="btn btn-secondary" onclick="SettingsComponent.openRestoreModal()">
                  <i data-lucide="upload"></i> Restore from .vault
                </button>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border-light); padding-top: 12px;">
                <i data-lucide="lock" style="width: 13px; color: var(--gold-light);"></i> PBKDF2 (100,000 rounds) + AES-256-GCM + SHA-256 envelope checksum.
              </div>
            </div>

            <!-- Bullion Market Feeds -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 14px;"><i data-lucide="database" style="color: var(--gold-light);"></i> Bullion Market Feeds</h3>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px;">
                Sync official benchmark bullion spot rates with landed duty and GST calculations.
              </p>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label">MetalpriceAPI Key (Optional)</label>
                <input type="password" class="form-control" id="settings-api-key" placeholder="Enter API Key (e.g. 5a2b...)" />
              </div>

              <button class="btn btn-secondary" onclick="SettingsComponent.syncNow()">
                <i data-lucide="refresh-cw"></i> Sync Market Rates Now
              </button>
            </div>

            <!-- Session Management -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 12px;"><i data-lucide="shield" style="color: var(--gold-light);"></i> Session Security</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">
                Manage your active cryptographic sessions across devices.
              </p>

              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsComponent.handleLogoutAll()">
                  <i data-lucide="smartphone"></i> Revoke All Other Sessions
                </button>
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.3);" onclick="AuthComponent.logout()">
                  <i data-lucide="log-out"></i> Lock & Sign Out
                </button>
              </div>
            </div>

            <!-- Danger Zone: Permanent Account Deletion (Requirement 12) -->
            <div class="glass-card" style="border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.03);">
              <h3 class="card-title" style="color: var(--loss-red); margin-bottom: 8px;">
                <i data-lucide="alert-octagon" style="color: var(--loss-red);"></i> Danger Zone: Account Deletion
              </h3>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45;">
                Permanently purge your account, all asset holdings, transactions, and physical uploaded document files from server disk storage. This operation is irreversible.
              </p>
              <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: var(--loss-red);" onclick="SettingsComponent.openDeleteAccountModal()">
                <i data-lucide="trash-2"></i> Delete Account & Purge Vault
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modals Container -->
      <div id="settings-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadProfile();
    await this.loadHealth();
  },

  async loadProfile() {
    try {
      const res = await API.getProfile();
      const u = res.user;
      if (u) {
        const nameEl = document.getElementById('settings-name');
        const emailEl = document.getElementById('settings-email');
        const currEl = document.getElementById('settings-currency');
        const targetEl = document.getElementById('settings-target-val');

        if (nameEl) nameEl.value = u.name || '';
        if (emailEl) emailEl.value = u.email || '';
        if (currEl) currEl.value = u.currency || API.getCurrency();
        if (targetEl) targetEl.value = u.target_portfolio_value || 1000000;
      }
    } catch (e) {
      console.error("Profile load error", e);
    }
  },

  async loadHealth() {
    const container = document.getElementById('health-card-container');
    if (!container) return;

    const startTime = performance.now();
    try {
      const health = await API.getHealth();
      const latency = Math.round(performance.now() - startTime);

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <span style="color: var(--text-muted);">Status:</span>
            <span class="badge ${health.status === 'healthy' ? 'badge-success' : 'badge-danger'}" style="margin-left: 6px; font-weight: 700; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: var(--gain-green);">
              ● ${health.status.toUpperCase()}
            </span>
          </div>
          <div>
            <span style="color: var(--text-muted);">App Version:</span>
            <strong style="color: var(--gold-light); margin-left: 6px;">v${health.app_version || '2.0.0'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">Database:</span>
            <span style="margin-left: 6px; color: ${health.database === 'connected' ? 'var(--gain-green)' : 'var(--loss-red)'}; font-weight: 600;">
              ${health.database === 'connected' ? 'SQLite (Migrations 1-5 Active)' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span style="color: var(--text-muted);">API Latency:</span>
            <strong style="color: var(--text-primary); margin-left: 6px;">${latency} ms</strong>
          </div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
          <span>Crypto: AES-256-GCM / PBKDF2 (Client-Side E2EE)</span>
          <span>Environment: ${health.environment || 'production'}</span>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div style="color: var(--loss-red); font-size: 0.8rem;">
          <i data-lucide="alert-triangle" style="width: 14px;"></i> Server health probe failed: ${err.message}
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
  },

  onCurrencyChange(curr) {
    API.setCurrency(curr);
    App.showToast(`Base currency set to ${curr}. Recalculating portfolio...`, 'success');
    App.updateSidebarLiveRates();
  },

  async handleSaveProfile(e) {
    e.preventDefault();
    const name = document.getElementById('settings-name').value;
    const currency = document.getElementById('settings-currency').value;
    const targetVal = parseFloat(document.getElementById('settings-target-val').value) || 0;

    try {
      await API.updateProfile({ name, currency, target_portfolio_value: targetVal });
      API.setCurrency(currency);
      App.showToast('Profile preferences saved successfully!', 'success');
      App.updateUserDisplay();
      App.updateSidebarLiveRates();
      App.updateSyncTimestamp();
    } catch (err) {
      App.showToast('Failed to save preferences', 'error');
    }
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const currentPwd = document.getElementById('pwd-current').value;
    const newPwd = document.getElementById('pwd-new').value;
    const confirmPwd = document.getElementById('pwd-confirm').value;

    if (newPwd !== confirmPwd) {
      App.showToast('New password and confirmation do not match', 'error');
      return;
    }

    const btn = document.getElementById('btn-change-pwd');
    if (btn) btn.disabled = true;

    try {
      await API.changePassword(currentPwd, newPwd, confirmPwd);
      App.showToast('Password updated successfully! All other sessions invalidated.', 'success');
      document.getElementById('pwd-current').value = '';
      document.getElementById('pwd-new').value = '';
      document.getElementById('pwd-confirm').value = '';
    } catch (err) {
      App.showToast(err.message || 'Failed to update password', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async handleLogoutAll() {
    if (!confirm('This will invalidate all active sessions across all your browsers and devices. Continue?')) return;
    try {
      await API.logoutAllSessions();
      App.showToast('All other sessions invalidated successfully.', 'success');
    } catch (err) {
      App.showToast(err.message || 'Failed to invalidate sessions', 'error');
    }
  },

  openDeleteAccountModal() {
    const mount = document.getElementById('settings-modal-container') || document.body;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'delete-account-modal';

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px; border: 2px solid var(--loss-red);">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--loss-red);"><i data-lucide="alert-triangle"></i> Confirm Permanent Account Deletion</h3>
          <button class="modal-close-btn" onclick="document.getElementById('delete-account-modal').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45;">
          This action will <strong>permanently purge</strong> your account, all assets, transaction ledger, alerts, and all encrypted certificate/invoice files stored on the server. There is no undo.
        </p>

        <form onsubmit="SettingsComponent.handleDeleteAccountSubmit(event)">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Enter Account Password *</label>
            <input type="password" class="form-control" id="del-acc-pwd" required placeholder="Verify your password" />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">Type <strong>DELETE MY VAULT</strong> to confirm *</label>
            <input type="text" class="form-control" id="del-acc-phrase" required placeholder="DELETE MY VAULT" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('delete-account-modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-secondary" style="background: var(--loss-red); color: #fff; border: none;" id="btn-do-delete-acc">
              <i data-lucide="trash-2"></i> Permanently Purge Account
            </button>
          </div>
        </form>
      </div>
    `;

    mount.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },

  async handleDeleteAccountSubmit(e) {
    e.preventDefault();
    const pwd = document.getElementById('del-acc-pwd').value;
    const phrase = document.getElementById('del-acc-phrase').value;

    if (phrase !== 'DELETE MY VAULT') {
      App.showToast('Confirmation phrase does not match "DELETE MY VAULT"', 'error');
      return;
    }

    const btn = document.getElementById('btn-do-delete-acc');
    if (btn) btn.disabled = true;

    try {
      await API.deleteAccount(pwd, phrase);
      App.showToast('Account and all vault records permanently purged.', 'info');
      API.setToken('');
      if (typeof VaultCrypto !== 'undefined') VaultCrypto.clearKey();
      document.getElementById('delete-account-modal')?.remove();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      App.showToast(err.message || 'Failed to delete account', 'error');
      if (btn) btn.disabled = false;
    }
  },

  async syncNow() {
    const key = document.getElementById('settings-api-key').value;
    try {
      await API.syncMarketRates(key);
      App.showToast('Market rates synchronized successfully!', 'success');
      App.updateSidebarLiveRates();
      App.updateSyncTimestamp();
    } catch (e) {
      App.showToast('Sync error', 'error');
    }
  },

  openExportModal() {
    const mount = document.getElementById('settings-modal-container') || document.body;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'export-vault-modal';

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="lock" style="color: var(--gold-button);"></i> Export Complete .vault Bundle</h3>
          <button class="modal-close-btn" onclick="document.getElementById('export-vault-modal').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px;">
          Set a strong passphrase to encrypt your entire vault bundle (assets, transactions, goals, alerts, and document files). This passphrase is required to restore your vault.
        </p>

        <form onsubmit="SettingsComponent.handleExportSubmit(event)">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Backup Passphrase (min 6 chars) *</label>
            <input type="password" class="form-control" id="backup-pwd" required minlength="6" placeholder="Enter secure backup passphrase" />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">Confirm Passphrase *</label>
            <input type="password" class="form-control" id="backup-pwd-confirm" required minlength="6" placeholder="Confirm backup passphrase" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('export-vault-modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-gold" id="btn-do-export">
              <i data-lucide="download"></i> Encrypt & Download .vault
            </button>
          </div>
        </form>
      </div>
    `;

    mount.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },

  async handleExportSubmit(e) {
    e.preventDefault();
    const pwd = document.getElementById('backup-pwd').value;
    const confirm = document.getElementById('backup-pwd-confirm').value;

    if (pwd !== confirm) {
      App.showToast('Passwords do not match!', 'error');
      return;
    }

    const btn = document.getElementById('btn-do-export');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Encrypting full vault...';
    }

    try {
      // Export comprehensive vault payload from API (includes documents, tx, goals, alerts)
      const vaultData = await API.exportVaultData();
      await VaultCrypto.exportEncryptedVault(pwd, vaultData, vaultData.user?.email || '');
      App.showToast('Encrypted .vault backup created successfully with all documents and records!', 'success');
      document.getElementById('export-vault-modal')?.remove();
    } catch (err) {
      App.showToast(err.message || 'Export failed', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="download"></i> Encrypt & Download .vault';
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  openRestoreModal() {
    const mount = document.getElementById('settings-modal-container') || document.body;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'restore-vault-modal';

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="upload" style="color: var(--gold-button);"></i> Restore Encrypted .vault</h3>
          <button class="modal-close-btn" onclick="document.getElementById('restore-vault-modal').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px;">
          Select your <code style="color: var(--gold-button);">.vault</code> file and enter the passphrase used during export.
        </p>

        <form onsubmit="SettingsComponent.handleRestoreSubmit(event)">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Vault File (.vault) *</label>
            <input type="file" class="form-control" id="restore-vault-file" accept=".vault,.json" required />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">Backup Passphrase *</label>
            <input type="password" class="form-control" id="restore-pwd" required placeholder="Enter decryption passphrase" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('restore-vault-modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-gold" id="btn-do-restore">
              <i data-lucide="unlock"></i> Decrypt & Restore Vault
            </button>
          </div>
        </form>
      </div>
    `;

    mount.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },

  async handleRestoreSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('restore-vault-file');
    const pwd = document.getElementById('restore-pwd').value;
    const file = fileInput.files[0];

    if (!file) {
      App.showToast('Please select a .vault backup file.', 'error');
      return;
    }

    const btn = document.getElementById('btn-do-restore');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Decrypting...';
    }

    try {
      const fileContent = await file.text();
      const decryptedData = await VaultCrypto.restoreEncryptedVault(fileContent, pwd);

      const assets = decryptedData.assets || [];
      const docs = decryptedData.documents || [];

      if (!confirm(`Decrypted ${assets.length} assets and ${docs.length} documents from backup. Restore these into your depository vault?`)) {
        return;
      }

      // Restore via backend transaction
      const res = await API.restoreVaultData(decryptedData);
      App.showToast(`Successfully restored ${res.counts?.assets || assets.length} assets and ${res.counts?.documents || docs.length} documents!`, 'success');
      document.getElementById('restore-vault-modal')?.remove();
    } catch (err) {
      App.showToast(err.message || 'Restoration failed. Incorrect password or corrupted backup file.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="unlock"></i> Decrypt & Restore Vault';
        if (window.lucide) lucide.createIcons();
      }
    }
  }
};
