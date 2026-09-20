// User Settings, System Health & Disaster Recovery Component
const SettingsComponent = {
  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Settings & Diagnostics';

    container.innerHTML = `
      <div class="settings-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800;">Settings & Valuation Preferences</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Configure your base currency, portfolio targets, system health diagnostics, and zero-knowledge encrypted backups.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <!-- Left Column: Profile & Currency -->
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
                  <option value="INR">Indian Rupee (INR - ₹)</option>
                  <option value="USD">US Dollar (USD - $)</option>
                  <option value="EUR">Euro (EUR - €)</option>
                  <option value="GBP">British Pound (GBP - £)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label">Target Portfolio Milestone (Amount)</label>
                <input type="number" step="1000" class="form-control" id="settings-target-val" />
              </div>

              <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save Profile Preferences</button>
            </form>

            <!-- System Health Diagnostics Card -->
            <div style="border-top: 1px solid var(--border-color); margin-top: 24px; padding-top: 18px;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--gold-light); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="activity" style="width: 16px; color: var(--gold-button);"></i> System Health & Engine Diagnostics
              </h4>
              <div id="health-card-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; font-size: 0.82rem;">
                <div style="color: var(--text-muted);"><i data-lucide="loader" style="width: 14px;"></i> Probing server health...</div>
              </div>
            </div>
          </div>

          <!-- Right Column: Bullion API & Zero-Knowledge Backups -->
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom: 20px;"><i data-lucide="database" style="color: var(--gold-light);"></i> Bullion Market Feeds</h3>
            
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
              AssetVault computes real-time portfolio valuations using spot rate feeds with land-duty accounting. You can sync latest rates on-demand.
            </p>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">MetalpriceAPI / Bullion API Key (Optional)</label>
              <input type="password" class="form-control" id="settings-api-key" placeholder="Enter MetalpriceAPI Key (e.g. 5a2b...)" />
            </div>

            <div style="display: flex; gap: 12px; margin-top: 16px; margin-bottom: 24px;">
              <button class="btn btn-secondary" onclick="SettingsComponent.syncNow()">
                <i data-lucide="refresh-cw"></i> Sync Market Rates Now
              </button>
            </div>

            <!-- Zero-Knowledge Backup & Disaster Recovery -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 18px;">
              <div style="margin-bottom: 14px;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--gold-light); display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="shield-check" style="width: 16px; color: var(--gain-green);"></i> Zero-Knowledge Vault Backups
                </h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">
                  Export or restore password-derived AES-256-GCM encrypted vault bundles (<code style="color: var(--gold-button);">.vault</code>). All encryption is performed in your browser.
                </p>
              </div>

              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                <button type="button" class="btn btn-gold btn-sm" onclick="SettingsComponent.openExportModal()">
                  <i data-lucide="download" style="width: 14px;"></i> Export Encrypted .vault
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsComponent.openRestoreModal()">
                  <i data-lucide="upload" style="width: 14px;"></i> Restore from .vault
                </button>
              </div>
            </div>

            <!-- Session Termination -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 2px;">Account Session</h4>
                <p style="font-size: 0.78rem; color: var(--text-muted);">
                  Encrypted keys held strictly in memory &bull; Private session
                </p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.3);" onclick="AuthComponent.logout()">
                <i data-lucide="log-out" style="width: 14px;"></i> Lock & Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Password Modal Container -->
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
            <strong style="color: var(--gold-light); margin-left: 6px;">v${health.app_version || '1.0.1'}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted);">Database:</span>
            <span style="margin-left: 6px; color: ${health.database === 'connected' ? 'var(--gain-green)' : 'var(--loss-red)'}; font-weight: 600;">
              ${health.database === 'connected' ? 'SQLite (WAL Active)' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span style="color: var(--text-muted);">API Latency:</span>
            <strong style="color: var(--text-primary); margin-left: 6px;">${latency} ms</strong>
          </div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
          <span>Crypto: AES-256-GCM / PBKDF2 (Client-Side)</span>
          <span>Env: ${health.environment || 'production'}</span>
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
    App.showToast(`Currency set to ${curr}. Refreshing rates...`, 'success');
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
      App.showToast('Settings saved successfully!', 'success');
      App.updateUserDisplay();
      App.updateSidebarLiveRates();
      App.updateSyncTimestamp();
    } catch (err) {
      App.showToast('Failed to save settings', 'error');
    }
  },

  async syncNow() {
    const key = document.getElementById('settings-api-key').value;
    try {
      await API.syncMarketRates(key);
      App.showToast('Market rates synchronized!', 'success');
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
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="lock" style="color: var(--gold-button);"></i> Export Encrypted .vault Backup</h3>
          <button class="modal-close-btn" onclick="document.getElementById('export-vault-modal').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px;">
          Set a strong passphrase to encrypt your vault backup. This passphrase is required to restore your holdings later.
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
      btn.innerHTML = 'Encrypting...';
    }

    try {
      const assetsRes = await API.getAssets();
      const txRes = await API.getTransactions().catch(() => ({ transactions: [] }));
      const goalsRes = await API.getGoals().catch(() => ({ goals: [] }));
      const userRes = await API.getProfile().catch(() => ({ user: {} }));

      const vaultData = {
        exported_at: new Date().toISOString(),
        user_email: userRes.user?.email || 'user',
        assets: assetsRes.assets || [],
        transactions: txRes.transactions || [],
        goals: goalsRes.goals || []
      };

      await VaultCrypto.exportEncryptedVault(pwd, vaultData, vaultData.user_email);
      App.showToast('Encrypted .vault backup created successfully!', 'success');
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
              <i data-lucide="unlock"></i> Decrypt & Restore Assets
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
      if (assets.length === 0) {
        App.showToast('Backup decrypted successfully, but no assets were found in this file.', 'warning');
        document.getElementById('restore-vault-modal')?.remove();
        return;
      }

      if (!confirm(`Decrypted ${assets.length} assets from backup. Restore these assets into your current vault?`)) {
        return;
      }

      // Restore assets via API
      let restoredCount = 0;
      for (const a of assets) {
        try {
          await API.createAsset({
            asset_name: a.asset_name,
            asset_type: a.asset_type || 'Precious Bullion',
            category_id: a.category_id || 1,
            metal: a.metal || 'Gold',
            purity: a.purity || '24K',
            gross_weight: a.gross_weight || a.net_weight || 0,
            net_weight: a.net_weight || a.gross_weight || 0,
            purchase_price: a.purchase_price || a.total_acquisition_cost || 0,
            total_acquisition_cost: a.total_acquisition_cost || a.purchase_price || 0,
            purchase_date: a.purchase_date || new Date().toISOString().slice(0, 10),
            owner_name: a.owner_name || a.buyer_name || 'Self',
            jeweller_name: a.jeweller_name || a.jeweller || '',
            jeweller: a.jeweller || a.jeweller_name || '',
            photo_url: a.photo_url || ''
          });
          restoredCount++;
        } catch (itemErr) {
          console.warn(`Skipping asset ${a.asset_name}:`, itemErr);
        }
      }

      App.showToast(`Successfully restored ${restoredCount} assets into your vault!`, 'success');
      document.getElementById('restore-vault-modal')?.remove();
    } catch (err) {
      App.showToast(err.message || 'Restoration failed. Invalid password or corrupted file.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="unlock"></i> Decrypt & Restore Assets';
        if (window.lucide) lucide.createIcons();
      }
    }
  }
};
