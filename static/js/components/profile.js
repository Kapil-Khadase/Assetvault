// User Profile, Wealth Milestones & Identity Component
const ProfileComponent = {
  user: null,
  portfolioValue: 0,

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'User Profile & Wealth Milestones';

    container.innerHTML = `
      <div class="profile-view">
        <!-- Profile Header / Hero Card -->
        <div class="glass-card profile-hero-card" style="margin-bottom: 24px; padding: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div class="profile-avatar-large" id="profile-avatar-display">
              <span id="profile-initials-large">--</span>
              <div class="profile-avatar-badge" title="Active Depository Session">
                <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #FFFFFF;"></i>
              </div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <h2 id="profile-hero-name" style="font-size: 1.45rem; font-weight: 800; color: #FFFFFF; margin: 0;">Investor</h2>
                <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: var(--gold-accent); border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.72rem; padding: 2px 8px; border-radius: 20px; font-weight: 700;">
                  Vault Owner
                </span>
              </div>
              <div id="profile-hero-email" style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 6px;">Loading profile...</div>
              <div style="display: flex; align-items: center; gap: 14px; font-size: 0.78rem; color: var(--text-secondary);">
                <span><i data-lucide="calendar" style="width: 13px; vertical-align: middle; margin-right: 4px; color: var(--gold-light);"></i> Member since: <strong id="profile-hero-created" style="color: #fff;">--</strong></span>
                <span>•</span>
                <span><i data-lucide="lock" style="width: 13px; vertical-align: middle; margin-right: 4px; color: var(--gain-green);"></i> Client-Encrypted Vault</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('settings')" title="Configure Password, Sessions & Privacy">
              <i data-lucide="shield"></i> Security & Settings
            </button>
            <button class="btn btn-secondary btn-sm" onclick="AuthComponent.logout()" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.3);" title="Sign Out">
              <i data-lucide="log-out"></i> Sign Out
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <!-- Left Column: Personal Identity & Account Info -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Personal Identity Card -->
            <div class="glass-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                <h3 class="card-title" style="margin: 0;">
                  <i data-lucide="user" style="color: var(--gold-light);"></i> Personal Identity
                </h3>
                <span style="font-size: 0.76rem; color: var(--gain-green); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                  <i data-lucide="check" style="width: 12px; vertical-align: middle;"></i> Verified Account
                </span>
              </div>

              <form onsubmit="ProfileComponent.handleSaveIdentity(event)">
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" for="profile-input-name">Full Legal Name</label>
                  <input type="text" class="form-control" id="profile-input-name" required placeholder="Enter full name" />
                  <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                    Displayed across reports, certificates, and portfolio documentation.
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label" for="profile-input-email">Registered Email Address</label>
                  <input type="email" class="form-control" id="profile-input-email" disabled style="opacity: 0.65; cursor: not-allowed;" />
                  <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                    Account identity identifier (tied to your client-side cryptographic salt).
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                  <label class="form-label">Vault Depository ID</label>
                  <div style="display: flex; gap: 8px;">
                    <input type="text" class="form-control" id="profile-account-id" disabled style="font-family: monospace; font-size: 0.8rem; opacity: 0.75;" />
                    <button type="button" class="btn btn-secondary btn-sm" onclick="ProfileComponent.copyVaultId()" title="Copy Vault ID">
                      <i data-lucide="copy"></i>
                    </button>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary" id="btn-save-profile-name">
                  <i data-lucide="save"></i> Update Profile Name
                </button>
              </form>
            </div>

            <!-- Vault Depository Summary Card -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 16px;">
                <i data-lucide="database" style="color: var(--gold-light);"></i> Depository Holdings Overview
              </h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px;">
                  <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Physical Assets</div>
                  <div id="profile-stat-assets" style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF;">--</div>
                </div>
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px;">
                  <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Transactions</div>
                  <div id="profile-stat-tx" style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF;">--</div>
                </div>
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px;">
                  <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Encrypted Docs</div>
                  <div id="profile-stat-docs" style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF;">--</div>
                </div>
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px;">
                  <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Price Alerts</div>
                  <div id="profile-stat-alerts" style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF;">--</div>
                </div>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
                <span>Security Engine: <strong>AES-256-GCM</strong></span>
                <a onclick="App.navigate('assets')" style="color: var(--gold-accent); cursor: pointer; text-decoration: none; font-weight: 600;">View Assets &rarr;</a>
              </div>
            </div>
          </div>

          <!-- Right Column: Currency & Wealth Milestone -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Valuation Currency & Wealth Milestone Form -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 16px;">
                <i data-lucide="target" style="color: var(--gold-light);"></i> Valuation Currency & Wealth Goal
              </h3>
              
              <form onsubmit="ProfileComponent.handleSavePreferences(event)">
                <div class="form-group" style="margin-bottom: 16px;">
                  <label class="form-label" for="profile-currency-select">Base Valuation Currency</label>
                  <select class="form-control" id="profile-currency-select" onchange="ProfileComponent.onCurrencyChange(this.value)">
                    <option value="INR">Indian Rupee (INR - ₹)</option>
                    <option value="USD">US Dollar (USD - $)</option>
                    <option value="EUR">Euro (EUR - €)</option>
                    <option value="GBP">British Pound (GBP - £)</option>
                  </select>
                  <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                    All live bullion spot prices and holding values calculate in this currency.
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label" for="profile-milestone-target">
                    Target Portfolio Milestone (<span id="profile-currency-symbol">₹</span>)
                  </label>
                  <input type="number" step="1000" min="1" class="form-control" id="profile-milestone-target" oninput="ProfileComponent.updateProgressPreview()" required />
                </div>

                <!-- Milestone Quick Preset Chips -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                  <span style="font-size: 0.74rem; color: var(--text-muted); width: 100%; margin-bottom: 2px;">Quick milestone presets:</span>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.76rem;" onclick="ProfileComponent.setTargetPreset(500000)">5 Lakh</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.76rem;" onclick="ProfileComponent.setTargetPreset(1000000)">10 Lakh</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.76rem;" onclick="ProfileComponent.setTargetPreset(2500000)">25 Lakh</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.76rem;" onclick="ProfileComponent.setTargetPreset(5000000)">50 Lakh</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.76rem;" onclick="ProfileComponent.setTargetPreset(10000000)">1 Crore</button>
                </div>

                <!-- Live Goal Progress Card -->
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: #FFFFFF;">Milestone Progress</span>
                    <span id="profile-progress-pct" style="font-size: 0.95rem; font-weight: 800; color: var(--gold-accent);">0%</span>
                  </div>

                  <!-- Progress Bar -->
                  <div style="height: 10px; background: rgba(255, 255, 255, 0.08); border-radius: 5px; overflow: hidden; margin-bottom: 10px; position: relative;">
                    <div id="profile-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #F59E0B, #FBBF24); border-radius: 5px; transition: width 0.4s ease;"></div>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted);">
                    <span>Current: <strong id="profile-current-val" style="color: #fff;">₹0</strong></span>
                    <span id="profile-remaining-val">Remaining: ₹0</span>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary" id="btn-save-profile-prefs">
                  <i data-lucide="save"></i> Save Currency & Goal Milestone
                </button>
              </form>
            </div>

            <!-- Quick Link to Security Settings -->
            <div class="glass-card" style="background: rgba(245, 158, 11, 0.04); border-color: rgba(245, 158, 11, 0.2);">
              <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--gold-light); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="shield-check" style="width: 16px;"></i> Looking for Security Hardening & Vault Backups?
              </h4>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.45;">
                Password updates, multi-device session revocation, encrypted <code>.vault</code> backup bundles, and QR verification privacy controls are located in <strong>Settings & Security</strong>.
              </p>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('settings')">
                <i data-lucide="arrow-right"></i> Open Security & Vault Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadProfileData();
  },

  async loadProfileData() {
    try {
      const res = await API.getProfile();
      this.user = res.user;
      if (!this.user) return;

      const nameInput = document.getElementById('profile-input-name');
      const emailInput = document.getElementById('profile-input-email');
      const currSelect = document.getElementById('profile-currency-select');
      const milestoneInput = document.getElementById('profile-milestone-target');
      const accountIdInput = document.getElementById('profile-account-id');

      const heroName = document.getElementById('profile-hero-name');
      const heroEmail = document.getElementById('profile-hero-email');
      const heroCreated = document.getElementById('profile-hero-created');
      const initialsLarge = document.getElementById('profile-initials-large');

      if (nameInput) nameInput.value = this.user.name || '';
      if (emailInput) emailInput.value = this.user.email || '';
      if (heroName) heroName.innerText = this.user.name || 'Investor';
      if (heroEmail) heroEmail.innerText = this.user.email || '';
      if (accountIdInput) accountIdInput.value = `AV-VAULT-${this.user.id ? String(this.user.id).padStart(6, '0') : '000001'}`;

      if (heroCreated && this.user.created_at) {
        const d = new Date(this.user.created_at);
        heroCreated.innerText = isNaN(d) ? 'Recent' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      const initials = (this.user.name || 'AV').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      if (initialsLarge) initialsLarge.innerText = initials || 'AV';

      const activeCurr = this.user.currency || API.getCurrency() || 'INR';
      if (currSelect) currSelect.value = activeCurr;
      this.updateCurrencySymbol(activeCurr);

      const targetVal = this.user.target_portfolio_value || 1000000;
      if (milestoneInput) milestoneInput.value = targetVal;

      // Load holdings statistics
      await this.loadHoldingsStats();

      // Recalculate progress
      this.updateProgressPreview();

    } catch (e) {
      console.error('Profile load error:', e);
      App.showToast('Could not load user profile', 'error');
    }
  },

  async loadHoldingsStats() {
    try {
      const [assetsRes, txRes, docsRes, alertsRes, summaryRes] = await Promise.all([
        API.getAssets().catch(() => ({ assets: [] })),
        API.getTransactions().catch(() => ({ transactions: [] })),
        API.getDocuments().catch(() => ({ documents: [] })),
        API.getAlerts().catch(() => ({ alerts: [] })),
        API.getPortfolioSummary().catch(() => null)
      ]);

      const assetCount = (assetsRes.assets || []).length;
      const txCount = (txRes.transactions || []).length;
      const docCount = (docsRes.documents || []).length;
      const alertCount = (alertsRes.alerts || []).length;

      const statAssets = document.getElementById('profile-stat-assets');
      const statTx = document.getElementById('profile-stat-tx');
      const statDocs = document.getElementById('profile-stat-docs');
      const statAlerts = document.getElementById('profile-stat-alerts');

      if (statAssets) statAssets.innerText = assetCount;
      if (statTx) statTx.innerText = txCount;
      if (statDocs) statDocs.innerText = docCount;
      if (statAlerts) statAlerts.innerText = alertCount;

      if (summaryRes && summaryRes.summary) {
        this.portfolioValue = Number(summaryRes.summary.total_current_value || 0);
      } else {
        // Compute from assets if summary unavailable
        const sum = (assetsRes.assets || []).reduce((acc, a) => acc + (Number(a.current_valuation) || Number(a.purchase_price) || 0), 0);
        this.portfolioValue = sum;
      }
    } catch (e) {
      console.warn('Holdings stats load error:', e);
    }
  },

  updateCurrencySymbol(curr) {
    const symEl = document.getElementById('profile-currency-symbol');
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    if (symEl) symEl.innerText = symbols[curr] || '₹';
  },

  onCurrencyChange(newCurr) {
    API.setCurrency(newCurr);
    this.updateCurrencySymbol(newCurr);
    App.updateSidebarLiveRates();
    this.updateProgressPreview();
  },

  setTargetPreset(val) {
    const input = document.getElementById('profile-milestone-target');
    if (input) {
      input.value = val;
      this.updateProgressPreview();
    }
  },

  updateProgressPreview() {
    const milestoneInput = document.getElementById('profile-milestone-target');
    const target = Number(milestoneInput?.value) || 1;
    const current = this.portfolioValue || 0;
    const curr = API.getCurrency() || 'INR';

    const pct = Math.min(100, Math.max(0, Number(((current / target) * 100).toFixed(1))));
    const remaining = Math.max(0, target - current);

    const barEl = document.getElementById('profile-progress-bar');
    const pctEl = document.getElementById('profile-progress-pct');
    const currEl = document.getElementById('profile-current-val');
    const remEl = document.getElementById('profile-remaining-val');

    if (barEl) barEl.style.width = `${pct}%`;
    if (pctEl) {
      pctEl.innerText = `${pct}%`;
      pctEl.style.color = pct >= 100 ? 'var(--gain-green)' : 'var(--gold-accent)';
    }
    if (currEl) currEl.innerText = API.formatCurrency(current, curr);
    if (remEl) {
      if (remaining === 0 && current > 0) {
        remEl.innerHTML = '<span style="color: var(--gain-green); font-weight: 700;">Goal Achieved! 🎉</span>';
      } else {
        remEl.innerText = `Remaining: ${API.formatCurrency(remaining, curr)}`;
      }
    }
  },

  async handleSaveIdentity(e) {
    e.preventDefault();
    const name = document.getElementById('profile-input-name')?.value.trim();
    if (!name) return;

    try {
      const curr = API.getCurrency() || 'INR';
      const targetVal = Number(document.getElementById('profile-milestone-target')?.value) || 1000000;
      await API.updateProfile({ name, currency: curr, target_portfolio_value: targetVal });
      
      const heroName = document.getElementById('profile-hero-name');
      if (heroName) heroName.innerText = name;

      await App.loadUserInfo();
      App.showToast('Profile identity updated successfully!', 'success');
    } catch (err) {
      App.showToast(err.message || 'Failed to update name', 'error');
    }
  },

  async handleSavePreferences(e) {
    e.preventDefault();
    const name = document.getElementById('profile-input-name')?.value.trim() || this.user?.name || 'Investor';
    const curr = document.getElementById('profile-currency-select')?.value || 'INR';
    const targetVal = Number(document.getElementById('profile-milestone-target')?.value) || 1000000;

    try {
      await API.updateProfile({ name, currency: curr, target_portfolio_value: targetVal });
      API.setCurrency(curr);
      await App.loadUserInfo();
      App.updateSidebarLiveRates();
      App.showToast('Currency & milestone goals saved successfully!', 'success');
    } catch (err) {
      App.showToast(err.message || 'Failed to save preferences', 'error');
    }
  },

  copyVaultId() {
    const val = document.getElementById('profile-account-id')?.value;
    if (val && navigator.clipboard) {
      navigator.clipboard.writeText(val).then(() => {
        App.showToast('Vault Depository ID copied to clipboard!', 'success');
      }).catch(() => {
        App.showToast('Copied: ' + val, 'success');
      });
    }
  }
};
