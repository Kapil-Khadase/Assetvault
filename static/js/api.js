// AssetVault Client-Side Encrypted Client & API Layer
const API = {
  baseUrl: '',
  tokenKey: 'assetvault_jwt_token',
  currencyKey: 'assetvault_selected_currency',
  saltKey: 'assetvault_user_salt',

  getToken() {
    return localStorage.getItem(this.tokenKey) || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem('assetvault_session_pwd');
    }
  },

  getSalt() {
    return localStorage.getItem(this.saltKey) || 'assetvault_salt_v1';
  },

  setSalt(salt) {
    if (salt) localStorage.setItem(this.saltKey, salt);
    else localStorage.removeItem(this.saltKey);
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
        if (typeof VaultCrypto !== 'undefined') VaultCrypto.clearKey();
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
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.user && res.user.encryption_salt) {
      this.setSalt(res.user.encryption_salt);
      sessionStorage.setItem('assetvault_session_pwd', password);
      // Derive client-side AES-256-GCM encryption key
      if (typeof VaultCrypto !== 'undefined') {
        await VaultCrypto.deriveKey(password, res.user.encryption_salt);
      }
    }
    return res;
  },

  async register(name, email, password, currency = 'INR') {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, currency })
    });
    if (res.user && res.user.encryption_salt) {
      this.setSalt(res.user.encryption_salt);
      sessionStorage.setItem('assetvault_session_pwd', password);
      // Derive client-side AES-256-GCM encryption key
      if (typeof VaultCrypto !== 'undefined') {
        await VaultCrypto.deriveKey(password, res.user.encryption_salt);
      }
    }
    return res;
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

  updateQrPrivacy(data) {
    return this.request('/api/auth/qr-privacy', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Public Bullion Market Spot Rates
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

  // Metal Purity Factor Helper
  getPurityFactor(metal = 'Gold', purity = '22K') {
    const m = (metal || '').toUpperCase().trim();
    const p = (purity || '').toUpperCase().trim();

    if (m === 'GOLD') {
      if (p.includes('24') || p.includes('999')) return 1.0;
      if (p.includes('22') || p.includes('916')) return 0.9167;
      if (p.includes('18') || p.includes('750')) return 0.7500;
      if (p.includes('14') || p.includes('585')) return 0.5833;
      if (p.includes('10')) return 0.4167;
      return 0.9167;
    }
    if (m === 'SILVER') {
      if (p.includes('999')) return 1.0;
      if (p.includes('925') || p.includes('STERLING')) return 0.925;
      return 1.0;
    }
    if (m === 'PLATINUM') {
      if (p.includes('950')) return 0.95;
      if (p.includes('999')) return 1.0;
      return 0.95;
    }
    return 1.0;
  },

  // Diamond Valuation Helper
  calculateDiamondValuation(carat = 0, cut = 'VERY GOOD', color = 'G', clarity = 'VS2', cert = 'IGI') {
    if (!carat || carat <= 0) return 0;
    const baseCaratRateINR = 280000.0;
    const colorMult = { 'D': 1.28, 'E': 1.18, 'F': 1.10, 'G': 1.00, 'H': 0.92, 'I': 0.84, 'J': 0.76, 'K': 0.68, 'L': 0.60, 'M': 0.55 }[(color || 'G').toUpperCase()] || 1.0;
    const clarityMult = { 'FL': 1.40, 'IF': 1.30, 'VVS1': 1.22, 'VVS2': 1.14, 'VS1': 1.06, 'VS2': 1.00, 'SI1': 0.88, 'SI2': 0.74, 'I1': 0.58, 'I2': 0.45, 'I3': 0.35 }[(clarity || 'VS2').toUpperCase()] || 1.0;
    const cutMult = { 'EXCELLENT': 1.12, 'IDEAL': 1.15, 'VERY GOOD': 1.04, 'GOOD': 0.95, 'FAIR': 0.82, 'POOR': 0.70 }[(cut || 'VERY GOOD').toUpperCase()] || 1.0;
    const certMult = { 'GIA': 1.10, 'AGS': 1.05, 'IGI': 1.00, 'HRD': 0.98, 'SGL': 0.95, 'IN-HOUSE': 0.85, 'NONE': 0.80 }[(cert || 'IGI').toUpperCase()] || 0.90;

    const sizeExp = Math.pow(carat, 1.32);
    const valINR = sizeExp * baseCaratRateINR * colorMult * clarityMult * cutMult * certMult;
    return valINR;
  },

  // Compute live valuation for a decrypted asset
  evaluateAsset(asset, rates = {}, currency = 'INR') {
    const metal = (asset.metal || 'Gold').toUpperCase().trim();
    const purity = (asset.purity || '22K').toUpperCase().trim();
    const grossWt = parseFloat(asset.gross_weight || 0);
    const stoneWt = parseFloat(asset.stone_weight || 0);
    const netWt = parseFloat(asset.net_weight || Math.max(0, grossWt - stoneWt));
    const qty = parseInt(asset.quantity || 1, 10);

    const purityFactor = this.getPurityFactor(metal, purity);

    let baseKey = 'GOLD_24K';
    if (metal === 'SILVER') baseKey = 'SILVER_999';
    else if (metal === 'PLATINUM') baseKey = 'PLATINUM_950';

    let ratePerGram = 0;
    if (rates[baseKey]) {
      ratePerGram = (rates[baseKey].rate_per_gram || 0) * purityFactor;
    } else {
      // Default baseline spot benchmarks
      if (metal === 'GOLD') ratePerGram = 15535.0 * purityFactor;
      else if (metal === 'SILVER') ratePerGram = 250.0 * purityFactor;
      else if (metal === 'PLATINUM') ratePerGram = 5379.0 * purityFactor;
    }

    const metalVal = netWt * ratePerGram * qty;

    let diamondVal = 0;
    const diamondCarat = parseFloat(asset.diamond_carat || 0);
    if (diamondCarat > 0 || (asset.asset_type || '').toLowerCase().includes('diamond')) {
      diamondVal = this.calculateDiamondValuation(
        diamondCarat,
        asset.diamond_cut,
        asset.diamond_color,
        asset.diamond_clarity,
        asset.diamond_cert_lab
      ) * qty;
    }

    const currentEstimatedVal = Math.round(metalVal + diamondVal);
    const purchasePrice = parseFloat(asset.purchase_price || 0);
    const making = parseFloat(asset.making_charges || 0);
    const wastage = parseFloat(asset.wastage || 0);
    const taxes = parseFloat(asset.taxes || 0);
    const totalCost = Math.round(parseFloat(asset.total_acquisition_cost) || (purchasePrice + making + wastage + taxes));

    const pnl = currentEstimatedVal - totalCost;
    const roi = totalCost > 0 ? ((pnl / totalCost) * 100) : 0;

    return {
      ...asset,
      net_weight: netWt,
      market_rate_used: ratePerGram,
      metal_value: metalVal,
      diamond_value: diamondVal,
      current_estimated_value: currentEstimatedVal,
      current_valuation: currentEstimatedVal,
      total_acquisition_cost: totalCost,
      profit_loss: pnl,
      unrealized_gain: pnl,
      roi_percentage: Number(roi.toFixed(2))
    };
  },

  // Asset CRUD with Client-Side Encryption
  async getAssets(filters = {}) {
    const curr = this.getCurrency();
    const res = await this.request('/api/assets');
    const rawAssets = res.assets || [];

    const ratesData = await this.getMarketRates().catch(() => ({ rates: {} }));
    const rates = ratesData.rates || {};

    const decryptedAssets = [];
    for (const a of rawAssets) {
      if (a.encrypted_data && a.iv) {
        if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
          try {
            const dec = await VaultCrypto.decrypt(a.encrypted_data, a.iv);
            if (dec && typeof dec === 'object') {
              const fullAsset = {
                ...dec,
                id: a.id,
                user_id: a.user_id,
                status: a.status || dec.status || 'Active',
                category_id: a.category_id || dec.category_id,
                created_at: a.created_at || dec.created_at,
                updated_at: a.updated_at || dec.updated_at
              };
              decryptedAssets.push(this.evaluateAsset(fullAsset, rates, curr));
            }
          } catch (e) {
            console.warn("Could not decrypt asset id:", a.id, e);
          }
        }
      } else {
        // Legacy unencrypted asset
        decryptedAssets.push(this.evaluateAsset(a, rates, curr));
      }
    }

    return { assets: decryptedAssets, total_count: decryptedAssets.length, currency: curr };
  },

  async getAssetDetail(id) {
    const curr = this.getCurrency();
    const res = await this.request(`/api/assets/${id}`);
    const a = res.asset;
    if (!a) throw new Error("Asset not found");

    const ratesData = await this.getMarketRates().catch(() => ({ rates: {} }));
    const rates = ratesData.rates || {};

    let assetObj = a;
    if (a.encrypted_data && a.iv && typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const dec = await VaultCrypto.decrypt(a.encrypted_data, a.iv);
      assetObj = {
        ...dec,
        id: a.id,
        user_id: a.user_id,
        status: a.status || dec.status || 'Active',
        transactions: a.transactions || [],
        documents: a.documents || [],
        created_at: a.created_at,
        updated_at: a.updated_at
      };
    }

    return { asset: this.evaluateAsset(assetObj, rates, curr) };
  },

  async createAsset(assetData) {
    // Encrypt asset client-side with AES-256-GCM
    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const enc = await VaultCrypto.encrypt(assetData);
      
      // Also encrypt purchase transaction record
      const txData = {
        asset_name: assetData.asset_name,
        transaction_type: 'PURCHASE',
        transaction_date: assetData.purchase_date || new Date().toISOString().slice(0, 10),
        amount: parseFloat(assetData.total_acquisition_cost || assetData.purchase_price || 0),
        counterparty: assetData.jeweller_name || 'Acquisition',
        notes: `Added asset: ${assetData.asset_name}`
      };
      const encTx = await VaultCrypto.encrypt(txData);

      return this.request('/api/assets', {
        method: 'POST',
        body: JSON.stringify({
          encrypted_data: enc.ciphertext,
          iv: enc.iv,
          status: assetData.status || 'Active',
          transaction_encrypted_data: encTx.ciphertext,
          transaction_iv: encTx.iv
        })
      });
    }

    return this.request('/api/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
  },

  async updateAsset(id, assetData) {
    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const enc = await VaultCrypto.encrypt(assetData);
      return this.request(`/api/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          encrypted_data: enc.ciphertext,
          iv: enc.iv,
          status: assetData.status || 'Active'
        })
      });
    }

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

  async sellAsset(id, saleData) {
    const saleAmount = parseFloat(saleData.sale_amount || 0);
    const sellingCharges = parseFloat(saleData.selling_charges || 0);
    const saleDate = saleData.sale_date || new Date().toISOString().slice(0, 10);
    const buyerName = saleData.buyer_name || 'Sale Counterparty';

    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const enc = await VaultCrypto.encrypt({
        ...saleData,
        transaction_type: 'SALE',
        amount: saleAmount,
        selling_charges: sellingCharges,
        transaction_date: saleDate,
        counterparty: buyerName,
        notes: saleData.notes || 'Liquidated asset'
      });

      return this.request(`/api/assets/${id}/sell`, {
        method: 'POST',
        body: JSON.stringify({
          encrypted_data: enc.ciphertext,
          iv: enc.iv,
          sale_amount: saleAmount,
          selling_charges: sellingCharges,
          sale_date: saleDate,
          buyer_name: buyerName
        })
      });
    }

    return this.request(`/api/assets/${id}/sell`, {
      method: 'POST',
      body: JSON.stringify({
        ...saleData,
        sale_amount: saleAmount,
        selling_charges: sellingCharges,
        sale_date: saleDate,
        buyer_name: buyerName
      })
    });
  },

  getHealth() {
    return this.request('/api/health');
  },

  updateAssetStatus(id, status) {
    return this.request(`/api/assets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  // Client-Side Portfolio Summary Computation
  async getPortfolioSummary() {
    const curr = this.getCurrency();
    const assetsData = await this.getAssets();
    const allAssets = assetsData.assets || [];

    const txData = await this.getTransactions().catch(() => ({ transactions: [] }));
    const allTxs = txData.transactions || [];

    let totalInvested = 0;
    let totalCurrentMarketVal = 0;
    let totalUnrealizedPnl = 0;
    let activeAssetsCount = 0;

    const metalAlloc = {};
    const categoryAlloc = {};

    for (const a of allAssets) {
      if ((a.status || 'Active') === 'Active') {
        activeAssetsCount += 1;
        totalInvested += (a.total_acquisition_cost || 0);
        totalCurrentMarketVal += (a.current_estimated_value || 0);
        totalUnrealizedPnl += (a.profit_loss || 0);

        const metal = (a.metal || 'Gold').charAt(0).toUpperCase() + (a.metal || 'Gold').slice(1).toLowerCase();
        metalAlloc[metal] = (metalAlloc[metal] || 0) + (a.current_estimated_value || 0);

        const cat = a.category_name || (a.asset_type || 'Jewellery');
        categoryAlloc[cat] = (categoryAlloc[cat] || 0) + (a.current_estimated_value || 0);
      }
    }

    const sales = allTxs.filter(t => (t.transaction_type || '').toUpperCase() === 'SALE');
    const totalRealizedPnl = sales.reduce((sum, t) => sum + (parseFloat(t.realized_profit) || 0), 0);

    const overallRoi = totalInvested > 0 ? ((totalUnrealizedPnl / totalInvested) * 100) : 0;

    const metalAllocationList = Object.entries(metalAlloc).map(([label, val]) => ({
      label,
      value: val,
      percentage: totalCurrentMarketVal > 0 ? Number(((val / totalCurrentMarketVal) * 100).toFixed(1)) : 0
    }));

    const categoryAllocationList = Object.entries(categoryAlloc).map(([label, val]) => ({
      label,
      value: val,
      percentage: totalCurrentMarketVal > 0 ? Number(((val / totalCurrentMarketVal) * 100).toFixed(1)) : 0
    }));

    return {
      total_assets_count: allAssets.length,
      total_active_assets: activeAssetsCount,
      total_invested_cost: Math.round(totalInvested),
      total_current_market_value: Math.round(totalCurrentMarketVal),
      total_unrealized_pnl: Math.round(totalUnrealizedPnl),
      total_realized_pnl: Math.round(totalRealizedPnl),
      overall_roi_pct: Number(overallRoi.toFixed(2)),
      total_sales_count: sales.length,
      metal_allocation: metalAllocationList,
      category_allocation: categoryAllocationList,
      assets: allAssets,
      currency: curr
    };
  },

  // Transactions with Client-Side Decryption & Pagination
  async getTransactions(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.per_page) qs.set('per_page', params.per_page);
    if (params.type && params.type !== 'all') qs.set('type', params.type);
    if (params.search) qs.set('search', params.search);
    if (params.start_date) qs.set('start_date', params.start_date);
    if (params.end_date) qs.set('end_date', params.end_date);

    const endpoint = `/api/transactions${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await this.request(endpoint);
    const rawTxs = res.transactions || [];

    const decryptedTxs = [];
    for (const t of rawTxs) {
      if (t.encrypted_data && t.iv && typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
        try {
          const dec = await VaultCrypto.decrypt(t.encrypted_data, t.iv);
          if (dec && typeof dec === 'object') {
            decryptedTxs.push({
              ...dec,
              id: t.id,
              asset_id: t.asset_id || dec.asset_id,
              transaction_type: t.transaction_type || dec.transaction_type || 'PURCHASE',
              transaction_date: t.transaction_date || dec.transaction_date || t.created_at,
              amount: dec.amount || t.amount || 0,
              realized_profit: dec.realized_profit || t.realized_profit || 0,
              created_at: t.created_at
            });
            continue;
          }
        } catch (e) {
          console.warn("Could not decrypt transaction id:", t.id, e);
        }
      }
      decryptedTxs.push(t);
    }

    return {
      transactions: decryptedTxs,
      total: res.total !== undefined ? res.total : decryptedTxs.length,
      page: res.page || 1,
      per_page: res.per_page || 50,
      total_pages: res.total_pages || 1
    };
  },

  // Alerts with Client-Side Encryption
  async getAlerts() {
    const curr = this.getCurrency();
    const res = await this.request(`/api/alerts?currency=${curr}`);
    const rawAlerts = res.alerts || [];

    const decryptedAlerts = [];
    for (const a of rawAlerts) {
      if (a.encrypted_data && a.iv && typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
        try {
          const dec = await VaultCrypto.decrypt(a.encrypted_data, a.iv);
          if (dec && typeof dec === 'object') {
            decryptedAlerts.push({
              ...dec,
              id: a.id,
              is_triggered: a.is_triggered || 0,
              created_at: a.created_at
            });
          }
        } catch (e) {
          console.warn("Could not decrypt alert id:", a.id, e);
        }
      } else {
        decryptedAlerts.push(a);
      }
    }

    return { alerts: decryptedAlerts };
  },

  async createAlert(alertData) {
    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const enc = await VaultCrypto.encrypt(alertData);
      return this.request('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          encrypted_data: enc.ciphertext,
          iv: enc.iv
        })
      });
    }

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

  // Documents (Client-Side Encrypted)
  async getDocuments(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.append('page', params.page);
    if (params.limit) qs.append('limit', params.limit);
    if (params.document_type) qs.append('document_type', params.document_type);
    if (params.asset_id) qs.append('asset_id', params.asset_id);
    if (params.search) qs.append('search', params.search);
    const queryString = qs.toString();
    return this.request(`/api/documents${queryString ? '?' + queryString : ''}`);
  },

  getDocumentDownloadUrl(docId) {
    const token = this.getToken();
    return `/api/documents/${docId}/download?token=${encodeURIComponent(token || '')}`;
  },

  getDocumentViewUrl(docId) {
    const token = this.getToken();
    return `/api/documents/${docId}/view?token=${encodeURIComponent(token || '')}`;
  },

  deleteDocument(docId) {
    return this.request(`/api/documents/${docId}`, {
      method: 'DELETE'
    });
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
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload document');
    }
    return data;
  },

  // Encrypt file client-side before sending ciphertext to server
  async uploadDocumentEncrypted(file, assetId, docType) {
    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.validateFile) {
      // Validate extension, MIME type, magic bytes, dimensions before encryption (Requirement 5)
      await VaultCrypto.validateFile(file);
    }

    if (typeof VaultCrypto !== 'undefined' && VaultCrypto.hasKey()) {
      const arrayBuf = await file.arrayBuffer();
      const encResult = await VaultCrypto.encryptBuffer(arrayBuf);
      const encryptedBlob = new Blob([encResult.ciphertextBuffer], { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('asset_id', assetId);
      formData.append('document_type', docType);
      formData.append('file', encryptedBlob, file.name);
      formData.append('file_name', file.name);
      formData.append('is_encrypted', 'true');
      formData.append('iv', encResult.iv);
      formData.append('encryption_metadata', JSON.stringify(encResult.metadata));
      return this.uploadDocument(formData);
    } else {
      const formData = new FormData();
      formData.append('asset_id', assetId);
      formData.append('document_type', docType);
      formData.append('file', file);
      return this.uploadDocument(formData);
    }
  },

  // Download ciphertext and decrypt locally in memory with Web Crypto
  async fetchDecryptedDocument(docId, fileName) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/documents/${docId}/view?token=${encodeURIComponent(token || '')}`, { headers });
    if (!res.ok) {
      let errMsg = "Failed to fetch document";
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errMsg = errJson.error;
      } catch (e) {
        // non-json response
      }
      throw new Error(errMsg);
    }

    const isEncrypted = res.headers.get("X-Is-Encrypted") === "true";
    const iv = res.headers.get("X-IV");
    const ext = (fileName || "").split(".").pop().toLowerCase();
    const mimeMap = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp"
    };
    const mime = mimeMap[ext] || "application/octet-stream";

    if (isEncrypted && iv) {
      if (typeof VaultCrypto !== 'undefined') {
        // If key is not in memory (e.g. after browser refresh), attempt to restore from active tab session
        if (!VaultCrypto.hasKey()) {
          const sessionPwd = sessionStorage.getItem('assetvault_session_pwd');
          const salt = this.getSalt();
          if (sessionPwd) {
            await VaultCrypto.deriveKey(sessionPwd, salt);
          }
        }

        if (VaultCrypto.hasKey()) {
          const ciphertextBuf = await res.arrayBuffer();
          const decryptedBuf = await VaultCrypto.decryptBuffer(ciphertextBuf, iv);
          const blob = new Blob([decryptedBuf], { type: mime });
          return { blob, url: URL.createObjectURL(blob), isEncrypted: true };
        }
      }

      // If key is still locked because user reloaded without cached session or signed in before encryption was set
      throw new Error("Encrypted Document: Vault encryption key is locked in memory. Please sign in again with your password to decrypt.");
    } else {
      const rawBuf = await res.arrayBuffer();
      const blob = new Blob([rawBuf], { type: mime });
      return { blob, url: URL.createObjectURL(blob), isEncrypted: false };
    }
  },

  getCategories() {
    return this.request('/api/categories');
  },

  // Portfolio Goals Tracking (Full CRUD)
  getGoals() {
    return this.request('/api/goals');
  },

  createGoal(goalData) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });
  },

  updateGoal(goalId, goalData) {
    return this.request(`/api/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goalData)
    });
  },

  deleteGoal(goalId) {
    return this.request(`/api/goals/${goalId}`, {
      method: 'DELETE'
    });
  },

  // Duplicate Asset Detection
  checkDuplicateAsset(checkData) {
    return this.request('/api/assets/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(checkData)
    });
  },

  // CSV/XLSX Import
  async previewImport(file) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/assets/import/preview', {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import preview failed');
    return data;
  },

  confirmImport(validRows) {
    return this.request('/api/assets/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ valid_rows: validRows })
    });
  },

  // Auth & Account Management
  changePassword(currentPassword, newPassword, confirmPassword) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
  },

  logoutAllSessions() {
    return this.request('/api/auth/logout-all', {
      method: 'POST'
    });
  },

  deleteAccount(password, confirmationPhrase) {
    return this.request('/api/auth/delete-account', {
      method: 'POST',
      body: JSON.stringify({
        password,
        confirmation_phrase: confirmationPhrase
      })
    });
  },

  getAuditLogs(limit = 50) {
    return this.request(`/api/audit-logs?limit=${limit}`);
  },

  // Encrypted Vault Backup & Restore
  exportVaultData() {
    return this.request('/api/backup/vault-data');
  },

  restoreVaultData(vaultPayload) {
    return this.request('/api/backup/restore-vault-data', {
      method: 'POST',
      body: JSON.stringify(vaultPayload)
    });
  },

  // Public QR Certificate Verification
  getCertificateDetails(token) {
    return this.request(`/api/verify/certificate/${encodeURIComponent(token)}`);
  },

  // System Diagnostics & Health
  getHealth() {
    return this.request('/api/health');
  },

  // Client-Side Macro Shock Simulator for E2EE Assets
  async runSimulation(shocks = {}) {
    const curr = this.getCurrency();
    const gShock = parseFloat(shocks.gold_shock || 0);
    const sShock = parseFloat(shocks.silver_shock || 0);
    const pShock = parseFloat(shocks.plat_shock || 0);
    const dShock = parseFloat(shocks.diamond_shock || 0);

    const ratesData = await this.getMarketRates().catch(() => ({ rates: {} }));
    const baseRates = ratesData.rates || {};

    // Generate shocked rates
    const simRates = {};
    for (const [k, r] of Object.entries(baseRates)) {
      const rateCopy = { ...r };
      const m = (rateCopy.metal || '').toUpperCase();
      let mult = 1.0;
      if (m === 'GOLD') mult = 1.0 + (gShock / 100.0);
      else if (m === 'SILVER') mult = 1.0 + (sShock / 100.0);
      else if (m === 'PLATINUM') mult = 1.0 + (pShock / 100.0);

      rateCopy.rate_per_gram = rateCopy.rate_per_gram * Math.max(0.01, mult);
      simRates[k] = rateCopy;
    }

    const assetsData = await this.getAssets();
    const activeAssets = (assetsData.assets || []).filter(a => (a.status || 'Active') === 'Active');

    let baseTotal = 0;
    let simTotal = 0;
    let totalInvested = 0;
    const impacts = [];

    for (const a of activeAssets) {
      const baseVal = this.evaluateAsset(a, baseRates, curr);
      let simVal = this.evaluateAsset(a, simRates, curr);

      if (dShock !== 0 && simVal.diamond_value > 0) {
        const adjDiamond = Math.round(simVal.diamond_value * (1.0 + (dShock / 100.0)));
        simVal.diamond_value = adjDiamond;
        simVal.current_estimated_value = Math.round(simVal.metal_value + adjDiamond);
        simVal.profit_loss = simVal.current_estimated_value - simVal.total_acquisition_cost;
        simVal.roi_percentage = simVal.total_acquisition_cost > 0 ? Number(((simVal.profit_loss / simVal.total_acquisition_cost) * 100).toFixed(2)) : 0;
      }

      const diff = simVal.current_estimated_value - baseVal.current_estimated_value;
      const diffPct = baseVal.current_estimated_value > 0 ? Number(((diff / baseVal.current_estimated_value) * 100).toFixed(1)) : 0;

      baseTotal += baseVal.current_estimated_value;
      simTotal += simVal.current_estimated_value;
      totalInvested += baseVal.total_acquisition_cost;

      impacts.push({
        asset_id: a.id,
        asset_name: a.asset_name,
        owner_name: a.owner_name || a.buyer_name || '',
        metal: a.metal,
        purity: a.purity,
        photo_url: a.photo_url,
        total_cost: baseVal.total_acquisition_cost,
        base_value: baseVal.current_estimated_value,
        simulated_value: simVal.current_estimated_value,
        value_difference: diff,
        difference_percentage: diffPct,
        simulated_pnl: simVal.profit_loss,
        simulated_roi: simVal.roi_percentage
      });
    }

    const valueDiff = simTotal - baseTotal;
    const diffPct = baseTotal > 0 ? Number(((valueDiff / baseTotal) * 100).toFixed(1)) : 0;
    const simPnl = simTotal - totalInvested;
    const simRoi = totalInvested > 0 ? Number(((simPnl / totalInvested) * 100).toFixed(2)) : 0;

    return {
      base_total_value: baseTotal,
      simulated_total_value: simTotal,
      portfolio_value_diff: valueDiff,
      portfolio_diff_pct: diffPct,
      total_invested_cost: totalInvested,
      simulated_total_pnl: simPnl,
      simulated_total_roi: simRoi,
      asset_simulations: impacts,
      currency: curr
    };
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
  },

  async downloadReport(type = 'pdf') {
    try {
      const portfolio = await this.getPortfolioSummary();
      let transactions = [];
      try {
        transactions = await this.getTransactions();
      } catch (e) {
        console.warn('Could not fetch transactions for report:', e);
      }
      const currency = this.getCurrency();

      const endpoint = `/api/reports/generate-${type}`;
      const token = this.getToken();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          portfolio,
          transactions,
          currency
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${type.toUpperCase()} report: ${response.statusText}`);
      }

      const blob = await response.blob();
      const ext = type === 'pdf' ? 'pdf' : (type === 'excel' ? 'xlsx' : 'csv');
      const filename = `AssetVault_Portfolio_${new Date().toISOString().split('T')[0]}.${ext}`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Report download error:', err);
      // Fallback to direct GET link if POST fails
      const fallbackUrl = type === 'pdf' ? this.getPdfReportUrl() : (type === 'excel' ? this.getExcelReportUrl() : this.getCsvReportUrl());
      window.open(fallbackUrl, '_blank');
    }
  }
};
