// User Settings & Currency Profile Component
const SettingsComponent = {
  async render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="settings-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800;">Settings & Valuation Preferences</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Configure your base currency, portfolio targets, and live market synchronization credentials.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
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
          </div>

          <!-- Market Data API Configuration -->
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom: 20px;"><i data-lucide="database" style="color: var(--gold-light);"></i> Bullion API & Data Providers</h3>
            
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
              AssetVault automatically computes valuations using real-time spot feeds. You can provide an optional MetalpriceAPI (or GoldAPI) key or trigger manual synchronization.
            </p>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">MetalpriceAPI / Bullion API Key (Optional)</label>
              <input type="password" class="form-control" id="settings-api-key" placeholder="Enter MetalpriceAPI Key (e.g. 5a2b...)" />
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button class="btn btn-secondary" onclick="SettingsComponent.syncNow()">
                <i data-lucide="refresh-cw"></i> Sync Market Rates Now
              </button>
            </div>

            <div style="border-top: 1px solid var(--border-color); margin-top: 24px; padding-top: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--gold-light); display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="shield-check" style="width: 16px; color: var(--gain-green);"></i> Zero-Knowledge End-to-End Encryption
                  </h4>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    AES-256-GCM &bull; PBKDF2-SHA256 (100k rounds) &bull; Zero Server Knowledge
                  </p>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsComponent.exportVaultBackup()">
                  <i data-lucide="download" style="width: 14px;"></i> Export Encrypted Vault (.json)
                </button>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); margin-top: 16px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 4px;">Account Session</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">
                  Signed in securely &bull; Private session active
                </p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.3);" onclick="AuthComponent.logout()">
                <i data-lucide="log-out" style="width: 14px;"></i> Lock & Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadProfile();
  },

  async loadProfile() {
    try {
      const res = await API.getProfile();
      const u = res.user;
      if (u) {
        document.getElementById('settings-name').value = u.name || '';
        document.getElementById('settings-email').value = u.email || '';
        document.getElementById('settings-currency').value = u.currency || API.getCurrency();
        document.getElementById('settings-target-val').value = u.target_portfolio_value || 1000000;
      }
    } catch (e) {
      console.error("Profile load error", e);
    }
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

  async exportVaultBackup() {
    try {
      const res = await API.getAssets();
      const assets = res.assets || [];
      const userRes = await API.getProfile().catch(() => ({ user: {} }));
      const email = userRes.user?.email || 'user';
      VaultCrypto.exportBackup(assets, email);
      App.showToast('Encrypted vault exported successfully!', 'success');
    } catch (e) {
      console.error("Export vault backup error", e);
      App.showToast('Failed to export vault backup: ' + (e.message || 'Unknown error'), 'error');
    }
  }
};
