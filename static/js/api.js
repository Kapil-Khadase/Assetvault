// AssetVault API Client Layer
const API = {
  baseUrl: '',
  tokenKey: 'assetvault_jwt_token',
  currencyKey: 'assetvault_selected_currency',

  getToken() {
    return localStorage.getItem(this.tokenKey) || '';
  },

  setToken(token) {
    if (token) localStorage.setItem(this.tokenKey, token);
    else localStorage.removeItem(this.tokenKey);
  },

  getCurrency() {
    return localStorage.getItem(this.currencyKey) || 'INR';
  },

  setCurrency(curr) {
    localStorage.setItem(this.currencyKey, curr);
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        console.warn("Session expired or unauthorized. Clearing credentials.");
        this.setToken('');
        if (typeof App !== 'undefined' && App.currentRoute !== 'auth' && typeof App.navigate === 'function') {
          App.updateUserDisplay();
          App.navigate('auth');
          App.showToast('Session expired or unauthorized. Please sign in.', 'error');
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Network error occurred');
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register(name, email, password, currency = 'INR') {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, currency })
    });
  },

  getProfile() {
    return this.request('/api/auth/me');
  },

  updateProfile(data) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Portfolio & Market Data
  getPortfolioSummary() {
    const curr = this.getCurrency();
    return this.request(`/api/portfolio/summary?currency=${curr}`);
  },

  getMarketRates() {
    const curr = this.getCurrency();
    return this.request(`/api/market-rates?currency=${curr}`);
  },

  syncMarketRates(apiKey = '') {
    return this.request('/api/market-rates/sync', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey })
    });
  },

  getMarketHistory(days = 30) {
    const curr = this.getCurrency();
    return this.request(`/api/market-rates/history?days=${days}&currency=${curr}`);
  },

  // Asset CRUD
  getAssets(filters = {}) {
    const curr = this.getCurrency();
    const params = new URLSearchParams({ currency: curr, ...filters });
    return this.request(`/api/assets?${params.toString()}`);
  },

  getAssetDetail(id) {
    const curr = this.getCurrency();
    return this.request(`/api/assets/${id}?currency=${curr}`);
  },

  createAsset(assetData) {
    return this.request('/api/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
  },

  updateAsset(id, assetData) {
    return this.request(`/api/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    });
  },

  deleteAsset(id) {
    return this.request(`/api/assets/${id}`, {
      method: 'DELETE'
    });
  },

  sellAsset(id, saleData) {
    return this.request(`/api/assets/${id}/sell`, {
      method: 'POST',
      body: JSON.stringify(saleData)
    });
  },

  updateAssetStatus(id, status, notes = '') {
    return this.request(`/api/assets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes })
    });
  },

  // Simulator
  runSimulation(shocks) {
    const curr = this.getCurrency();
    return this.request('/api/simulator/run', {
      method: 'POST',
      body: JSON.stringify({ ...shocks, currency: curr })
    });
  },

  // Transactions
  getTransactions() {
    return this.request('/api/transactions');
  },

  // Alerts
  getAlerts() {
    const curr = this.getCurrency();
    return this.request(`/api/alerts?currency=${curr}`);
  },

  createAlert(alertData) {
    return this.request('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData)
    });
  },

  deleteAlert(id) {
    return this.request(`/api/alerts/${id}`, {
      method: 'DELETE'
    });
  },

  // Documents
  getDocuments() {
    return this.request('/api/documents');
  },

  async uploadDocument(formData) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData
    });
    return await res.json();
  },

  getCategories() {
    return this.request('/api/categories');
  },

  // Reports URL Helpers
  getPdfReportUrl() {
    return `/api/reports/pdf?currency=${this.getCurrency()}&token=${this.getToken()}`;
  },

  getExcelReportUrl() {
    return `/api/reports/excel?currency=${this.getCurrency()}&token=${this.getToken()}`;
  },

  getCsvReportUrl() {
    return `/api/reports/csv?currency=${this.getCurrency()}&token=${this.getToken()}`;
  }
};
