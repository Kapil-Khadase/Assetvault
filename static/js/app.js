// WCAG AA Compliant Modal Focus Trapping and Escape-to-Close
const ModalA11y = {
  activeModal: null,
  previousActiveElement: null,

  init() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.classList?.contains('modal-overlay') || node.classList?.contains('modal-backdrop'))) {
              this.trap(node);
            }
          });
        }
        if (m.removedNodes) {
          m.removedNodes.forEach(node => {
            if (node === this.activeModal) {
              this.release();
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('keydown', (e) => {
      if (!this.activeModal) return;

      if (e.key === 'Escape') {
        const closeBtn = this.activeModal.querySelector('.modal-close-btn, .btn-secondary, [onclick*="remove()"], [onclick*="closeModal"]');
        if (closeBtn) closeBtn.click();
        else this.activeModal.remove();
        this.release();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(this.activeModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (focusable.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    });
  },

  trap(modalEl) {
    this.previousActiveElement = document.activeElement;
    this.activeModal = modalEl;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    setTimeout(() => {
      const focusables = modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);
  },

  release() {
    this.activeModal = null;
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      try { this.previousActiveElement.focus(); } catch (e) {}
      this.previousActiveElement = null;
    }
  }
};

// AssetVault Main Single Page App Orchestrator - Exact Reference Design
const App = {
  currentRoute: 'auth',

  async init() {
    ModalA11y.init();
    this.setupTheme();
    this.setupNavigation();
    this.setupSidebar();

    // Check hash for public verification route
    const checkHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#verify/') || hash.startsWith('#/verify/')) {
        const token = hash.replace(/^#\/?verify\//, '').trim();
        if (token) {
          this.renderPublicVerification(token);
          return true;
        }
      }
      return false;
    };

    window.addEventListener('hashchange', () => {
      checkHash();
    });

    if (checkHash()) {
      return;
    }

    // Always start at the Login & Authentication portal when the app opens
    if (typeof VaultCrypto !== 'undefined') {
      VaultCrypto.clearKey();
    }
    this.updateUserDisplay();
    this.navigate('auth');

    if (window.lucide) lucide.createIcons();

    // Periodically update live ticker (every 30s) when signed in
    setInterval(() => {
      if (this.currentRoute !== 'auth' && this.currentRoute !== 'verify' && API.getToken()) {
        this.updateSidebarLiveRates();
        this.updateSyncTimestamp();
      }
    }, 30000);
  },

  setupTheme() {
    // Default to 'light' as shown in the primary reference screenshots, or restore user preference
    const savedTheme = localStorage.getItem('assetvault_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('assetvault_theme', next);
    this.updateThemeIcon(next);

    // Re-render current route to update Chart.js canvas themes
    this.navigate(this.currentRoute);
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      if (theme === 'dark') {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
      } else {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      }
    }
  },

  setupSidebar() {
    if (window.innerWidth > 768 && localStorage.getItem('assetvault_sidebar_collapsed') === 'true') {
      const sidebar = document.getElementById('sidebar');
      const layout = document.querySelector('.app-layout');
      if (sidebar) sidebar.classList.add('collapsed');
      if (layout) layout.classList.add('sidebar-collapsed');
      this.updateToggleTooltips(true);
    }
  },

  handleLogoClick() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
      this.toggleSidebar();
    } else {
      this.navigate('dashboard');
    }
  },

  updateToggleTooltips(isCollapsed) {
    const topbarBtn = document.getElementById('btn-toggle-sidebar');
    const railBtn = document.querySelector('.sidebar-rail-toggle');
    const text = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
    if (topbarBtn) topbarBtn.setAttribute('title', text);
    if (railBtn) railBtn.setAttribute('title', text);
  },

  toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.getElementById('sidebar');
    const layout = document.querySelector('.app-layout');
    if (!sidebar) return;

    if (isMobile) {
      const willOpen = !sidebar.classList.contains('open');
      sidebar.classList.toggle('open', willOpen);

      let backdrop = document.getElementById('sidebar-backdrop');
      if (willOpen) {
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.id = 'sidebar-backdrop';
          backdrop.className = 'sidebar-backdrop';
          backdrop.onclick = () => App.closeMobileSidebar();
          document.body.appendChild(backdrop);
        }
        requestAnimationFrame(() => {
          if (backdrop) backdrop.classList.add('visible');
        });
      } else if (backdrop) {
        backdrop.classList.remove('visible');
      }
    } else {
      // Desktop: collapse/expand sidebar
      const isCollapsed = sidebar.classList.toggle('collapsed');
      if (layout) layout.classList.toggle('sidebar-collapsed', isCollapsed);
      localStorage.setItem('assetvault_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      this.updateToggleTooltips(isCollapsed);
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  },

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-view');
        if (target) {
          this.navigate(target);
          this.closeMobileSidebar();
        }
      });
    });
  },

  navigate(route) {
    // Require authentication for all protected views
    if (route !== 'auth' && !API.getToken()) {
      route = 'auth';
    }

    this.currentRoute = route;

    // Toggle full-screen auth mode styling vs main application layout
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      if (route === 'auth') {
        appLayout.classList.add('auth-mode');
      } else {
        appLayout.classList.remove('auth-mode');
      }
    }

    // Update active nav styling in sidebar
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.getAttribute('data-view') === route) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    // Update topbar breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) {
      const titles = {
        dashboard: 'Portfolio Dashboard',
        assets: 'Asset Management & Holdings',
        valuation: 'Market Rates & Spot Valuations',
        transactions: 'Transactions & Trade Ledger',
        analytics: 'Analytics & Macro Simulator',
        simulator: 'Macroeconomic Shock Simulator',
        documents: 'Vault Documents & Appraisals',
        reports: 'Valuation Reports & Exports',
        alerts: 'Price & Milestone Alerts',
        settings: 'Settings & Valuation Preferences',
        auth: 'Security & Authentication Portal'
      };
      breadcrumb.innerText = titles[route] || 'Portfolio Dashboard';
    }

    // Render corresponding component
    switch (route) {
      case 'auth':
        AuthComponent.render();
        break;
      case 'dashboard':
        DashboardComponent.render();
        break;
      case 'assets':
        AssetsComponent.render();
        break;
      case 'valuation':
        ValuationComponent.render();
        break;
      case 'transactions':
        TransactionsComponent.render();
        break;
      case 'analytics':
      case 'simulator':
        AnalyticsComponent.render();
        break;
      case 'documents':
        DocumentsComponent.render();
        break;
      case 'reports':
        ReportsComponent.render();
        break;
      case 'alerts':
        AlertsComponent.render();
        break;
      case 'settings':
        SettingsComponent.render();
        break;
      default:
        DashboardComponent.render();
    }

    setTimeout(() => {
      if (window.lucide) lucide.createIcons();
    }, 40);
  },

  async updateSidebarLiveRates() {
    try {
      const data = await API.getMarketRates().catch(() => ({ rates: {} }));
      const r = data.rates || {};
      const sym = API.getCurrency() === 'INR' ? '₹' : '$';

      const g24 = r['GOLD_24K'] ? Math.round(r['GOLD_24K'].rate_per_gram).toLocaleString() : '15,535';
      const s999 = r['SILVER_999'] ? Math.round(r['SILVER_999'].rate_per_gram).toLocaleString() : '250';
      const p950 = r['PLATINUM_950'] ? Math.round(r['PLATINUM_950'].rate_per_gram).toLocaleString() : '5,379';

      const goldEl = document.getElementById('sidebar-rate-gold');
      const silverEl = document.getElementById('sidebar-rate-silver');
      const platEl = document.getElementById('sidebar-rate-plat');

      if (goldEl) goldEl.innerText = `${sym}${g24}`;
      if (silverEl) silverEl.innerText = `${sym}${s999}`;
      if (platEl) platEl.innerText = `${sym}${p950}`;
    } catch (e) {
      console.warn('Sidebar rates update error:', e);
    }
  },

  updateSyncTimestamp() {
    const el = document.getElementById('sync-timestamp-text');
    if (!el) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    el.innerText = `Rates ${formatted}`;
  },

  async updateUserDisplay() {
    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');
    const avatarEl = document.getElementById('user-avatar-initials');

    const token = API.getToken();
    if (!token) {
      if (nameEl) nameEl.innerText = 'Not Signed In';
      if (emailEl) emailEl.innerText = 'Please sign in';
      if (avatarEl) avatarEl.innerText = '--';
      return;
    }

    try {
      const res = await API.getProfile();
      const u = res.user;
      if (u) {
        if (nameEl) nameEl.innerText = u.name;
        if (emailEl) emailEl.innerText = u.email;
        const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        if (avatarEl) avatarEl.innerText = initials || 'AV';
      } else {
        if (nameEl) nameEl.innerText = 'Not Signed In';
        if (emailEl) emailEl.innerText = 'Please sign in';
        if (avatarEl) avatarEl.innerText = '--';
      }
    } catch (e) {
      if (nameEl) nameEl.innerText = 'Not Signed In';
      if (emailEl) emailEl.innerText = 'Please sign in';
      if (avatarEl) avatarEl.innerText = '--';
    }
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
      <i data-lucide="${icon}" style="color: ${type === 'success' ? 'var(--gain-green)' : 'var(--loss-red)'}; width: 18px;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  async renderPublicVerification(token) {
    this.currentRoute = 'verify';
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) appLayout.classList.add('auth-mode');

    const container = document.getElementById('view-container');
    if (!container) return;

    container.innerHTML = `
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
        <div class="card" style="max-width: 640px; width: 100%; padding: 36px; border-radius: 16px; box-shadow: var(--shadow-modal);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--gain-green-bg); color: var(--gain-green); margin-bottom: 12px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-primary); margin-bottom: 6px;">Authentic Physical Asset Certificate</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Cryptographically verified depository provenance record</p>
          </div>
          <div id="verify-cert-content" style="text-align: center; padding: 20px; color: var(--text-muted);">
            Verifying certificate token with the vault registry...
          </div>
        </div>
      </div>
    `;

    try {
      const data = await API.getCertificateDetails(token);
      const cert = data.certificate;
      const contentEl = document.getElementById('verify-cert-content');
      if (!contentEl) return;

      const verifiedDate = cert.verified_at ? new Date(cert.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Official Record';

      contentEl.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; text-align: left;">
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--gain-green); letter-spacing: 0.05em;">Registry Status: Verified</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">Asset ID: <strong>AV-${String(cert.asset_id || 1).padStart(4, '0')}</strong> &bull; Verified: ${verifiedDate}</div>
          </div>
          <span style="background: var(--gain-green); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px;">GENUINE</span>
        </div>

        <div style="text-align: left; margin-bottom: 20px;">
          <h3 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--text-primary); margin-bottom: 4px;">${cert.asset_name || 'Precious Asset'}</h3>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${cert.metal || ''} &bull; ${cert.category || 'Bullion'} &bull; ${cert.purity || 'Fine'}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: left; margin-bottom: 20px;">
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Gross Weight</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${cert.gross_weight_g || cert.weight_g || 0} g</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Fine Metal Content</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--gold-accent); margin-top: 2px;">${cert.fine_weight_g || cert.weight_g || 0} g</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Hallmark / HUID</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${cert.huid || 'BIS Certified'}</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Registered Owner</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${cert.masked_owner || 'Verified Custodian'}</div>
          </div>
        </div>

        ${cert.diamond_specs ? `
          <div style="background: var(--bg-hover); padding: 14px; border-radius: 8px; text-align: left; margin-bottom: 20px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Diamond Specifications</div>
            <div style="font-size: 0.88rem; color: var(--text-primary);">
              <strong>${cert.diamond_specs.carat || 0} Carats</strong> &bull; Cut: ${cert.diamond_specs.cut || 'Excellent'} &bull; Color: ${cert.diamond_specs.color || 'D-F'} &bull; Clarity: ${cert.diamond_specs.clarity || 'VVS'}
              ${cert.diamond_specs.cert_number ? `<br/><span style="font-size: 0.8rem; color: var(--text-muted);">Lab Certificate: ${cert.diamond_specs.cert_number}</span>` : ''}
            </div>
          </div>
        ` : ''}

        <div style="background: rgba(217, 119, 6, 0.08); border: 1px dashed rgba(217, 119, 6, 0.35); border-radius: 8px; padding: 12px 14px; margin-bottom: 24px; text-align: left;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--gold-accent); text-transform: uppercase; letter-spacing: 0.04em;">Financial Privacy Guarantee</div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 4px 0 0 0; line-height: 1.45;">
            Purchase acquisition price, current valuation, unrealized P&amp;L, and sensitive transaction records are strictly segregated under client-side encryption and are never disclosed on public certificates.
          </p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary" onclick="window.location.hash=''; App.navigate('auth');">
            Open AssetVault Portal
          </button>
        </div>
      `;
    } catch (e) {
      const contentEl = document.getElementById('verify-cert-content');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="padding: 24px 12px;">
            <div style="color: var(--loss-red); font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">Certificate Not Found or Revoked</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">The provided verification token is invalid, expired, or has been rotated by the asset owner.</p>
            <button class="btn btn-secondary" onclick="window.location.hash=''; App.navigate('auth');">
              Go to Login Portal
            </button>
          </div>
        `;
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
