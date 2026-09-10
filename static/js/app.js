// AssetVault Main Single Page App Orchestrator - Exact Reference Design
const App = {
  currentRoute: 'auth',

  async init() {
    this.setupTheme();
    this.setupNavigation();

    // Always start at the Login & Authentication portal when the app opens
    if (typeof VaultCrypto !== 'undefined') {
      VaultCrypto.clearKey();
    }
    this.updateUserDisplay();
    this.navigate('auth');

    if (window.lucide) lucide.createIcons();

    // Periodically update live ticker (every 30s) when signed in
    setInterval(() => {
      if (this.currentRoute !== 'auth' && API.getToken()) {
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

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-view');
        if (target) {
          this.navigate(target);
          // Close mobile sidebar on navigation
          const sidebar = document.getElementById('sidebar');
          if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');
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
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
