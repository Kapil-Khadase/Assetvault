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
          <button class="btn btn-gold" onclick="AssetsComponent.openAddModal()" aria-label="Add new asset">
            <i data-lucide="plus" style="width: 15px;"></i> Add asset
          </button>
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
                  <th>Asset</th>
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
                <tr><td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">Loading asset holdings...</td></tr>
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
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No assets match your selected filter criteria.</td></tr>`;
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
      const ownerDisplay = a.owner_name || a.buyer_name ? ` &bull; <span style="color: var(--gold-button); font-weight: 500;"><i data-lucide="user" style="width: 11px; height: 11px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i>${a.owner_name || a.buyer_name}</span>` : '';

      return `
        <tr>
          <td>
            <div class="asset-cell" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${a.id})">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" onerror="this.onerror=null;this.src='/img/assets/digital_gold.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${a.asset_name}</div>
                <div class="asset-code-sub">${code} &bull; ${a.category_name || (isDigiGold ? 'Digital Gold & ETFs' : 'Jewellery')}${ownerDisplay}</div>
              </div>
            </div>
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
            <button class="btn-table-action" title="Asset Actions" onclick="AssetsComponent.openDetailModal(${a.id})">
              <i data-lucide="more-horizontal" style="width: 16px;"></i>
            </button>
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

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
            <div class="form-group">
              <label class="form-label" id="label-owner">Owner / Buyer Name</label>
              <input type="text" class="form-control" id="add-owner" placeholder="e.g. Kapil Khadase, Self, Spouse, Joint" value="Kapil Khadase" />
            </div>
            <div class="form-group">
              <label class="form-label" id="label-jeweller">Platform / Vault Provider / Depository</label>
              <input type="text" class="form-control" id="add-jeweller" placeholder="e.g. MMTC-PAMP, Augmont, SafeGold, RBI, Nippon India" value="MMTC-PAMP" />
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
        photo_url: photoUrl
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

      const isSold = (a.status || '').toUpperCase() === 'SOLD';
      const saleTx = (a.transactions || []).find(t => (t.transaction_type || '').toUpperCase() === 'SALE');

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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); margin-bottom: ${isSold ? '14px' : '20px'}; border: 1px solid var(--border-color);">
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

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem; margin-bottom: 24px;">
            <div><strong style="color: var(--text-muted);">Owner / Acquirer:</strong> <span style="font-weight: 600; color: var(--gold-button);">${a.owner_name || a.buyer_name || 'Self'}</span></div>
            <div><strong style="color: var(--text-muted);">Metal:</strong> ${a.metal} (${a.purity})</div>
            <div><strong style="color: var(--text-muted);">Net Weight:</strong> ${a.net_weight || a.gross_weight || 0} grams</div>
            <div><strong style="color: var(--text-muted);">Acquisition Cost:</strong> ${sym}${Math.round(a.total_acquisition_cost || 0).toLocaleString()}</div>
            <div><strong style="color: var(--text-muted);">Purchased:</strong> ${a.purchase_date || 'N/A'}</div>
            <div><strong style="color: var(--text-muted);">Platform / Jeweller:</strong> ${a.jeweller || a.jeweller_name || 'Certified Jeweller'}</div>
            <div><strong style="color: var(--text-muted);">Status:</strong> <span style="font-weight: 600; color: ${isSold ? 'var(--loss-red)' : 'var(--gain-green)'};">${a.status || 'Active'}</span></div>
            ${isSold && saleTx?.counterparty ? `<div><strong style="color: var(--text-muted);">Buyer / Desk:</strong> <span style="font-weight: 600; color: var(--text-primary);">${saleTx.counterparty}</span></div>` : ''}
          </div>

          <div style="display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <button class="btn btn-secondary" style="color: var(--loss-red);" onclick="AssetsComponent.deleteAsset(${a.id})">
              <i data-lucide="trash-2" style="width: 15px;"></i> Delete
            </button>
            <div style="display: flex; gap: 8px;">
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

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
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
        status
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
            <label class="form-label">Sale Date</label>
            <input type="date" class="form-control" id="sell-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label">Buyer / Counterparty Desk</label>
            <input type="text" class="form-control" id="sell-buyer" placeholder="e.g. MMTC-PAMP Buyback Desk" />
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
    const date = document.getElementById('sell-date').value;
    const buyer = document.getElementById('sell-buyer').value;

    try {
      await API.sellAsset(assetId, {
        sale_amount: amount,
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
  }
};
