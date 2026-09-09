// Asset Lifecycle & Transaction Ledger Component - Ultra-Organized Luxury FinTech UI
const TransactionsComponent = {
  currentTypeFilter: 'all', // 'all' | 'purchase' | 'sale'
  searchQuery: '',
  allTransactions: [],

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update Topbar Breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Portfolio / Transactions';

    const curr = API.getCurrency();
    const sym = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : '£'));

    container.innerHTML = `
      <div class="transactions-view">
        <!-- 1. Header & Summary Stats -->
        <div class="assets-header-row">
          <div>
            <h2 class="dash-greeting">Transaction Ledger</h2>
            <p class="dash-subtitle">Complete audit trail of asset acquisitions, buy-back sales, and realized lifecycle gains.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="${API.getCsvReportUrl()}" class="btn btn-secondary" target="_blank">
              <i data-lucide="download" style="width: 14px;"></i> Export CSV
            </a>
          </div>
        </div>

        <!-- 2. Top Summary KPI Cards -->
        <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Total Capital Inflow</div>
            <div class="kpi-value" id="tx-kpi-acquisitions" style="font-size: 1.45rem;">--</div>
            <div class="kpi-subtext" id="tx-kpi-acquisitions-count">-- purchases recorded</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Total Liquidated Sales</div>
            <div class="kpi-value" id="tx-kpi-sales" style="font-size: 1.45rem;">--</div>
            <div class="kpi-subtext" id="tx-kpi-sales-count">-- sales recorded</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Net Realized P&L</div>
            <div class="kpi-value" id="tx-kpi-realized" style="font-size: 1.45rem; color: var(--gain-green);">--</div>
            <div class="kpi-subtext">Booked net profit</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Recorded Audit Logs</div>
            <div class="kpi-value" id="tx-kpi-events-count" style="font-size: 1.45rem;">--</div>
            <div class="kpi-subtext">100% immutable history</div>
          </div>
        </div>

        <!-- 3. Controls Bar: Filter Tabs & Search -->
        <div class="assets-controls-bar">
          <div class="assets-tabs">
            <button class="assets-tab ${this.currentTypeFilter === 'all' ? 'active' : ''}" onclick="TransactionsComponent.setTypeFilter('all')">All Events</button>
            <button class="assets-tab ${this.currentTypeFilter === 'purchase' ? 'active' : ''}" onclick="TransactionsComponent.setTypeFilter('purchase')">Purchases</button>
            <button class="assets-tab ${this.currentTypeFilter === 'sale' ? 'active' : ''}" onclick="TransactionsComponent.setTypeFilter('sale')">Liquidated Sales</button>
          </div>

          <div class="assets-search-group" style="flex: 1; max-width: 380px;">
            <i data-lucide="search" class="assets-search-icon"></i>
            <input type="text" class="assets-search-input" placeholder="Search by asset, counterparty, notes..." oninput="TransactionsComponent.onSearch(this.value)" value="${this.searchQuery}" />
          </div>
        </div>

        <!-- 4. Main Transaction Ledger Table -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Event Type</th>
                  <th>Transaction Date</th>
                  <th>Amount</th>
                  <th>Realized P / L</th>
                  <th>Counterparty / Desk</th>
                  <th>Notes & Reference</th>
                </tr>
              </thead>
              <tbody id="transactions-table-tbody">
                <tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Loading transaction history...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadTransactions();
  },

  async loadTransactions() {
    try {
      const data = await API.getTransactions();
      this.allTransactions = data.transactions || [];
      this.updateSummaryKpis();
      this.renderFilteredTable();
    } catch (err) {
      console.error('Failed fetching transactions:', err);
    }
  },

  updateSummaryKpis() {
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';
    const txs = this.allTransactions;

    const purchases = txs.filter(t => t.transaction_type === 'PURCHASE');
    const sales = txs.filter(t => t.transaction_type === 'SALE');

    const totalAcquisitionAmount = purchases.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaleAmount = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalRealizedPnl = sales.reduce((sum, t) => sum + (t.realized_profit || 0), 0);

    const acqEl = document.getElementById('tx-kpi-acquisitions');
    const acqCountEl = document.getElementById('tx-kpi-acquisitions-count');
    const salesEl = document.getElementById('tx-kpi-sales');
    const salesCountEl = document.getElementById('tx-kpi-sales-count');
    const realizedEl = document.getElementById('tx-kpi-realized');
    const eventsCountEl = document.getElementById('tx-kpi-events-count');

    if (acqEl) acqEl.innerText = `${sym}${Math.round(totalAcquisitionAmount).toLocaleString()}`;
    if (acqCountEl) acqCountEl.innerText = `${purchases.length} purchases recorded`;
    if (salesEl) salesEl.innerText = `${sym}${Math.round(totalSaleAmount).toLocaleString()}`;
    if (salesCountEl) salesCountEl.innerText = `${sales.length} sale recorded`;
    if (realizedEl) {
      realizedEl.innerText = `${totalRealizedPnl >= 0 ? '+' : ''}${sym}${Math.round(totalRealizedPnl).toLocaleString()}`;
      realizedEl.style.color = totalRealizedPnl >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';
    }
    if (eventsCountEl) eventsCountEl.innerText = `${txs.length} total events`;
  },

  setTypeFilter(type) {
    this.currentTypeFilter = type;
    this.render();
  },

  onSearch(query) {
    this.searchQuery = query.toLowerCase();
    this.renderFilteredTable();
  },

  renderFilteredTable() {
    const tbody = document.getElementById('transactions-table-tbody');
    if (!tbody) return;

    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    let filtered = this.allTransactions.filter(t => {
      // 1. Type Filter
      if (this.currentTypeFilter !== 'all') {
        if (this.currentTypeFilter === 'purchase' && t.transaction_type !== 'PURCHASE') return false;
        if (this.currentTypeFilter === 'sale' && t.transaction_type !== 'SALE') return false;
      }

      // 2. Search Query
      if (this.searchQuery) {
        const fullStr = `${t.asset_name || ''} ${t.counterparty || ''} ${t.notes || ''} ${t.transaction_type || ''}`.toLowerCase();
        if (!fullStr.includes(this.searchQuery)) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No transaction logs match your filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const isPurchase = t.transaction_type === 'PURCHASE';
      const isSale = t.transaction_type === 'SALE';
      const photoSrc = AssetsComponent.getPhotoForAsset({ asset_name: t.asset_name, metal: t.metal, photo_url: t.photo_url });

      let typeBadge = '';
      if (isPurchase) {
        typeBadge = `<span class="metal-pill diamond" style="font-weight: 700;"><span class="metal-dot"></span> ACQUISITION</span>`;
      } else if (isSale) {
        typeBadge = `<span class="status-pill held" style="font-weight: 700; background: var(--gain-green-bg); color: var(--gain-green); border: 1px solid rgba(16, 185, 129, 0.3);">LIQUIDATED SALE</span>`;
      } else {
        typeBadge = `<span class="status-pill sold">${t.transaction_type}</span>`;
      }

      let dateFormatted = t.transaction_date || 'Recent';
      try {
        const d = new Date(t.transaction_date);
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch (e) {}

      const hasPnl = isSale && t.realized_profit !== undefined && t.realized_profit !== null;
      const isGain = (t.realized_profit || 0) >= 0;

      return `
        <tr>
          <td>
            <div class="asset-cell" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${t.asset_id})">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${t.asset_name}" onerror="this.onerror=null;this.src='/img/assets/gold_coins.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${t.asset_name || 'Physical Asset'}</div>
                <div class="asset-code-sub">${t.metal || ''} ${t.purity || ''} &bull; AV-${String(t.asset_id || 1).padStart(3, '0')}</div>
              </div>
            </div>
          </td>
          <td>${typeBadge}</td>
          <td style="color: var(--text-secondary); font-weight: 500; white-space: nowrap;">${dateFormatted}</td>
          <td style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary); font-size: 0.95rem;">${sym}${Math.round(t.amount || 0).toLocaleString()}</td>
          <td>
            ${hasPnl ? `
              <span class="pnl-cell ${isGain ? 'up' : 'down'}">
                ${isGain ? '↗ +' : '↘ -'}${sym}${Math.abs(Math.round(t.realized_profit)).toLocaleString()}
              </span>
            ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">&mdash;</span>'}
          </td>
          <td style="color: var(--text-primary); font-weight: 500;">${t.counterparty || '<span style="color: var(--text-muted);">&mdash;</span>'}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem; max-width: 220px;">${t.notes || ''}</td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }
};
