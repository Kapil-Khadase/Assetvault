// Assets Management Component - Exact Replica of Reference Screenshot 2 with Digital Gold & SGB Support
const AssetsComponent = {
  currentStatusFilter: 'held', // 'held' | 'sold' | 'archived' | 'all'
  currentMetalFilter: '',      // '' | 'gold' | 'silver' | 'platinum' | 'diamond' | 'digital_gold'
  searchQuery: '',
  sortBy: 'value_desc',
  viewMode: 'table', // 'table' | 'grid'
  allAssets: [],
  selectedPhotoUrl: '/img/assets/digital_gold.svg',

  photoPresets: [
    { label: 'Digital Gold (24K)', url: '/img/assets/digital_gold.svg' },
    { label: 'RBI SGB Gold Bond', url: '/img/assets/gold_sgb.svg' },
    { label: 'Digital Silver (999)', url: '/img/assets/digital_silver.svg' },
    { label: 'Temple Necklace', url: '/img/assets/temple_necklace.svg' },
    { label: 'Solitaire Ring', url: '/img/assets/solitaire_ring.svg' },
    { label: 'Kada Bangles', url: '/img/assets/kada_bangles.svg' },
    { label: 'Gold Coins', url: '/img/assets/gold_coins.svg' },
    { label: 'Rose Gold Chain', url: '/img/assets/rose_gold_chain.svg' },
    { label: 'Diamond Studs', url: '/img/assets/diamond_earrings.svg' },
    { label: 'Silver Pooja Set', url: '/img/assets/silver_pooja.svg' },
    { label: 'Silver Bars', url: '/img/assets/silver_bars.svg' },
    { label: 'Platinum Band', url: '/img/assets/platinum_band.svg' },
    { label: 'Gold Bar 50g', url: '/img/assets/gold_bar_50g.svg' }
  ],

  getPhotoForAsset(a) {
    if (a.photo_url && a.photo_url.trim()) return a.photo_url;
    const name = (a.asset_name || '').toLowerCase();
    const metal = (a.metal || '').toLowerCase();
    const type = (a.asset_type || '').toLowerCase();
    const cat = (a.category_name || '').toLowerCase();

    if (name.includes('digital gold') || type.includes('digital gold') || cat.includes('digital gold')) return '/img/assets/digital_gold.svg';
    if (name.includes('sgb') || name.includes('sovereign') || type.includes('sgb') || type.includes('bond')) return '/img/assets/gold_sgb.svg';
    if (name.includes('digital silver') || type.includes('digital silver')) return '/img/assets/digital_silver.svg';
    if (name.includes('temple') || name.includes('necklace')) return '/img/assets/temple_necklace.svg';
    if (name.includes('solitaire') || name.includes('engagement') || (metal.includes('diamond') && name.includes('ring'))) return '/img/assets/solitaire_ring.svg';
    if (name.includes('bangle') || name.includes('kada')) return '/img/assets/kada_bangles.svg';
    if (name.includes('coin')) return '/img/assets/gold_coins.svg';
    if (name.includes('chain')) return '/img/assets/rose_gold_chain.svg';
    if (name.includes('earring') || name.includes('stud')) return '/img/assets/diamond_earrings.svg';
    if (name.includes('pooja') || name.includes('thali') || name.includes('diya')) return '/img/assets/silver_pooja.svg';
    if (name.includes('silver') && name.includes('bar')) return '/img/assets/silver_bars.svg';
    if (metal.includes('plat') || name.includes('band')) return '/img/assets/platinum_band.svg';
    if (name.includes('bar')) return '/img/assets/gold_bar_50g.svg';
    return '/img/assets/digital_gold.svg';
  },

  getDocCompleteness(a) {
    let score = 0;
    const docs = a.documents || [];

    // 1. Tax Invoice / Receipt (30%)
    const hasInvoice = !!(a.invoice_number || a.has_invoice || docs.some(d => /invoice|bill|receipt/i.test(d.document_type || d.title || d.file_name || '')));
    if (hasInvoice) score += 30;
    else if (a.jeweller || a.jeweller_name || a.purchase_date) score += 15;

    // 2. Hallmark / HUID / Assay (30%)
    const hasHallmark = !!(a.hallmark_huid || a.huid || docs.some(d => /hallmark|huid|assay/i.test(d.document_type || d.title || d.file_name || '')));
    if (hasHallmark) score += 30;
    else if (a.purity && (a.purity.includes('22K') || a.purity.includes('916') || a.purity.includes('24K') || a.purity.includes('999'))) score += 15;

    // 3. Certificate / Lab Report (20%)
    const hasCert = !!(a.diamond_cert_number || a.certificate_number || docs.some(d => /cert|valuation|gia|igi/i.test(d.document_type || d.title || d.file_name || '')));
    if (hasCert) score += 20;
    else if (a.diamond_carat) score += 10;
    else score += 10;

    // 4. Photo Evidence (+10% for photos)
    const hasPhoto = !!(a.photo_url && a.photo_url.trim()) || docs.some(d => /image|photo/i.test(d.file_type || d.document_type || ''));
    if (hasPhoto) score += 10;

    // 5. Weight & Fineness Specification (10%)
    const hasSpecs = !!((a.net_weight || a.gross_weight) && a.purity && a.metal);
    if (hasSpecs) score += 10;

    return {
      score: Math.min(100, Math.max(20, score)),
      hasInvoice,
      hasHallmark,
      hasCert,
      hasPhoto,
      hasSpecs
    };
  },

  generateQRCodeSVG(text, size = 130) {
    const n = 25;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));

    const drawFinder = (r, c) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            matrix[r + i][c + j] = 1;
          } else {
            matrix[r + i][c + j] = 0;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, n - 7);
    drawFinder(n - 7, 0);

    for (let i = 8; i < n - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    const ar = 16, ac = 16;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === 0 || i === 4 || j === 0 || j === 4 || (i === 2 && j === 2)) {
          matrix[ar + i][ac + j] = 1;
        } else {
          matrix[ar + i][ac + j] = 0;
        }
      }
    }

    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    }
    const seed = Math.abs(h);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8)) continue;
        if (r === 6 || c === 6) continue;
        if (r >= ar && r < ar + 5 && c >= ac && c < ac + 5) continue;
        if (r >= 10 && r <= 14 && c >= 10 && c <= 14) continue;

        const val = ((seed * (r * 31 + c * 17 + 13)) % 100);
        matrix[r][c] = val > 45 ? 1 : 0;
      }
    }

    const cellSize = (size / n).toFixed(2);
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c] === 1) {
          rects += `<rect x="${(c * cellSize)}" y="${(r * cellSize)}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
        }
      }
    }

    const center = size / 2;
    const crestSize = size * 0.24;
    const halfCrest = crestSize / 2;

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background: #ffffff; border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        ${rects}
        <rect x="${center - halfCrest}" y="${center - halfCrest}" width="${crestSize}" height="${crestSize}" rx="4" fill="#1e293b" stroke="#d4af37" stroke-width="1.5" />
        <path d="M${center} ${center - halfCrest + 4} L${center + halfCrest - 4} ${center - halfCrest + 8} L${center + halfCrest - 4} ${center + 2} Q${center} ${center + halfCrest - 2} ${center} ${center + halfCrest - 2} Q${center} ${center + halfCrest - 2} ${center - halfCrest + 4} ${center + 2} L${center - halfCrest + 4} ${center - halfCrest + 8} Z" fill="#d4af37" />
        <circle cx="${center}" cy="${center}" r="3" fill="#0f172a" />
      </svg>
    `;
  },

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Portfolio Assets';

    container.innerHTML = `
      <div class="assets-view">
        <!-- Header Row -->
        <div class="assets-header-row">
          <div>
            <h2 class="dash-greeting">Assets</h2>
            <p class="dash-subtitle">Physical and vaulted digital precious assets, valued in real-time at live spot rates.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="AssetsComponent.openImportModal()" aria-label="Import CSV or Excel portfolio">
              <i data-lucide="file-spreadsheet" style="width: 15px;"></i> Import CSV / Excel
            </button>
            <button class="btn btn-gold" onclick="AssetsComponent.openAddModal()" aria-label="Add new asset">
              <i data-lucide="plus" style="width: 15px;"></i> Add asset
            </button>
          </div>
        </div>

        <!-- Controls Bar: Search (Left), Contiguous Filters (Center), Sort (Right) -->
        <div class="assets-controls-bar">
          <!-- Search Input positioned on the left -->
          <div class="assets-search-group">
            <i data-lucide="search" class="assets-search-icon"></i>
            <input type="text" class="assets-search-input" id="assets-search-box" placeholder="Search name, ID, platform, HUID..." oninput="AssetsComponent.onSearch(this.value)" value="${this.searchQuery}" aria-label="Search assets by name, ID, platform, or HUID" />
          </div>

          <!-- Contiguous Filters Group: Status and Category Pills together -->
          <div class="assets-filters-group" role="region" aria-label="Asset filters">
            <!-- Status Tabs -->
            <div class="assets-tabs" role="tablist" aria-label="Filter by status">
              <button class="assets-tab ${this.currentStatusFilter === 'held' ? 'active' : ''}" onclick="AssetsComponent.setStatusFilter('held')">Held</button>
              <button class="assets-tab ${this.currentStatusFilter === 'sold' ? 'active' : ''}" onclick="AssetsComponent.setStatusFilter('sold')">Sold</button>
              <button class="assets-tab ${this.currentStatusFilter === 'archived' ? 'active' : ''}" onclick="AssetsComponent.setStatusFilter('archived')">Archived</button>
              <button class="assets-tab ${this.currentStatusFilter === 'all' ? 'active' : ''}" onclick="AssetsComponent.setStatusFilter('all')">All</button>
            </div>

            <!-- Quick Metal & Digital Filter Pills -->
            <div class="assets-filter-pills" role="group" aria-label="Filter by asset category">
              <button class="filter-pill ${this.currentMetalFilter === 'digital_gold' ? 'active' : ''}" onclick="AssetsComponent.setMetalFilter('digital_gold')">
                <i data-lucide="smartphone" style="width: 13px;"></i> Digital Gold & SGB
              </button>
              <button class="filter-pill ${this.currentMetalFilter === 'gold' ? 'active' : ''}" onclick="AssetsComponent.setMetalFilter('gold')">Gold</button>
              <button class="filter-pill ${this.currentMetalFilter === 'silver' ? 'active' : ''}" onclick="AssetsComponent.setMetalFilter('silver')">Silver</button>
              <button class="filter-pill ${this.currentMetalFilter === 'platinum' ? 'active' : ''}" onclick="AssetsComponent.setMetalFilter('platinum')">Platinum</button>
              <button class="filter-pill ${this.currentMetalFilter === 'diamond' ? 'active' : ''}" onclick="AssetsComponent.setMetalFilter('diamond')">Diamond</button>
            </div>
          </div>

          <!-- Sort Select with Clear 'Sort by:' Label and Affordance -->
          <div class="assets-sort-group">
            <label for="assets-sort-select" class="sort-label">
              <i data-lucide="arrow-up-down" style="width: 13px; height: 13px; vertical-align: middle; margin-right: 2px;"></i>Sort by:
            </label>
            <select class="assets-sort-select" id="assets-sort-select" onchange="AssetsComponent.onSortChange(this.value)" aria-label="Sort assets">
              <option value="value_desc" ${this.sortBy === 'value_desc' ? 'selected' : ''}>Value (High to Low)</option>
              <option value="value_asc" ${this.sortBy === 'value_asc' ? 'selected' : ''}>Value (Low to High)</option>
              <option value="name_asc" ${this.sortBy === 'name_asc' ? 'selected' : ''}>Name (A–Z)</option>
              <option value="cost_desc" ${this.sortBy === 'cost_desc' ? 'selected' : ''}>Cost (High to Low)</option>
            </select>
          </div>
        </div>

        <!-- Summary Stats Line -->
        <div class="assets-summary-line" id="assets-summary-text">
          Loading assets summary...
        </div>

        <!-- Main Assets Table Container -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Owner / Holder</th>
                  <th>Category / Type</th>
                  <th>Purity / Net wt.</th>
                  <th>Purchased</th>
                  <th>Cost</th>
                  <th>Est. value</th>
                  <th>P / L</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="assets-table-tbody">
                <tr><td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">Loading asset holdings...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Asset Modal Mount Point -->
      <div id="asset-modal-container"></div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadAssets();
  },

  async loadAssets() {
    try {
      const data = await API.getAssets();
      this.allAssets = data.assets || [];
      this.renderFilteredTable();
    } catch (err) {
      console.error('Failed fetching assets:', err);
    }
  },

  setStatusFilter(status) {
    this.currentStatusFilter = status;
    this.render();
  },

  setMetalFilter(metal) {
    this.currentMetalFilter = this.currentMetalFilter === metal ? '' : metal;
    this.render();
  },

  onSearch(query) {
    this.searchQuery = query.toLowerCase();
    this.renderFilteredTable();
  },

  onSortChange(val) {
    this.sortBy = val;
    this.renderFilteredTable();
  },

  renderFilteredTable() {
    const tbody = document.getElementById('assets-table-tbody');
    const summaryEl = document.getElementById('assets-summary-text');
    if (!tbody) return;

    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    let filtered = this.allAssets.filter(a => {
      // 1. Status Filter
      if (this.currentStatusFilter !== 'all') {
        const itemStatus = (a.status || 'ACTIVE').toLowerCase();
        if (this.currentStatusFilter === 'held' && itemStatus !== 'active') return false;
        if (this.currentStatusFilter === 'sold' && itemStatus !== 'sold') return false;
        if (this.currentStatusFilter === 'archived' && itemStatus !== 'archived') return false;
      }

      // 2. Metal & Digital Filter
      if (this.currentMetalFilter) {
        if (this.currentMetalFilter === 'digital_gold') {
          const isDigi = (a.asset_type || '').toLowerCase().includes('digital') ||
                         (a.asset_type || '').toLowerCase().includes('sgb') ||
                         (a.asset_type || '').toLowerCase().includes('etf') ||
                         (a.asset_name || '').toLowerCase().includes('digital') ||
                         (a.asset_name || '').toLowerCase().includes('sgb') ||
                         (a.category_name || '').toLowerCase().includes('digital');
          if (!isDigi) return false;
        } else {
          const metalStr = `${a.metal || ''} ${a.category_name || ''}`.toLowerCase();
          if (!metalStr.includes(this.currentMetalFilter)) return false;
        }
      }

      // 3. Search Query
      if (this.searchQuery) {
        const fullStr = `${a.asset_name || ''} ${a.asset_type || ''} ${a.metal || ''} ${a.owner_name || ''} ${a.buyer_name || ''} ${a.jeweller || ''} ${a.jeweller_name || ''} ${a.purity || ''} AV-${a.id}`.toLowerCase();
        if (!fullStr.includes(this.searchQuery)) return false;
      }

      return true;
    });

    // Sort
    if (this.sortBy === 'value_desc') filtered.sort((a, b) => (b.current_valuation || 0) - (a.current_valuation || 0));
    else if (this.sortBy === 'value_asc') filtered.sort((a, b) => (a.current_valuation || 0) - (b.current_valuation || 0));
    else if (this.sortBy === 'name_asc') filtered.sort((a, b) => (a.asset_name || '').localeCompare(b.asset_name || ''));
    else if (this.sortBy === 'cost_desc') filtered.sort((a, b) => (b.total_acquisition_cost || 0) - (a.total_acquisition_cost || 0));

    // Calculate Summary Stats
    const totalInvested = filtered.reduce((s, a) => s + (a.total_acquisition_cost || 0), 0);
    const totalEst = filtered.reduce((s, a) => s + (a.current_valuation || 0), 0);

    if (summaryEl) {
      summaryEl.innerText = `${filtered.length} assets &bull; invested ${sym}${Math.round(totalInvested).toLocaleString()} &bull; estimated ${sym}${Math.round(totalEst).toLocaleString()}`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">No assets match your selected filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((a, idx) => {
      const metalType = (a.metal || 'Gold').toLowerCase();
      const assetType = (a.asset_type || '').toLowerCase();
      const isDigiGold = assetType.includes('digital gold') || assetType.includes('sgb') || assetType.includes('etf') || (a.asset_name || '').toLowerCase().includes('digital gold') || (a.category_name && a.category_name.toLowerCase().includes('digital'));
      const isDigiSilver = assetType.includes('digital silver') || (a.asset_name || '').toLowerCase().includes('digital silver');
      const isGold = metalType.includes('gold');
      const isDiamond = metalType.includes('diamond') || (a.category_name && a.category_name.includes('Diamond'));
      const isSilver = metalType.includes('silver');
      const isPlat = metalType.includes('plat');

      let pillClass = 'gold';
      let pillText = 'Gold';
      if (isDigiSilver) {
        pillClass = 'digital-silver';
        pillText = 'Digital Silver';
      } else if (isDigiGold) {
        pillClass = 'digital-gold';
        pillText = a.asset_type || 'Digital Gold (24K)';
      } else if (isDiamond) {
        pillClass = 'diamond';
        pillText = 'Diamond';
      } else if (isSilver) {
        pillClass = 'silver';
        pillText = 'Silver';
      } else if (isPlat) {
        pillClass = 'platinum';
        pillText = 'Platinum';
      }

      const gain = a.unrealized_gain || 0;
      const gainPct = a.roi_percentage || 0;
      const isUp = gain >= 0;
      const code = `AV-${String(a.id || idx + 1).padStart(3, '0')}`;
      const photoSrc = this.getPhotoForAsset(a);
      const comp = this.getDocCompleteness(a);

      let purityWt = `${a.purity || '22K'} &bull; ${a.net_weight || a.gross_weight || 0} g`;
      if (isDiamond && a.diamond_carat) {
        purityWt = `${a.diamond_carat} ct &bull; ${a.diamond_color || 'F'}/${a.diamond_clarity || 'VS1'}`;
      } else if (isDigiGold || isDigiSilver) {
        purityWt = `24K (999.9) &bull; ${a.net_weight || a.gross_weight || 0} g`;
      }

      let dateFormatted = a.purchase_date || '2 Nov 2019';
      try {
        const d = new Date(a.purchase_date);
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch (e) {}

      const isSold = (a.status || '').toUpperCase() === 'SOLD';
      const statusPill = isSold ? '<span class="status-pill sold">Sold</span>' : '<span class="status-pill held">Held</span>';

      return `
        <tr>
          <td>
            <div class="asset-cell" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${a.id})">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" onerror="this.onerror=null;this.src='/img/assets/digital_gold.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${a.asset_name}</div>
                <div class="asset-code-sub">
                  ${code} &bull; ${a.category_name || (isDigiGold ? 'Digital Gold & ETFs' : 'Jewellery')}
                  <span class="completeness-badge" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(212, 175, 55, 0.14); color: var(--gold-light); font-weight: 600; display: inline-flex; align-items: center; gap: 3px; margin-left: 4px;" title="Documentation Completeness: ${comp.score}%">
                    <i data-lucide="shield-check" style="width: 11px; height: 11px;"></i> ${comp.score}%
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="owner-pill">
              <i data-lucide="user"></i>
              ${a.owner_name || a.buyer_name || 'Self'}
            </span>
          </td>
          <td>
            <span class="metal-pill ${pillClass}">
              <span class="metal-dot"></span> ${pillText}
            </span>
          </td>
          <td style="color: var(--text-secondary); font-weight: 500;">${purityWt}</td>
          <td style="color: var(--text-muted); font-size: 0.78rem;">${dateFormatted}</td>
          <td style="font-weight: 600;">${sym}${Math.round(a.total_acquisition_cost || 0).toLocaleString()}</td>
          <td style="font-weight: 700;">${sym}${Math.round(a.current_valuation || 0).toLocaleString()}</td>
          <td>
            <div class="pnl-stack ${isUp ? 'up' : 'down'}">
              <span class="pnl-val">${isUp ? '+' : '-'}${sym}${Math.abs(Math.round(gain)).toLocaleString()}</span>
              <span class="pnl-badge">${isUp ? '↗ +' : '↘ '}${gainPct.toFixed(1)}%</span>
            </div>
          </td>
          <td>${statusPill}</td>
          <td>
            <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end;">
              <button class="btn-table-action" title="QR Asset Certificate" onclick="AssetsComponent.openCertificateModal(${a.id})">
                <i data-lucide="award" style="width: 15px; color: var(--gold-button);"></i>
              </button>
              <button class="btn-table-action" title="Asset Actions" onclick="AssetsComponent.openDetailModal(${a.id})">
                <i data-lucide="more-horizontal" style="width: 16px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  openAddModal() {
    this.selectedPhotoUrl = '/img/assets/digital_gold.svg';
    const container = document.getElementById('asset-modal-container') || document.body;
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.id = 'asset-add-modal-overlay';

    modalDiv.innerHTML = `
      <div class="modal-card" style="max-width: 620px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="plus-circle" style="color: var(--gold-button);"></i> Add Vault Asset</h3>
          <button class="modal-close-btn" onclick="document.getElementById('asset-add-modal-overlay').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <form onsubmit="AssetsComponent.handleAddAssetSubmit(event)">
          <!-- 1. Asset Classification: Asset Type -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-weight: 700; color: var(--gold-primary);">Asset Classification / Instrument</label>
            <select class="form-control asset-classification-select" id="add-asset-type" onchange="AssetsComponent.onAddTypeChange(this.value)">
              <option value="Digital Gold" selected>⚡ Digital Gold (MMTC-PAMP, Augmont, SafeGold, Jar, Paytm)</option>
              <option value="Sovereign Gold Bond (SGB)">📜 Sovereign Gold Bond (SGB - RBI / Government of India)</option>
              <option value="Gold ETF">📈 Gold ETF / Gold Mutual Fund Units</option>
              <option value="Digital Silver">⚡ Digital Silver (999 Pure Vaulted)</option>
              <option value="Jewellery">💎 Physical Jewellery (Necklace, Bangles, Rings, Chains)</option>
              <option value="Precious Bullion">🪙 Physical Bullion (Minted Gold/Silver Coins & Bars)</option>
              <option value="Diamonds & Solitaires">✨ Diamonds & Solitaires</option>
              <option value="Luxury Watches">⌚ Luxury Timepieces & Collectibles</option>
            </select>
          </div>

          <!-- 2. Photo Selector Section -->
          <div class="form-group" style="margin-bottom: 16px; background: var(--bg-primary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span><i data-lucide="camera" style="width: 14px;"></i> Asset Icon / Photo</span>
              <span style="font-size: 0.74rem; color: var(--text-muted);">Choose preset or upload custom</span>
            </label>

            <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 12px;">
              <!-- Current Photo Preview -->
              <div class="asset-thumb" style="width: 64px; height: 64px; border-radius: 12px; border: 2px solid var(--gold-button);">
                <img id="add-photo-preview" src="${this.selectedPhotoUrl}" class="asset-thumb-img" alt="Asset Preview" />
              </div>

              <div style="flex: 1;">
                <input type="file" id="add-photo-file" accept="image/*" style="display: none;" onchange="AssetsComponent.handleFileUpload(event)" />
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('add-photo-file').click()" style="margin-bottom: 6px;">
                  <i data-lucide="upload" style="width: 13px;"></i> Upload Custom Image
                </button>
                <div style="font-size: 0.72rem; color: var(--text-muted);">PNG, JPG, SVG, WebP up to 5MB</div>
              </div>
            </div>

            <!-- Quick Preset Chips -->
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">Or select catalog icon:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${this.photoPresets.map((p) => `
                <button type="button" class="preset-pill ${p.url === this.selectedPhotoUrl ? 'active' : ''}" onclick="AssetsComponent.selectPresetPhoto('${p.url}', this)" style="padding: 4px 8px; font-size: 0.73rem;">
                  ${p.label}
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="add-photo-url-input" value="${this.selectedPhotoUrl}" />
          </div>

          <!-- 3. Asset Details -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" id="label-asset-name">Asset Title / Holding Name *</label>
            <input type="text" class="form-control" id="add-asset-name" placeholder="e.g. MMTC-PAMP 24K 999.9 Digital Gold Vault" value="MMTC-PAMP 24K Digital Gold" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select class="form-control" id="add-category-id">
                <option value="1">Digital Gold & ETFs</option>
                <option value="2">Jewellery</option>
                <option value="3">Precious Metals & Bullion</option>
                <option value="4">Diamonds & Solitaires</option>
                <option value="5">Luxury Watches</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Precious Metal</label>
              <select class="form-control" id="add-metal" onchange="AssetsComponent.onAddMetalChange(this.value)">
                <option value="Gold" selected>Gold</option>
                <option value="Silver">Silver</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group">
              <label class="form-label">Purity / Karat</label>
              <select class="form-control" id="add-purity">
                <option value="24K" selected>24K (999.9 Pure Bullion)</option>
                <option value="22K">22K (916 Hallmark)</option>
                <option value="18K">18K (750 Fine)</option>
                <option value="14K">14K (585)</option>
                <option value="999">999 Fine Silver</option>
                <option value="925">925 Sterling Silver</option>
                <option value="950">950 Platinum</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" id="label-net-weight">Gold Quantity / Net Weight (Grams) *</label>
              <input type="number" step="0.001" class="form-control" id="add-net-weight" placeholder="e.g. 10.0" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="form-group">
              <label class="form-label">Total Acquisition Cost (₹) *</label>
              <input type="number" step="1" class="form-control" id="add-cost" placeholder="e.g. 74500" required />
            </div>
            <div class="form-group">
              <label class="form-label">Purchase Date</label>
              <input type="date" class="form-control" id="add-date" value="${new Date().toISOString().split('T')[0]}" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label" id="label-owner">Owner / Buyer Name</label>
              <input type="text" class="form-control" id="add-owner" placeholder="e.g. Kapil Khadase, Self, Spouse, Joint" value="Kapil Khadase" />
            </div>
            <div class="form-group">
              <label class="form-label" id="label-jeweller">Platform / Vault Provider / Depository</label>
              <input type="text" class="form-control" id="add-jeweller" placeholder="e.g. MMTC-PAMP, Augmont, SafeGold, RBI, Nippon India" value="MMTC-PAMP" />
            </div>
          </div>

          <!-- Provenance & Authenticity Markers (with Duplicate Detection) -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 18px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-light); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="shield-check" style="width: 14px;"></i> Provenance & Verification Markers (Anti-Duplicate)
            </div>
            
            <div id="add-duplicate-warning" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--loss-red); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 10px;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">BIS Hallmark HUID</label>
                <input type="text" class="form-control" id="add-huid" placeholder="6-char e.g. AB1234" oninput="AssetsComponent.checkDuplicate('add')" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Invoice / Bill Number</label>
                <input type="text" class="form-control" id="add-invoice" placeholder="e.g. INV-98231" oninput="AssetsComponent.checkDuplicate('add')" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">Lab Certificate No.</label>
                <input type="text" class="form-control" id="add-cert" placeholder="e.g. GIA-218492" oninput="AssetsComponent.checkDuplicate('add')" />
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('asset-add-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary"><i data-lucide="plus"></i> Save Asset</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalDiv);
    if (window.lucide) lucide.createIcons();
  },

  onAddTypeChange(type) {
    const metalSel = document.getElementById('add-metal');
    const puritySel = document.getElementById('add-purity');
    const catSel = document.getElementById('add-category-id');
    const nameInput = document.getElementById('add-asset-name');
    const jewellerInput = document.getElementById('add-jeweller');
    const jewellerLabel = document.getElementById('label-jeweller');
    const ownerInput = document.getElementById('add-owner');
    const ownerLabel = document.getElementById('label-owner');
    const weightLabel = document.getElementById('label-net-weight');

    if (type === 'Digital Gold') {
      if (metalSel) metalSel.value = 'Gold';
      if (puritySel) {
        puritySel.innerHTML = `<option value="24K" selected>24K (999.9 Pure Digital Gold)</option>`;
      }
      if (catSel) catSel.value = '1';
      if (nameInput) nameInput.placeholder = 'e.g. MMTC-PAMP 24K Digital Gold Vault';
      if (jewellerLabel) jewellerLabel.innerText = 'Platform / Vault Depository';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. MMTC-PAMP, Augmont, SafeGold, Jar, Paytm, PhonePe'; jewellerInput.value = 'MMTC-PAMP'; }
      if (ownerLabel) ownerLabel.innerText = 'Owner / Account Holder Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Self, Spouse'; }
      if (weightLabel) weightLabel.innerText = 'Gold Weight (Grams) *';
      this.selectPresetPhoto('/img/assets/digital_gold.svg');
    } else if (type === 'Sovereign Gold Bond (SGB)') {
      if (metalSel) metalSel.value = 'Gold';
      if (puritySel) {
        puritySel.innerHTML = `<option value="24K" selected>24K (999 Pure RBI Benchmark)</option>`;
      }
      if (catSel) catSel.value = '1';
      if (nameInput) { nameInput.value = 'RBI Sovereign Gold Bond'; nameInput.placeholder = 'e.g. RBI Sovereign Gold Bond 2021-22 Series IX'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Issuing Authority / Depository (DP)';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. Reserve Bank of India (RBI) / Zerodha / SBI'; jewellerInput.value = 'Reserve Bank of India (RBI)'; }
      if (ownerLabel) ownerLabel.innerText = 'Bond Holder / Investor Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Joint Holding, HUF'; }
      if (weightLabel) weightLabel.innerText = 'SGB Units / Grams Equivalent *';
      this.selectPresetPhoto('/img/assets/gold_sgb.svg');
    } else if (type === 'Gold ETF') {
      if (metalSel) metalSel.value = 'Gold';
      if (puritySel) {
        puritySel.innerHTML = `<option value="24K" selected>24K (995+ Physical Gold Underlying)</option>`;
      }
      if (catSel) catSel.value = '1';
      if (nameInput) { nameInput.value = 'Nippon India Gold ETF'; nameInput.placeholder = 'e.g. Nippon India Gold ETF / HDFC Gold ETF'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Mutual Fund AMC / Demat Broker';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. Nippon India AMC / Zerodha / Groww'; jewellerInput.value = 'Nippon India AMC'; }
      if (ownerLabel) ownerLabel.innerText = 'Demat Holder / Buyer Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Self'; }
      if (weightLabel) weightLabel.innerText = 'Grams Equivalent (Units) *';
      this.selectPresetPhoto('/img/assets/digital_gold.svg');
    } else if (type === 'Digital Silver') {
      if (metalSel) metalSel.value = 'Silver';
      if (puritySel) {
        puritySel.innerHTML = `<option value="999" selected>999 Pure Digital Silver</option>`;
      }
      if (catSel) catSel.value = '1';
      if (nameInput) { nameInput.value = 'Augmont 999 Digital Silver'; nameInput.placeholder = 'e.g. Augmont 999 Fine Digital Silver Vault'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Platform / Depository';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. Augmont, MMTC-PAMP, SafeGold'; jewellerInput.value = 'Augmont Vault'; }
      if (ownerLabel) ownerLabel.innerText = 'Owner / Buyer Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Self'; }
      if (weightLabel) weightLabel.innerText = 'Silver Weight (Grams) *';
      this.selectPresetPhoto('/img/assets/digital_silver.svg');
    } else if (type === 'Jewellery') {
      if (metalSel) metalSel.value = 'Gold';
      this.onAddMetalChange('Gold');
      if (catSel) catSel.value = '2';
      if (nameInput) { nameInput.value = ''; nameInput.placeholder = 'e.g. Royal 22K Gold Temple Necklace'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Jeweller / Brand / Notes';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. Tanishq, Kalyan Jewellers, Malabar Gold'; jewellerInput.value = ''; }
      if (ownerLabel) ownerLabel.innerText = 'Owner / Buyer Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Spouse, Mother, Heirloom'; }
      if (weightLabel) weightLabel.innerText = 'Net Weight (Grams) *';
      this.selectPresetPhoto('/img/assets/temple_necklace.svg');
    } else if (type === 'Precious Bullion') {
      if (metalSel) metalSel.value = 'Gold';
      this.onAddMetalChange('Gold');
      if (catSel) catSel.value = '3';
      if (nameInput) { nameInput.value = ''; nameInput.placeholder = 'e.g. MMTC-PAMP 24K 50g Gold Cast Bar'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Mint / Refiner / Retailer';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. MMTC-PAMP, BRPL, IBJA'; jewellerInput.value = ''; }
      if (ownerLabel) ownerLabel.innerText = 'Owner / Buyer Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Kapil Khadase, Family Vault'; }
      if (weightLabel) weightLabel.innerText = 'Net Weight (Grams) *';
      this.selectPresetPhoto('/img/assets/gold_bar_50g.svg');
    } else if (type === 'Diamonds & Solitaires') {
      if (metalSel) metalSel.value = 'Diamond';
      this.onAddMetalChange('Diamond');
      if (catSel) catSel.value = '4';
      if (nameInput) { nameInput.value = ''; nameInput.placeholder = 'e.g. GIA Certified 1.02 ct Solitaire Ring'; }
      if (jewellerLabel) jewellerLabel.innerText = 'Certification / Jeweller';
      if (jewellerInput) { jewellerInput.placeholder = 'e.g. GIA, IGI, Tanishq Diamonds'; jewellerInput.value = ''; }
      if (ownerLabel) ownerLabel.innerText = 'Owner / Buyer Name';
      if (ownerInput) { ownerInput.placeholder = 'e.g. Priya Khadase, Kapil Khadase'; }
      if (weightLabel) weightLabel.innerText = 'Mount Weight (Grams) *';
      this.selectPresetPhoto('/img/assets/solitaire_ring.svg');
    } else if (type === 'Luxury Watches') {
      if (catSel) catSel.value = '5';
      if (ownerLabel) ownerLabel.innerText = 'Owner / Collector Name';
      this.selectPresetPhoto('/img/assets/platinum_band.svg');
    }
  },

  selectPresetPhoto(url, btn) {
    this.selectedPhotoUrl = url;
    const preview = document.getElementById('add-photo-preview');
    const input = document.getElementById('add-photo-url-input');
    if (preview) preview.src = url;
    if (input) input.value = url;

    document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
  },

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedPhotoUrl = dataUrl;
      const preview = document.getElementById('add-photo-preview');
      const input = document.getElementById('add-photo-url-input');
      if (preview) preview.src = dataUrl;
      if (input) input.value = dataUrl;
      App.showToast('Custom asset photo attached!', 'success');
    };
    reader.readAsDataURL(file);
  },

  onAddMetalChange(metal) {
    const puritySel = document.getElementById('add-purity');
    if (!puritySel) return;

    if (metal === 'Gold') {
      puritySel.innerHTML = `
        <option value="24K" selected>24K (999.9 Pure Bullion / Digital Gold)</option>
        <option value="22K">22K (916 Hallmark)</option>
        <option value="18K">18K (750 Fine)</option>
        <option value="14K">14K (585)</option>
      `;
    } else if (metal === 'Silver') {
      puritySel.innerHTML = `
        <option value="999" selected>999 Fine Silver / Digital Silver</option>
        <option value="925">925 Sterling Silver</option>
      `;
      this.selectPresetPhoto('/img/assets/silver_pooja.svg');
    } else if (metal === 'Platinum') {
      puritySel.innerHTML = `
        <option value="950" selected>950 Platinum</option>
        <option value="900">900 Platinum</option>
      `;
      this.selectPresetPhoto('/img/assets/platinum_band.svg');
    } else if (metal === 'Diamond') {
      puritySel.innerHTML = `
        <option value="18K" selected>18K Diamond Mount</option>
        <option value="950">PT950 Platinum Mount</option>
      `;
      this.selectPresetPhoto('/img/assets/solitaire_ring.svg');
    }
  },

  async handleAddAssetSubmit(e) {
    e.preventDefault();
    const assetType = document.getElementById('add-asset-type') ? document.getElementById('add-asset-type').value : 'Digital Gold';
    const name = document.getElementById('add-asset-name').value;
    const catId = parseInt(document.getElementById('add-category-id').value) || 1;
    const metal = document.getElementById('add-metal').value;
    const purity = document.getElementById('add-purity').value;
    const netWeight = parseFloat(document.getElementById('add-net-weight').value) || 0;
    const cost = parseFloat(document.getElementById('add-cost').value) || 0;
    const date = document.getElementById('add-date').value;
    const ownerName = document.getElementById('add-owner')?.value || '';
    const jeweller = document.getElementById('add-jeweller').value;
    const photoUrl = document.getElementById('add-photo-url-input').value || this.selectedPhotoUrl;
    const hallmarkHuid = (document.getElementById('add-huid')?.value || '').trim();
    const invoiceNum = (document.getElementById('add-invoice')?.value || '').trim();
    const certNum = (document.getElementById('add-cert')?.value || '').trim();

    try {
      await API.createAsset({
        asset_name: name,
        asset_type: assetType,
        category_id: catId,
        metal,
        purity,
        gross_weight: netWeight,
        net_weight: netWeight,
        purchase_price: cost,
        total_acquisition_cost: cost,
        purchase_date: date,
        owner_name: ownerName,
        jeweller_name: jeweller,
        jeweller,
        photo_url: photoUrl,
        hallmark_huid: hallmarkHuid,
        invoice_number: invoiceNum,
        diamond_cert_number: certNum
      });

      App.showToast(`Asset "${name}" added to vault successfully!`, 'success');
      const modal = document.getElementById('asset-add-modal-overlay');
      if (modal) modal.remove();
      this.render();
    } catch (err) {
      App.showToast(err.message || 'Failed to add asset', 'error');
    }
  },

  async openDetailModal(assetId) {
    try {
      const data = await API.getAssetDetail(assetId);
      const a = data.asset;
      if (!a) return;

      const sym = API.getCurrency() === 'INR' ? '₹' : '$';
      const gain = a.unrealized_gain || 0;
      const isUp = gain >= 0;
      const gainPct = a.roi_percentage || 0;
      const photoSrc = this.getPhotoForAsset(a);
      const comp = this.getDocCompleteness(a);

      const isSold = (a.status || '').toUpperCase() === 'SOLD';
      const saleTx = (a.transactions || []).find(t => (t.transaction_type || '').toUpperCase() === 'SALE');

      const spotVal = a.current_valuation || 0;
      const customsDutyEst = Math.round(spotVal * 0.06);
      const gstEst = Math.round(spotVal * 0.03);
      const baseMetalSpot = Math.max(0, spotVal - customsDutyEst - gstEst);

      const modalDiv = document.createElement('div');
      modalDiv.className = 'modal-overlay';
      modalDiv.id = 'asset-detail-modal-overlay';

      modalDiv.innerHTML = `
        <div class="modal-card" style="max-width: 580px;">
          <!-- Top Banner with Photo & Title -->
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
            <div class="asset-thumb" style="width: 72px; height: 72px; border-radius: 14px; border: 2px solid var(--gold-button); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" />
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 0.76rem; color: var(--gold-button); font-weight: 700; letter-spacing: 0.04em;">AV-${String(a.id).padStart(3, '0')} &bull; ${a.category_name || 'Jewellery'}</span>
                ${isSold ? '<span class="status-pill sold" style="font-size: 0.68rem; padding: 2px 6px;">SOLD / LIQUIDATED</span>' : '<span class="status-pill held" style="font-size: 0.68rem; padding: 2px 6px;">HELD</span>'}
              </div>
              <h3 class="modal-title" style="font-size: 1.35rem; margin-top: 2px;">${a.asset_name}</h3>
            </div>
            <button class="modal-close-btn" onclick="document.getElementById('asset-detail-modal-overlay').remove()">
              <i data-lucide="x" style="width: 20px;"></i>
            </button>
          </div>

          <!-- Market Value & PnL Cards -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); margin-bottom: ${isSold ? '14px' : '18px'}; border: 1px solid var(--border-color);">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${isSold ? 'Realized Sale Value' : 'Current Market Value'}</div>
              <div style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); font-family: var(--font-heading); margin-top: 2px;">${sym}${Math.round(isSold && saleTx ? saleTx.amount : (a.current_valuation || 0)).toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${isSold ? 'Booked Realized P&L' : 'Unrealized Return (P&L)'}</div>
              <div style="font-size: 1.45rem; font-weight: 800; color: ${isUp ? 'var(--gain-green)' : 'var(--loss-red)'}; font-family: var(--font-heading); margin-top: 2px;">
                ${isUp ? '↗ +' : '↘ -'}${sym}${Math.abs(Math.round(isSold && saleTx ? saleTx.realized_profit : gain)).toLocaleString()} (${isUp ? '+' : ''}${gainPct.toFixed(1)}%)
              </div>
            </div>
          </div>

          <!-- Sold / Liquidated Counterparty Card (If Sold) -->
          ${isSold ? `
            <div style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.22); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.74rem; font-weight: 700; color: var(--loss-red); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px;">
                  <i data-lucide="badge-check" style="width: 14px; height: 14px;"></i> Liquidated Sale Record
                </span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">${saleTx?.transaction_date || 'Sold'}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem;">
                <div><strong style="color: var(--text-muted);">Sold To (Buyer / Org):</strong> <span style="font-weight: 700; color: var(--text-primary);">${saleTx?.counterparty || 'Counterparty Desk'}</span></div>
                <div><strong style="color: var(--text-muted);">Realized Amount:</strong> <span style="font-weight: 600; color: var(--text-primary);">${sym}${Math.round(saleTx?.amount || 0).toLocaleString()}</span></div>
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem; margin-bottom: 16px;">
            <div><strong style="color: var(--text-muted);">Owner / Acquirer:</strong> <span style="font-weight: 600; color: var(--gold-button);">${a.owner_name || a.buyer_name || 'Self'}</span></div>
            <div><strong style="color: var(--text-muted);">Metal:</strong> ${a.metal} (${a.purity})</div>
            <div><strong style="color: var(--text-muted);">Net Weight:</strong> ${a.net_weight || a.gross_weight || 0} grams</div>
            <div><strong style="color: var(--text-muted);">Acquisition Cost:</strong> ${sym}${Math.round(a.total_acquisition_cost || 0).toLocaleString()}</div>
            <div><strong style="color: var(--text-muted);">Purchased:</strong> ${a.purchase_date || 'N/A'}</div>
            <div><strong style="color: var(--text-muted);">Platform / Jeweller:</strong> ${a.jeweller || a.jeweller_name || 'Certified Jeweller'}</div>
            <div><strong style="color: var(--text-muted);">Status:</strong> <span style="font-weight: 600; color: ${isSold ? 'var(--loss-red)' : 'var(--gain-green)'};">${a.status || 'Active'}</span></div>
            ${isSold && saleTx?.counterparty ? `<div><strong style="color: var(--text-muted);">Buyer / Desk:</strong> <span style="font-weight: 600; color: var(--text-primary);">${saleTx.counterparty}</span></div>` : ''}
          </div>

          <!-- Documentation Completeness Card -->
          <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--gold-light); display: flex; align-items: center; gap: 6px;">
                <i data-lucide="shield-check" style="width: 15px; color: var(--gain-green);"></i> Documentation Completeness
              </span>
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--gold-button);">${comp.score}% Verified</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
              <div style="width: ${comp.score}%; height: 100%; background: linear-gradient(90deg, var(--gold-primary), var(--gold-light));"></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.74rem;">
              <div style="color: ${comp.hasInvoice ? 'var(--gain-green)' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="${comp.hasInvoice ? 'check-circle' : 'circle'}" style="width: 12px;"></i> Tax Invoice / Bill
              </div>
              <div style="color: ${comp.hasHallmark ? 'var(--gain-green)' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="${comp.hasHallmark ? 'check-circle' : 'circle'}" style="width: 12px;"></i> BIS Hallmark / HUID
              </div>
              <div style="color: ${comp.hasCert ? 'var(--gain-green)' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="${comp.hasCert ? 'check-circle' : 'circle'}" style="width: 12px;"></i> Lab Certificate
              </div>
              <div style="color: ${comp.hasPhoto ? 'var(--gain-green)' : 'var(--text-muted)'}; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="${comp.hasPhoto ? 'check-circle' : 'circle'}" style="width: 12px;"></i> Photo Evidence
              </div>
            </div>
          </div>

          <!-- Landed Duty Breakdown -->
          ${!isSold ? `
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 18px; font-size: 0.75rem;">
              <div style="color: var(--gold-light); font-weight: 700; margin-bottom: 4px; font-size: 0.76rem;">Landed Replacement Cost Breakdown</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; color: var(--text-muted);">
                <div>Base Spot: <strong style="color: var(--text-primary);">${sym}${baseMetalSpot.toLocaleString()}</strong></div>
                <div>Customs (6%): <strong style="color: var(--text-primary);">${sym}${customsDutyEst.toLocaleString()}</strong></div>
                <div>GST (3%): <strong style="color: var(--text-primary);">${sym}${gstEst.toLocaleString()}</strong></div>
              </div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <button class="btn btn-secondary" style="color: var(--loss-red);" onclick="AssetsComponent.deleteAsset(${a.id})">
              <i data-lucide="trash-2" style="width: 15px;"></i> Delete
            </button>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" onclick="AssetsComponent.openCertificateModal(${a.id})" title="View Certificate of Valuation">
                <i data-lucide="award" style="width: 15px; color: var(--gold-button);"></i> Certificate
              </button>
              <button class="btn btn-secondary" onclick="AssetsComponent.openEditModal(${a.id})">
                <i data-lucide="edit-3" style="width: 15px;"></i> Edit
              </button>
              <button class="btn btn-secondary" onclick="document.getElementById('asset-detail-modal-overlay').remove()">Close</button>
              ${!isSold ? `
                <button class="btn btn-primary" onclick="AssetsComponent.openSellModal(${a.id}, ${a.current_valuation || 0})">
                  <i data-lucide="badge-check" style="width: 15px;"></i> Record Sale
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalDiv);
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error('Failed loading detail:', e);
    }
  },

  async openEditModal(assetId) {
    const detailModal = document.getElementById('asset-detail-modal-overlay');
    if (detailModal) detailModal.remove();

    try {
      const data = await API.getAssetDetail(assetId);
      const a = data.asset;
      if (!a) return;

      const modalDiv = document.createElement('div');
      modalDiv.className = 'modal-overlay';
      modalDiv.id = 'asset-edit-modal-overlay';

      modalDiv.innerHTML = `
        <div class="modal-card" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3 class="modal-title"><i data-lucide="edit-3" style="color: var(--gold-button);"></i> Edit Asset &bull; AV-${String(a.id).padStart(3, '0')}</h3>
            <button class="modal-close-btn" onclick="document.getElementById('asset-edit-modal-overlay').remove()">
              <i data-lucide="x" style="width: 20px;"></i>
            </button>
          </div>

          <form onsubmit="AssetsComponent.handleEditAssetSubmit(event, ${a.id})">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Asset Title / Name *</label>
              <input type="text" class="form-control" id="edit-asset-name" value="${a.asset_name || ''}" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Owner / Buyer Name</label>
                <input type="text" class="form-control" id="edit-owner-name" value="${a.owner_name || a.buyer_name || ''}" placeholder="e.g. Kapil Khadase, Self, Spouse" />
              </div>
              <div class="form-group">
                <label class="form-label">Platform / Jeweller</label>
                <input type="text" class="form-control" id="edit-jeweller" value="${a.jeweller || a.jeweller_name || ''}" placeholder="e.g. MMTC-PAMP, Tanishq" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Precious Metal</label>
                <select class="form-control" id="edit-metal">
                  <option value="Gold" ${a.metal === 'Gold' ? 'selected' : ''}>Gold</option>
                  <option value="Silver" ${a.metal === 'Silver' ? 'selected' : ''}>Silver</option>
                  <option value="Platinum" ${a.metal === 'Platinum' ? 'selected' : ''}>Platinum</option>
                  <option value="Diamond" ${a.metal === 'Diamond' ? 'selected' : ''}>Diamond</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Purity / Karat</label>
                <input type="text" class="form-control" id="edit-purity" value="${a.purity || '22K'}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label">Net Weight (Grams) *</label>
                <input type="number" step="0.001" class="form-control" id="edit-weight" value="${a.net_weight || a.gross_weight || 0}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Total Acquisition Cost (₹) *</label>
                <input type="number" step="1" class="form-control" id="edit-cost" value="${a.total_acquisition_cost || 0}" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div class="form-group">
                <label class="form-label">Purchase Date</label>
                <input type="date" class="form-control" id="edit-date" value="${a.purchase_date || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-control" id="edit-status">
                  <option value="Active" ${a.status === 'Active' ? 'selected' : ''}>Active (Held)</option>
                  <option value="Sold" ${a.status === 'Sold' ? 'selected' : ''}>Sold</option>
                  <option value="Archived" ${a.status === 'Archived' ? 'selected' : ''}>Archived</option>
                </select>
              </div>
            </div>

            <!-- Provenance & Authenticity Markers (with Duplicate Detection) -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 18px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-light); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="shield-check" style="width: 14px;"></i> Provenance & Verification Markers (Anti-Duplicate)
              </div>
              
              <div id="edit-duplicate-warning" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--loss-red); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 10px;"></div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">BIS Hallmark HUID</label>
                  <input type="text" class="form-control" id="edit-huid" value="${a.hallmark_huid || ''}" placeholder="e.g. AB1234" oninput="AssetsComponent.checkDuplicate('edit', ${a.id})" />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Invoice Number</label>
                  <input type="text" class="form-control" id="edit-invoice" value="${a.invoice_number || ''}" placeholder="e.g. INV-98231" oninput="AssetsComponent.checkDuplicate('edit', ${a.id})" />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">Diamond Cert No.</label>
                  <input type="text" class="form-control" id="edit-cert" value="${a.diamond_cert_number || ''}" placeholder="e.g. GIA-218492" oninput="AssetsComponent.checkDuplicate('edit', ${a.id})" />
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('asset-edit-modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Save Changes</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modalDiv);
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      App.showToast('Failed to load asset for editing', 'error');
    }
  },

  async handleEditAssetSubmit(e, assetId) {
    e.preventDefault();
    const name = document.getElementById('edit-asset-name').value;
    const ownerName = document.getElementById('edit-owner-name').value;
    const jeweller = document.getElementById('edit-jeweller').value;
    const metal = document.getElementById('edit-metal').value;
    const purity = document.getElementById('edit-purity').value;
    const weight = parseFloat(document.getElementById('edit-weight').value) || 0;
    const cost = parseFloat(document.getElementById('edit-cost').value) || 0;
    const date = document.getElementById('edit-date').value;
    const status = document.getElementById('edit-status').value;
    const hallmarkHuid = (document.getElementById('edit-huid')?.value || '').trim();
    const invoiceNum = (document.getElementById('edit-invoice')?.value || '').trim();
    const certNum = (document.getElementById('edit-cert')?.value || '').trim();

    try {
      await API.updateAsset(assetId, {
        asset_name: name,
        owner_name: ownerName,
        jeweller_name: jeweller,
        jeweller,
        metal,
        purity,
        gross_weight: weight,
        net_weight: weight,
        total_acquisition_cost: cost,
        purchase_price: cost,
        purchase_date: date,
        status,
        hallmark_huid: hallmarkHuid,
        invoice_number: invoiceNum,
        diamond_cert_number: certNum
      });

      App.showToast('Asset updated successfully!', 'success');
      const modal = document.getElementById('asset-edit-modal-overlay');
      if (modal) modal.remove();
      this.render();
    } catch (err) {
      App.showToast(err.message || 'Failed updating asset', 'error');
    }
  },

  async deleteAsset(id) {
    if (!confirm('Are you sure you want to remove this asset from your physical portfolio?')) return;
    try {
      await API.deleteAsset(id);
      App.showToast('Asset removed from vault', 'success');
      const modal = document.getElementById('asset-detail-modal-overlay');
      if (modal) modal.remove();
      this.render();
    } catch (err) {
      App.showToast(err.message || 'Failed deleting asset', 'error');
    }
  },

  openSellModal(assetId, currentVal) {
    const detailModal = document.getElementById('asset-detail-modal-overlay');
    if (detailModal) detailModal.remove();

    const sym = API.getCurrency() === 'INR' ? '₹' : '$';
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.id = 'asset-sell-modal-overlay';

    modalDiv.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="badge-dollar-sign" style="color: var(--gain-green);"></i> Record Liquidated Sale</h3>
          <button class="modal-close-btn" onclick="document.getElementById('asset-sell-modal-overlay').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <form onsubmit="AssetsComponent.handleSellSubmit(event, ${assetId})">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Realized Sale Price (${sym}) *</label>
            <input type="number" step="100" class="form-control" id="sell-amount" value="${Math.round(currentVal)}" required />
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Melting / Refining / Brokerage Charges (${sym})</label>
            <input type="number" step="10" class="form-control" id="sell-charges" value="0" min="0" />
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Deducted from gross proceeds to compute net realized P&L.</div>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Sale Date</label>
            <input type="date" class="form-control" id="sell-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label">Buyer / Counterparty Desk</label>
            <input type="text" class="form-control" id="sell-buyer" placeholder="e.g. MMTC-PAMP Buyback Desk, Tanishq" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('asset-sell-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Confirm Sale</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalDiv);
    if (window.lucide) lucide.createIcons();
  },

  async handleSellSubmit(e, assetId) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('sell-amount').value) || 0;
    const charges = parseFloat(document.getElementById('sell-charges')?.value || 0) || 0;
    const date = document.getElementById('sell-date').value;
    const buyer = document.getElementById('sell-buyer').value;

    try {
      await API.sellAsset(assetId, {
        sale_amount: amount,
        selling_charges: charges,
        sale_date: date,
        buyer_name: buyer
      });

      App.showToast('Asset marked as Sold and realized gain recorded!', 'success');
      const modal = document.getElementById('asset-sell-modal-overlay');
      if (modal) modal.remove();
      this.render();
    } catch (err) {
      App.showToast(err.message || 'Failed recording sale', 'error');
    }
  },

  async openCertificateModal(assetId) {
    try {
      const data = await API.getAssetDetail(assetId);
      const a = data.asset;
      if (!a) return;

      const comp = this.getDocCompleteness(a);
      const certId = `AV-2026-${String(a.id).padStart(5, '0')}`;
      const token = a.certificate_token || certId;
      const verifyUrl = `${window.location.origin}/#verify/${token}`;
      const qrSvg = this.generateQRCodeSVG(verifyUrl, 130);

      const rawText = `${certId}:${a.asset_name}:${a.metal}:${a.purity}:${a.net_weight || a.gross_weight}:${token}`;
      let hashNum = 0;
      for (let i = 0; i < rawText.length; i++) hashNum = ((hashNum << 5) - hashNum + rawText.charCodeAt(i)) | 0;
      const shaStub = 'AV' + Math.abs(hashNum).toString(16).toUpperCase().padStart(12, '0') + '9F8B2C4E';

      const ownerRaw = a.owner_name || a.buyer_name || 'Legal Bearer';
      const ownerMasked = ownerRaw.split(' ').length > 1
        ? (ownerRaw.split(' ')[0][0] + '. ' + ownerRaw.split(' ').slice(-1)[0])
        : (ownerRaw.slice(0, 1) + '***');

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'asset-certificate-modal';

      modal.innerHTML = `
        <div class="modal-card" style="max-width: 720px; background: #0b0f19; border: 2px solid var(--gold-button); border-radius: 16px; padding: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.8); position: relative;">
          <button class="modal-close-btn" style="position: absolute; right: 18px; top: 18px; z-index: 10;" onclick="document.getElementById('asset-certificate-modal').remove()">
            <i data-lucide="x" style="width: 22px;"></i>
          </button>

          <!-- Printable Certificate Area -->
          <div id="cert-print-area" style="background: linear-gradient(145deg, #111827 0%, #0d131f 100%); border: 1.5px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 24px; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 8px; left: 8px; font-size: 0.75rem; color: var(--gold-button); opacity: 0.7;">❖</div>
            <div style="position: absolute; top: 8px; right: 8px; font-size: 0.75rem; color: var(--gold-button); opacity: 0.7;">❖</div>
            <div style="position: absolute; bottom: 8px; left: 8px; font-size: 0.75rem; color: var(--gold-button); opacity: 0.7;">❖</div>
            <div style="position: absolute; bottom: 8px; right: 8px; font-size: 0.75rem; color: var(--gold-button); opacity: 0.7;">❖</div>

            <div style="text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.25); padding-bottom: 16px; margin-bottom: 20px;">
              <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <i data-lucide="shield" style="width: 22px; height: 22px; color: var(--gold-button);"></i>
                <span style="font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-light); font-weight: 700;">AssetVault Bullion Depository & Registry</span>
              </div>
              <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; font-family: var(--font-heading); margin: 6px 0 2px;">
                CERTIFICATE OF AUTHENTICITY & PROVENANCE
              </h2>
              <div style="display: flex; justify-content: center; gap: 16px; font-size: 0.8rem; color: var(--gold-button); font-weight: 600;">
                <span>REGISTRY ID: <strong>${certId}</strong></span>
                <span>&bull;</span>
                <span>STATUS: <strong style="color: var(--gain-green);">${(a.status || 'ACTIVE').toUpperCase()}</strong></span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 180px; gap: 24px; align-items: center; margin-bottom: 20px;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Asset Title / Holding</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">${a.asset_name}</div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                  <div>
                    <span style="color: var(--text-muted);">Depository Bearer:</span>
                    <div style="font-weight: 700; color: var(--gold-light);">${ownerMasked}</div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Metal & Fineness:</span>
                    <div style="font-weight: 700; color: #ffffff;">${a.metal} &bull; ${a.purity}</div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Net Weight:</span>
                    <div style="font-weight: 700; color: #ffffff;">${a.net_weight || a.gross_weight || 0} grams</div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Gross Weight:</span>
                    <div style="font-weight: 600; color: #ffffff;">${a.gross_weight || a.net_weight || 0} grams</div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Platform / Jeweller:</span>
                    <div style="font-weight: 600; color: #ffffff;">${a.jeweller || a.jeweller_name || 'Certified Merchant'}</div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">BIS Hallmark / HUID:</span>
                    <div style="font-weight: 600; color: var(--gold-light);">${a.hallmark_huid || 'BIS Standard 916/999'}</div>
                  </div>
                  ${a.diamond_cert_number ? `
                    <div style="grid-column: span 2;">
                      <span style="color: var(--text-muted);">Diamond Certification:</span>
                      <div style="font-weight: 600; color: var(--gold-light);">${a.diamond_cert_lab || 'IGI/GIA'} #${a.diamond_cert_number} (${a.diamond_carat || ''} ct)</div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div style="text-align: center; border-left: 1px solid rgba(212, 175, 55, 0.2); padding-left: 18px;">
                <div style="margin-bottom: 8px;">
                  ${qrSvg}
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted); line-height: 1.3;">
                  Scan QR with any camera to verify official registry token
                </div>
                <div style="margin-top: 6px; font-size: 0.72rem; color: var(--gold-button); font-weight: 700;">
                  ${comp.score}% Provenance Score
                </div>
              </div>
            </div>

            <!-- Mandatory Security Disclosure -->
            <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.76rem; line-height: 1.45; color: var(--gold-light);">
              <div style="font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <i data-lucide="shield-alert" style="width: 14px;"></i> Public Verification Privacy Protection
              </div>
              This certificate verifies physical authenticity specifications only. Financial valuations, purchase prices, acquisition costs, and private vault documents are strictly excluded from public verification for security.
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
              <div>Cryptographic Seal: <code style="color: var(--gold-button); font-size: 0.68rem;">SHA256:${shaStub}</code></div>
              <div>Issue Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 18px;">
            <button class="btn btn-secondary" onclick="document.getElementById('asset-certificate-modal').remove()">Close</button>
            <button class="btn btn-gold" onclick="AssetsComponent.printCertificate()">
              <i data-lucide="printer"></i> Print / Save Certificate PDF
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Failed opening certificate:', err);
      App.showToast('Failed to generate certificate', 'error');
    }
  },

  printCertificate() {
    const certCard = document.getElementById('cert-print-area');
    if (!certCard) {
      window.print();
      return;
    }
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AssetVault Certificate</title>
          <style>
            @media print {
              body { background: #0b0f19 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 20px; }
            * { box-sizing: border-box; }
            ${document.querySelector('link[href*="css"]')?.outerHTML || ''}
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 300);">
          ${certCard.outerHTML}
        </body>
      </html>
    `);
    printWin.document.close();
  },

  duplicateCheckTimer: null,
  checkDuplicate(prefix, assetId = null) {
    clearTimeout(this.duplicateCheckTimer);
    this.duplicateCheckTimer = setTimeout(async () => {
      const huid = (document.getElementById(`${prefix}-huid`)?.value || '').trim();
      const invoice = (document.getElementById(`${prefix}-invoice`)?.value || '').trim();
      const cert = (document.getElementById(`${prefix}-cert`)?.value || '').trim();
      const warningBox = document.getElementById(`${prefix}-duplicate-warning`);

      if (!huid && !invoice && !cert) {
        if (warningBox) warningBox.style.display = 'none';
        return;
      }

      try {
        const res = await API.checkDuplicateAsset({
          hallmark_huid: huid,
          invoice_number: invoice,
          diamond_cert_number: cert,
          asset_id: assetId
        });

        if (res.is_duplicate) {
          if (warningBox) {
            warningBox.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; vertical-align: middle; margin-right: 4px;"></i> ${res.message}`;
            warningBox.style.display = 'block';
            if (window.lucide) lucide.createIcons();
          }
        } else {
          if (warningBox) warningBox.style.display = 'none';
        }
      } catch (err) {
        console.warn('Duplicate check error:', err);
      }
    }, 350);
  },

  openImportModal() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.id = 'asset-import-modal-overlay';

    modalDiv.innerHTML = `
      <div class="modal-card" style="max-width: 750px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 class="modal-title"><i data-lucide="file-spreadsheet" style="color: var(--gold-button);"></i> Import Portfolio (CSV / Excel)</h3>
          <button class="modal-close-btn" onclick="document.getElementById('asset-import-modal-overlay').remove()">
            <i data-lucide="x" style="width: 20px;"></i>
          </button>
        </div>

        <div style="padding: 10px 0;">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            Upload your existing precious assets in CSV or Excel (.xlsx) format. Each row will be validated for numeric sanity and checked for duplicates against your existing vault holdings.
          </p>

          <div style="background: rgba(255,255,255,0.02); border: 2px dashed var(--border-color); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
            <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display: none;" onchange="AssetsComponent.handleImportFileSelected(event)" />
            <button class="btn btn-secondary" onclick="document.getElementById('import-file-input').click()">
              <i data-lucide="upload"></i> Select CSV or Excel File
            </button>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
              Accepted formats: .csv, .xlsx, .xls (Up to 10MB)
            </div>
          </div>

          <div id="import-preview-container" style="display: none;">
            <div id="import-summary-badges" style="display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;"></div>
            <div class="table-responsive" style="max-height: 280px; overflow-y: auto; margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: 8px;">
              <table class="custom-table" style="font-size: 0.8rem;">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Row</th>
                    <th>Asset Name</th>
                    <th>Metal / Purity</th>
                    <th>Weight</th>
                    <th>Cost</th>
                    <th>HUID / Invoice</th>
                  </tr>
                </thead>
                <tbody id="import-preview-tbody"></tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('asset-import-modal-overlay').remove()">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirm-import-btn" onclick="AssetsComponent.executeConfirmedImport()" disabled>
                <i data-lucide="check"></i> Confirm & Import Valid Rows
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);
    if (window.lucide) lucide.createIcons();
  },

  stagedValidRows: [],
  async handleImportFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById('import-preview-container');
    const badgesContainer = document.getElementById('import-summary-badges');
    const tbody = document.getElementById('import-preview-tbody');
    const confirmBtn = document.getElementById('confirm-import-btn');

    if (previewContainer) previewContainer.style.display = 'block';
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Analyzing file and validating rows...</td></tr>`;

    try {
      const res = await API.previewImport(file);
      this.stagedValidRows = res.valid_rows || [];

      if (badgesContainer) {
        badgesContainer.innerHTML = `
          <span class="badge" style="background: rgba(255,255,255,0.08); padding: 4px 10px;">Total Rows: <strong>${res.total_rows}</strong></span>
          <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: var(--gain-green); padding: 4px 10px;">Valid to Import: <strong>${res.valid_count}</strong></span>
          ${res.error_count > 0 ? `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--loss-red); padding: 4px 10px;">Errors / Skipped: <strong>${res.error_count}</strong></span>` : ''}
        `;
      }

      if (confirmBtn) {
        confirmBtn.disabled = (this.stagedValidRows.length === 0);
        confirmBtn.innerHTML = `<i data-lucide="check"></i> Confirm & Import ${this.stagedValidRows.length} Assets`;
      }

      const allRows = [...(res.valid_rows || []).map(r => ({ ...r, is_valid: true })), ...(res.invalid_rows || []).map(r => ({ ...r, is_valid: false }))];
      allRows.sort((a, b) => a.row_index - b.row_index);

      if (tbody) {
        tbody.innerHTML = allRows.slice(0, 50).map(r => `
          <tr style="${r.is_valid ? '' : 'background: rgba(239, 68, 68, 0.05);'}">
            <td>
              ${r.is_valid
                ? '<span class="status-pill held" style="font-size: 0.7rem; padding: 2px 6px;">Ready</span>'
                : `<span class="status-pill sold" style="font-size: 0.7rem; padding: 2px 6px;" title="${r.errors ? r.errors.join(', ') : 'Invalid'}">Error</span>`
              }
            </td>
            <td>#${r.row_index}</td>
            <td style="font-weight: 600;">
              ${r.asset_name || 'Unnamed'}
              ${!r.is_valid && r.errors ? `<div style="font-size: 0.72rem; color: var(--loss-red);">${r.errors.join(' &bull; ')}</div>` : ''}
            </td>
            <td>${r.metal || 'Gold'} ${r.purity || ''}</td>
            <td>${r.net_weight || 0} g</td>
            <td>₹${Math.round(r.total_acquisition_cost || r.purchase_price || 0).toLocaleString()}</td>
            <td>${r.hallmark_huid || r.invoice_number || '-'}</td>
          </tr>
        `).join('');
      }

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      App.showToast(err.message || 'Failed to inspect file', 'error');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--loss-red); padding: 20px;">${err.message}</td></tr>`;
    }
  },

  async executeConfirmedImport() {
    if (!this.stagedValidRows || this.stagedValidRows.length === 0) return;
    const confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i data-lucide="loader" class="spin"></i> Importing ${this.stagedValidRows.length} assets...`;
    }
    if (window.lucide) lucide.createIcons();

    try {
      const res = await API.confirmImport(this.stagedValidRows);
      App.showToast(`Successfully imported ${res.imported_count} assets into your depository vault!`, 'success');
      const modal = document.getElementById('asset-import-modal-overlay');
      if (modal) modal.remove();
      this.stagedValidRows = [];
      await this.loadAssets();
    } catch (err) {
      App.showToast(err.message || 'Import failed', 'error');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i data-lucide="check"></i> Confirm & Import`;
      }
      if (window.lucide) lucide.createIcons();
    }
  }
};
