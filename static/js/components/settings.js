// User Settings, Security Hardening & Disaster Recovery Component
const SettingsComponent = {
  activeTab: 'security',

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Security, Privacy & Vault Settings';

    container.innerHTML = `
      <div class="settings-view">
        <!-- Header & Profile Cross-Link Banner -->
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
          <div>
            <h2 style="font-size: 1.55rem; font-weight: 800; display: flex; align-items: center; gap: 10px; margin: 0 0 6px 0;">
              <i data-lucide="shield-check" style="color: var(--gold-light);"></i>
              Security Hardening & Vault Settings
            </h2>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">
              Configure master credentials, cryptographic sessions, QR verification privacy, encrypted backups, and system diagnostics.
            </p>
          </div>

          <button class="btn btn-secondary btn-sm" onclick="App.navigate('profile')" title="Go to User Profile & Wealth Goals">
            <i data-lucide="user"></i> Manage User Profile & Milestone
          </button>
        </div>

        <!-- Categorized Settings Tabs -->
        <div class="settings-tab-bar" style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; padding-bottom: 2px; overflow-x: auto;">
          <button class="settings-tab-btn active" data-tab="security" onclick="SettingsComponent.switchTab('security')">
            <i data-lucide="key-round" style="width: 15px;"></i> Security & Sessions
          </button>
          <button class="settings-tab-btn" data-tab="privacy" onclick="SettingsComponent.switchTab('privacy')">
            <i data-lucide="shield" style="width: 15px;"></i> Privacy & Certificates
          </button>
          <button class="settings-tab-btn" data-tab="backups" onclick="SettingsComponent.switchTab('backups')">
            <i data-lucide="archive" style="width: 15px;"></i> Vault Backups & DR
          </button>
          <button class="settings-tab-btn" data-tab="system" onclick="SettingsComponent.switchTab('system')">
            <i data-lucide="cpu" style="width: 15px;"></i> System & Diagnostics
          </button>
        </div>

        <!-- TAB 1: Security & Sessions -->
        <div class="settings-tab-content" id="tab-security" data-tab="security" style="display: block;">
          <!-- Encryption Notice Banner (Requirement 13) -->
          <div class="glass-card" style="margin-bottom: 24px; border-left: 4px solid var(--gold-primary); background: rgba(212, 175, 55, 0.08); padding: 16px 20px; display: flex; align-items: flex-start; gap: 14px;">
            <i data-lucide="alert-triangle" style="color: var(--gold-light); min-width: 22px; margin-top: 2px;"></i>
            <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">
              <strong style="color: var(--text-primary); font-size: 0.9rem;">Client-Side Encrypted Cryptographic Notice:</strong><br />
              AssetVault uses client-side encrypted vault storage. If you lose your master password, encrypted documents and client-side encrypted vault entries cannot be recovered by AssetVault or server administrators. No master key or backdoor exists.
            </div>
          </div>

          <div class="settings-grid" style="display: grid; gap: 24px;">
            <!-- Change Password Card (Requirement 6, 12) -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 16px;"><i data-lucide="key" style="color: var(--gold-light);"></i> Change Master Password</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">
                Updating your password re-keys your active cryptographic session and invalidates all other devices.
              </p>

              <form onsubmit="SettingsComponent.handleChangePassword(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label" for="pwd-current">Current Password *</label>
                  <input type="password" class="form-control" id="pwd-current" required placeholder="Enter current password" />
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label" for="pwd-new">New Password (min 8 chars, 1 digit, 1 special) *</label>
                  <input type="password" class="form-control" id="pwd-new" required minlength="8" placeholder="Enter strong new password" />
                </div>

                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label" for="pwd-confirm">Confirm New Password *</label>
                  <input type="password" class="form-control" id="pwd-confirm" required minlength="8" placeholder="Re-enter new password" />
                </div>

                <button type="submit" class="btn btn-secondary" id="btn-change-pwd">
                  <i data-lucide="check"></i> Update Master Password
                </button>
              </form>
            </div>

            <!-- Session Security Card -->
            <div class="glass-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <h3 class="card-title" style="margin-bottom: 4px;">
                    <i data-lucide="shield" style="color: var(--gold-light);"></i> Active Browser & Device Sessions
                  </h3>
                  <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0; line-height: 1.45;">
                    Live cryptographic sessions logged into your vault across browsers and devices. Revoking a session immediately terminates its access.
                  </p>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsComponent.loadSessions()" title="Refresh Session List" style="padding: 6px 12px;">
                  <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Refresh
                </button>
              </div>

              <!-- Sessions List Container -->
              <div id="active-sessions-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px;">
                <div style="font-size: 0.82rem; color: var(--text-muted); padding: 12px; text-align: center;">
                  <i data-lucide="loader" class="spin" style="width: 16px; height: 16px; vertical-align: -2px;"></i> Loading active sessions...
                </div>
              </div>

              <!-- Session Global Actions -->
              <div style="display: flex; gap: 10px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn btn-secondary btn-sm" onclick="SettingsComponent.handleLogoutOtherSessions()">
                  <i data-lucide="shield-alert"></i> Revoke All Other Sessions
                </button>
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.3);" onclick="AuthComponent.logout()">
                  <i data-lucide="log-out"></i> Sign Out of This Device
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: Privacy & Certificates -->
        <div class="settings-tab-content" id="tab-privacy" data-tab="privacy" style="display: none;">
          <div style="max-width: 720px;">
            <!-- Public QR Certificate Privacy Settings (Requirement 4) -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 14px;">
                <i data-lucide="qr-code" style="color: var(--gold-light);"></i> Public Certificate Verification Privacy
              </h3>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 18px; line-height: 1.45;">
                Control whether third parties scanning your asset QR certificates can verify authenticity. When disabled, public verification is blocked (403 Forbidden).
              </p>

              <form onsubmit="SettingsComponent.handleSaveQrPrivacy(event)">
                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
                  <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                    <span>Enable Public Certificate Verification</span>
                    <input type="checkbox" id="settings-qr-enabled" style="width: 20px; height: 20px; accent-color: var(--gold-button); cursor: pointer;" />
                  </label>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 8px 0 0 0;">
                    Default is privacy-conscious (Disabled). When enabled, external parties holding your asset's unique certificate token can verify bullion authenticity on the public portal.
                  </p>
                </div>

                <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
                  <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                    <span>Display Public Owner Legal Name</span>
                    <input type="checkbox" id="settings-qr-public-name" style="width: 20px; height: 20px; accent-color: var(--gold-button); cursor: pointer;" />
                  </label>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 8px 0 0 0;">
                    When unchecked, your identity is masked (e.g. <code>K*** D***</code>) to preserve confidentiality. When checked, your full registered name is displayed on verified certificates.
                  </p>
                </div>

                <button type="submit" class="btn btn-primary" id="btn-save-qr-privacy">
                  <i data-lucide="shield"></i> Save Privacy Controls
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- TAB 3: Vault Backups & Disaster Recovery -->
        <div class="settings-tab-content" id="tab-backups" data-tab="backups" style="display: none;">
          <div style="max-width: 760px;">
            <!-- Complete Encrypted Vault Backup & Restore (Requirement 4) -->
            <div class="glass-card" style="margin-bottom: 24px;">
              <h3 class="card-title" style="margin-bottom: 14px;">
                <i data-lucide="archive" style="color: var(--gain-green);"></i> Complete Encrypted Vault Backup & DR
              </h3>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 18px; line-height: 1.5;">
                Generates a fully self-contained, password-encrypted <code style="color: var(--gold-button);">.vault</code> file bundling your physical holdings, transactions, price alerts, wealth goals, and client-side encrypted document files with unique IVs.
              </p>

              <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px;">
                <button type="button" class="btn btn-gold" onclick="SettingsComponent.openExportModal()">
                  <i data-lucide="download"></i> Export Complete .vault Bundle
                </button>
                <button type="button" class="btn btn-secondary" onclick="SettingsComponent.openRestoreModal()">
                  <i data-lucide="upload"></i> Restore from .vault Bundle
                </button>
              </div>

              <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 0.78rem; color: var(--text-muted);">
                <i data-lucide="lock" style="width: 14px; color: var(--gold-light); vertical-align: middle; margin-right: 6px;"></i>
                Specifications: <strong>PBKDF2 (100,000 iterations)</strong> + <strong>AES-256-GCM authenticated cipher</strong> with SHA-256 payload integrity envelope.
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: System & Diagnostics -->
        <div class="settings-tab-content" id="tab-system" data-tab="system" style="display: none;">
          <div class="settings-grid" style="display: grid; gap: 24px;">
            <!-- Bullion Market Feeds -->
            <div class="glass-card">
              <h3 class="card-title" style="margin-bottom: 14px;">
                <i data-lucide="database" style="color: var(--gold-light);"></i> Bullion Market Feeds
              </h3>
              <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px;">
                Synchronize official benchmark spot rates for Gold, Silver, and Platinum with custom landed duty and GST computations.
              </p>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="settings-api-key">MetalpriceAPI Key (Optional)</label>
                <input type="password" class="form-control" id="settings-api-key" placeholder="Enter API Key (e.g. 5a2b...)" />
              </div>

              <button class="btn btn-secondary" onclick="SettingsComponent.syncNow()">
                <i data-lucide="refresh-cw"></i> Sync Market Rates Now
              </button>
            </div>

            <!-- System Health Diagnostics Card -->
            <div class="glass-card">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--gold-light); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="activity" style="width: 16px; color: var(--gold-button);"></i> System Health & Diagnostics
              </h4>
              <div id="health-card-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; font-size: 0.82rem;">
                <div style="color: var(--text-muted);"><i data-lucide="loader" class="spin"></i> Probing server health...</div>
              </div>
            </div>

            <!-- Danger Zone: Account Deletion (Requirement 12) -->
            <div class="glass-card" style="grid-column: 1 / -1; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.03);">
              <h3 class="card-title" style="color: var(--loss-red); margin-bottom: 8px;">
                <i data-lucide="alert-octagon" style="color: var(--loss-red);"></i> Danger Zone: Permanent Account Deletion
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
    await this.loadSessions();
  },

  switchTab(tabKey) {
    this.activeTab = tabKey;
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabKey;
      btn.classList.toggle('active', match);
    });
    document.querySelectorAll('.settings-tab-content').forEach(pane => {
      pane.style.display = pane.getAttribute('data-tab') === tabKey ? 'block' : 'none';
    });
    if (tabKey === 'security') {
      this.loadSessions();
    }
    if (window.lucide) lucide.createIcons();
  },

  async loadProfile() {
    try {
      const res = await API.getProfile();
      const u = res.user;
      if (u) {
        const qrEnabledEl = document.getElementById('settings-qr-enabled');
        const qrPublicNameEl = document.getElementById('settings-qr-public-name');
        if (qrEnabledEl) qrEnabledEl.checked = Boolean(u.public_certificate_verification);
        if (qrPublicNameEl) qrPublicNameEl.checked = Boolean(u.public_owner_name);
      }
    } catch (e) {
      console.error("Profile load error in settings", e);
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
              ${health.database === 'connected' ? 'SQLite (Migrations 1-6 Active)' : 'Disconnected'}
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

  async handleSaveQrPrivacy(e) {
    e.preventDefault();
    const qrEnabled = document.getElementById('settings-qr-enabled')?.checked ? 1 : 0;
    const publicName = document.getElementById('settings-qr-public-name')?.checked ? 1 : 0;
    const btn = document.getElementById('btn-save-qr-privacy');
    if (btn) btn.disabled = true;

    try {
      const res = await API.updateQrPrivacy({
        public_certificate_verification: qrEnabled,
        public_owner_name: publicName
      });
      App.showToast(res.message || 'QR privacy settings updated successfully!', 'success');
    } catch (err) {
      App.showToast('Failed to update QR privacy: ' + (err.message || err), 'error');
    } finally {
      if (btn) btn.disabled = false;
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

  async loadSessions() {
    const container = document.getElementById('active-sessions-container');
    if (!container) return;

    try {
      const data = await API.getSessions();
      const sessions = data.sessions || [];

      if (sessions.length === 0) {
        container.innerHTML = `
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.84rem;">
            <i data-lucide="shield-check" style="width: 20px; height: 20px; margin-bottom: 4px; color: var(--gold-light);"></i><br />
            No active session records found.
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      container.innerHTML = sessions.map(sess => {
        const isCurrent = Boolean(sess.is_current);
        const deviceIcon = sess.device_type === 'Mobile' ? 'smartphone' : (sess.device_type === 'Tablet' ? 'tablet' : 'monitor');
        
        let createdDate = 'Unknown';
        if (sess.created_at) {
          try {
            const raw = String(sess.created_at);
            const dt = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
            createdDate = isNaN(dt.getTime()) ? raw : dt.toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
          } catch (e) {
            createdDate = String(sess.created_at);
          }
        }

        let lastActiveStr = 'Active now';
        if (sess.last_active) {
          try {
            const rawActive = String(sess.last_active);
            const lastDt = new Date(rawActive.includes('T') ? rawActive : rawActive.replace(' ', 'T') + 'Z');
            if (!isNaN(lastDt.getTime())) {
              const diffMs = Date.now() - lastDt.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 1) lastActiveStr = 'Just now';
              else if (diffMins < 60) lastActiveStr = `${diffMins}m ago`;
              else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) lastActiveStr = `${diffHours}h ago`;
                else lastActiveStr = `${Math.floor(diffHours / 24)}d ago`;
              }
            } else {
              lastActiveStr = rawActive;
            }
          } catch (e) {
            lastActiveStr = String(sess.last_active);
          }
        }

        return `
          <div class="session-item-card" style="background: var(--bg-primary); border: 1px solid ${isCurrent ? 'var(--gold-border, rgba(212, 175, 55, 0.45))' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 14px 16px; transition: border-color 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 38px; height: 38px; border-radius: 8px; background: ${isCurrent ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-card)'}; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: ${isCurrent ? 'var(--gold-light)' : 'var(--text-secondary)'};">
                  <i data-lucide="${deviceIcon}" style="width: 19px; height: 19px;"></i>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px;">
                    <span style="font-size: 0.90rem; font-weight: 700; color: var(--text-primary);">
                      ${this.escapeHtml(sess.browser)} on ${this.escapeHtml(sess.os)}
                    </span>
                    ${isCurrent ? `
                      <span style="font-size: 0.70rem; color: var(--gain-green); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 7px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 5px; height: 5px; border-radius: 50%; background: var(--gain-green); display: inline-block;"></span> CURRENT BROWSER
                      </span>
                    ` : `
                      <span style="font-size: 0.70rem; color: #60a5fa; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.25); padding: 2px 7px; border-radius: 4px; font-weight: 600;">
                        ACTIVE SESSION
                      </span>
                    `}
                  </div>
                  <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 0.76rem; color: var(--text-muted);">
                    <span title="Client IP Address"><i data-lucide="globe" style="width: 12px; height: 12px; vertical-align: -1px; margin-right: 3px;"></i>${this.escapeHtml(sess.ip_address)}</span>
                    <span title="Login Time"><i data-lucide="calendar" style="width: 12px; height: 12px; vertical-align: -1px; margin-right: 3px;"></i>Login: ${createdDate}</span>
                    <span title="Last Seen"><i data-lucide="clock" style="width: 12px; height: 12px; vertical-align: -1px; margin-right: 3px;"></i>Last active: ${lastActiveStr}</span>
                  </div>
                </div>
              </div>

              <div>
                ${!isCurrent ? `
                  <button type="button" class="btn btn-secondary btn-sm" style="color: var(--loss-red); border-color: rgba(239, 68, 68, 0.35); font-size: 0.75rem; padding: 5px 12px; display: inline-flex; align-items: center; gap: 5px;" onclick="SettingsComponent.handleRevokeSession('${sess.session_id}')" title="Revoke and force sign out this session">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Revoke
                  </button>
                ` : `
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px;">
                    This Browser (In Use)
                  </span>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 12px; color: var(--loss-red); font-size: 0.8rem;">
          <i data-lucide="alert-triangle" style="width: 14px; height: 14px; vertical-align: -2px;"></i> Failed to load active sessions: ${this.escapeHtml(err.message || 'Unknown error')}
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
  },

  async handleRevokeSession(sessionId) {
    if (!confirm('Are you sure you want to revoke this session? That browser/device will be logged out immediately.')) return;
    try {
      await API.revokeSession(sessionId);
      App.showToast('Session revoked successfully.', 'success');
      await this.loadSessions();
    } catch (err) {
      App.showToast(err.message || 'Failed to revoke session.', 'error');
    }
  },

  async handleLogoutOtherSessions() {
    if (!confirm('This will terminate all other active browser and device sessions. Your current browser session will stay active. Continue?')) return;
    try {
      const res = await API.revokeOtherSessions();
      App.showToast(res.message || 'All other active sessions revoked successfully.', 'success');
      await this.loadSessions();
    } catch (err) {
      App.showToast(err.message || 'Failed to revoke other sessions.', 'error');
    }
  },

  async handleLogoutAll() {
    if (!confirm('This will invalidate all active sessions across all your browsers and devices. Continue?')) return;
    try {
      await API.logoutAllSessions();
      App.showToast('All sessions invalidated successfully.', 'success');
      await this.loadSessions();
    } catch (err) {
      App.showToast(err.message || 'Failed to invalidate sessions', 'error');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
            <label class="form-label" for="del-acc-pwd">Enter Account Password *</label>
            <input type="password" class="form-control" id="del-acc-pwd" required placeholder="Verify your password" />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" for="del-acc-phrase">Type <strong>DELETE MY VAULT</strong> to confirm *</label>
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
    const key = document.getElementById('settings-api-key')?.value || '';
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
            <label class="form-label" for="backup-pwd">Backup Passphrase (min 6 chars) *</label>
            <input type="password" class="form-control" id="backup-pwd" required minlength="6" placeholder="Enter secure backup passphrase" />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" for="backup-pwd-confirm">Confirm Passphrase *</label>
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
            <label class="form-label" for="restore-vault-file">Vault File (.vault) *</label>
            <input type="file" class="form-control" id="restore-vault-file" accept=".vault,.json" required />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" for="restore-pwd">Backup Passphrase *</label>
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
