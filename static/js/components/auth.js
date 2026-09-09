// User Authentication & Registration Component
const AuthComponent = {
  currentTab: 'login', // 'login' | 'register'

  render(tab = 'login') {
    this.currentTab = tab;
    const container = document.getElementById('view-container');
    if (!container) return;

    container.innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card glass-card">
          <div class="auth-header">
            <div class="auth-logo-badge">
              <img src="img/logo.png" alt="AssetVault" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <h2 class="auth-title">AssetVault Security Portal</h2>
            <p class="auth-subtitle">Market-Aware Physical Asset & Wealth Valuation Management</p>
          </div>

          <!-- Auth Navigation Tabs -->
          <div class="auth-tabs">
            <button class="auth-tab ${this.currentTab === 'login' ? 'active' : ''}" onclick="AuthComponent.switchTab('login')">
              <i data-lucide="log-in" style="width: 16px;"></i> Sign In
            </button>
            <button class="auth-tab ${this.currentTab === 'register' ? 'active' : ''}" onclick="AuthComponent.switchTab('register')">
              <i data-lucide="user-plus" style="width: 16px;"></i> Create Account
            </button>
          </div>

          <div id="auth-alert" class="auth-alert" style="display: none;"></div>

          <!-- LOGIN FORM -->
          <form id="auth-login-form" class="${this.currentTab === 'login' ? '' : 'hidden'}" onsubmit="AuthComponent.handleLogin(event)">
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label"><i data-lucide="mail" style="width: 14px;"></i> Email Address</label>
              <input type="email" class="form-control" id="login-email" placeholder="name@domain.com" required value="kapil@example.com" />
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label class="form-label"><i data-lucide="lock" style="width: 14px;"></i> Password</label>
                <span class="auth-link-hint" onclick="AuthComponent.fillDemo()">Auto-fill Demo (demo123)</span>
              </div>
              <div class="password-input-group">
                <input type="password" class="form-control" id="login-password" placeholder="••••••••" required value="demo123" />
                <button type="button" class="btn-toggle-pwd" onclick="AuthComponent.togglePwdVisibility('login-password', this)">
                  <i data-lucide="eye" style="width: 16px;"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" id="login-submit-btn" style="width: 100%; justify-content: center; padding: 12px; font-size: 0.95rem;">
              <i data-lucide="arrow-right"></i> Sign In to Vault
            </button>

            <!-- Quick Demo Login Button -->
            <div style="margin-top: 16px; text-align: center;">
              <button type="button" class="btn btn-secondary btn-sm" style="width: 100%; border: 1px dashed var(--border-highlight);" onclick="AuthComponent.quickDemoLogin()">
                <i data-lucide="zap" style="color: var(--gold-light); width: 15px;"></i> 1-Click Demo Login
              </button>
            </div>
          </form>

          <!-- REGISTER FORM -->
          <form id="auth-register-form" class="${this.currentTab === 'register' ? '' : 'hidden'}" onsubmit="AuthComponent.handleRegister(event)">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label"><i data-lucide="user" style="width: 14px;"></i> Full Legal Name</label>
              <input type="text" class="form-control" id="register-name" placeholder="e.g. Kapil Khadase" required />
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label"><i data-lucide="mail" style="width: 14px;"></i> Email Address</label>
              <input type="email" class="form-control" id="register-email" placeholder="name@domain.com" required />
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label"><i data-lucide="lock" style="width: 14px;"></i> Password (min 6 characters)</label>
              <div class="password-input-group">
                <input type="password" class="form-control" id="register-password" placeholder="Create a secure password" minlength="6" required />
                <button type="button" class="btn-toggle-pwd" onclick="AuthComponent.togglePwdVisibility('register-password', this)">
                  <i data-lucide="eye" style="width: 16px;"></i>
                </button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label"><i data-lucide="indian-rupee" style="width: 14px;"></i> Base Currency</label>
              <select class="form-control" id="register-currency">
                <option value="INR" selected>Indian Rupee (INR - ₹)</option>
                <option value="USD">US Dollar (USD - $)</option>
                <option value="EUR">Euro (EUR - €)</option>
                <option value="GBP">British Pound (GBP - £)</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" id="register-submit-btn" style="width: 100%; justify-content: center; padding: 12px; font-size: 0.95rem;">
              <i data-lucide="user-check"></i> Complete Registration
            </button>
          </form>

          <div class="auth-footer">
            <div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; margin-top: 20px;">
              <i data-lucide="shield-check" style="width: 14px; color: var(--emerald-gain); vertical-align: middle;"></i>
              256-Bit TLS Encryption &bull; PBKDF2 Password Hashing &bull; Private Portfolio Isolation
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    const activeTabBtn = Array.from(document.querySelectorAll('.auth-tab')).find(b => 
      tab === 'login' ? b.innerText.includes('Sign In') : b.innerText.includes('Create Account')
    );
    if (activeTabBtn) activeTabBtn.classList.add('active');

    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) alertBox.style.display = 'none';

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }
  },

  fillDemo() {
    document.getElementById('login-email').value = 'kapil@example.com';
    document.getElementById('login-password').value = 'demo123';
  },

  async quickDemoLogin() {
    this.fillDemo();
    const btn = document.getElementById('login-submit-btn');
    if (btn) btn.click();
  },

  togglePwdVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<i data-lucide="eye-off" style="width: 16px;"></i>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<i data-lucide="eye" style="width: 16px;"></i>`;
    }
    if (window.lucide) lucide.createIcons();
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth-alert');
    if (!alertBox) return;
    alertBox.className = `auth-alert ${type}`;
    alertBox.style.display = 'flex';
    alertBox.innerHTML = `
      <i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width: 18px; color: ${type === 'error' ? 'var(--crimson-loss)' : 'var(--emerald-gain)'};"></i>
      <span>${message}</span>
    `;
    if (window.lucide) lucide.createIcons();
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Signing in...</span>`;
    }

    try {
      const res = await API.login(email, password);
      if (res.user && res.user.token) {
        API.setToken(res.user.token);
        if (res.user.currency) API.setCurrency(res.user.currency);
        App.showToast(`Welcome back, ${res.user.name}!`, 'success');
        App.updateUserDisplay();
        App.updateTopbarTicker();
        App.navigate('dashboard');
      } else {
        this.showAlert(res.error || 'Invalid credentials');
      }
    } catch (err) {
      this.showAlert(err.message || 'Login failed. Please check credentials.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="arrow-right"></i> Sign In to Vault`;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const currency = document.getElementById('register-currency').value;
    const btn = document.getElementById('register-submit-btn');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>Creating account...</span>`;
    }

    try {
      const res = await API.register(name, email, password, currency);
      if (res.user && res.user.token) {
        API.setToken(res.user.token);
        API.setCurrency(currency);
        App.showToast(`Account created! Welcome, ${res.user.name}!`, 'success');
        App.updateUserDisplay();
        App.updateTopbarTicker();
        App.navigate('dashboard');
      } else {
        this.showAlert(res.error || 'Registration failed');
      }
    } catch (err) {
      this.showAlert(err.message || 'Registration failed.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="user-check"></i> Complete Registration`;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  logout() {
    API.setToken('');
    App.showToast('Logged out successfully.', 'success');
    document.getElementById('user-display-name').innerText = 'Not Signed In';
    document.getElementById('user-display-email').innerText = 'Please sign in';
    document.getElementById('user-avatar-initials').innerText = '--';
    App.navigate('auth');
  }
};
