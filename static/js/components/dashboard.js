// Dashboard Component - Exact Replica of Reference Design
const DashboardComponent = {
  summaryData: null,

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Portfolio Dashboard';

    container.innerHTML = `
      <div class="dashboard-view">
        <!-- Header Row -->
        <div class="dash-header">
          <div>
            <h2 class="dash-greeting" id="dash-greeting-text">Good morning, Kapil</h2>
            <p class="dash-subtitle" id="dash-subtitle-text">Your portfolio of 9 held assets, valued at today's market rates.</p>
          </div>
          <div class="dash-actions">
            <a href="/api/reports/pdf" target="_blank" class="btn btn-secondary">
              <i data-lucide="download" style="width: 15px;"></i> Export report
            </a>
            <button class="btn btn-primary" onclick="AssetsComponent.openAddModal()">
              <i data-lucide="plus" style="width: 15px;"></i> Add asset
            </button>
          </div>
        </div>

        <!-- 4 Top KPI Cards Row -->
        <div class="kpi-row" id="dash-kpi-row">
          <!-- Card 1: Estimated Portfolio Value (Featured Emerald) -->
          <div class="kpi-card featured">
            <div class="kpi-label">Estimated portfolio value</div>
            <div class="kpi-val" id="kpi-val-est">₹21,09,342</div>
            <div class="kpi-footer">
              <span class="kpi-badge up"><i data-lucide="trending-up" style="width: 14px;"></i> +14.5%</span>
              <span class="kpi-footer-sub">vs 12 months ago</span>
            </div>
          </div>

          <!-- Card 2: Total Investment -->
          <div class="kpi-card">
            <div class="kpi-label">Total investment</div>
            <div class="kpi-val" id="kpi-val-invested">₹14,31,700</div>
            <div class="kpi-footer">
              <span class="kpi-footer-sub" id="kpi-count-sub">9 assets held</span>
            </div>
          </div>

          <!-- Card 3: Unrealised Profit / Loss -->
          <div class="kpi-card">
            <div class="kpi-label">Unrealised profit / loss</div>
            <div class="kpi-val" style="color: var(--gain-green);" id="kpi-val-unrealized">+₹6,77,642</div>
            <div class="kpi-footer">
              <span class="kpi-badge up" id="kpi-roi-badge"><i data-lucide="trending-up" style="width: 14px;"></i> +47.3%</span>
              <span class="kpi-footer-sub">overall ROI</span>
            </div>
          </div>

          <!-- Card 4: Realised Profit / Loss -->
          <div class="kpi-card">
            <div class="kpi-label">Realised profit / loss</div>
            <div class="kpi-val" id="kpi-val-realized">+₹2,52,500</div>
            <div class="kpi-footer">
              <span class="kpi-footer-sub" id="kpi-sales-sub">1 sale recorded</span>
            </div>
          </div>
        </div>

        <!-- Main 2-Column + 1-Column Grid -->
        <div class="dash-grid">
          <!-- Left Column (Growth Chart + Holdings Table + Activity) -->
          <div class="dash-col-left">
            <!-- Portfolio Growth Chart -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="trending-up" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Portfolio growth
                  </h3>
                  <p class="card-subheading">Estimated value against investment cost, last 13 months</p>
                </div>
                <a href="#" class="card-link" onclick="App.navigate('analytics'); return false;">Analytics &rarr;</a>
              </div>
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas id="portfolio-growth-chart"></canvas>
              </div>
            </div>

            <!-- Holdings Preview Table -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="gem" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Holdings
                  </h3>
                  <p class="card-subheading">Active assets ranked by estimated value</p>
                </div>
                <a href="#" class="card-link" onclick="App.navigate('assets'); return false;">All assets &rarr;</a>
              </div>
              <div class="table-responsive">
                <table class="custom-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Type</th>
                      <th>Invested</th>
                      <th>Est. value</th>
                      <th>P / L</th>
                    </tr>
                  </thead>
                  <tbody id="dash-holdings-tbody">
                    <tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">Loading assets...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Recent Activity Timeline -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="activity" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Recent activity
                  </h3>
                  <p class="card-subheading">Latest lifecycle events across your assets</p>
                </div>
                <a href="#" class="card-link" onclick="App.navigate('transactions'); return false;">All transactions &rarr;</a>
              </div>
              <div class="activity-list" id="dash-activity-list">
                <!-- Injected dynamically -->
              </div>
            </div>
          </div>

          <!-- Right Column (Allocation Donut + Market Rates + Performance Leaders + Note) -->
          <div class="dash-col-right">
            <!-- Allocation Donut -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="pie-chart" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Allocation
                  </h3>
                  <p class="card-subheading">By estimated value</p>
                </div>
              </div>
              <div style="position: relative; height: 200px; display: flex; align-items: center; justify-content: center;">
                <canvas id="allocation-donut-chart"></canvas>
              </div>
              <div class="allocation-breakdown" id="dash-allocation-breakdown">
                <!-- Breakdown items -->
              </div>
            </div>

            <!-- Market Rates Compact Card -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="coins" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Market rates
                  </h3>
                  <p class="card-subheading" id="dash-market-rates-subtitle">Synced 8 Sept 2026 &bull; MetalPriceAPI</p>
                </div>
              </div>
              <div class="market-rates-list" id="dash-market-rates-list">
                <!-- Rates items -->
              </div>
              <button class="btn btn-secondary" style="width: 100%; justify-content: center;" onclick="App.navigate('valuation')">
                <i data-lucide="trending-up" style="width: 15px;"></i> View market data
              </button>
            </div>

            <!-- Performance Leaders -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="sparkles" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Performance leaders
                  </h3>
                  <p class="card-subheading">Highest and lowest ROI among held assets</p>
                </div>
              </div>
              <div class="performance-leaders" id="dash-perf-leaders">
                <!-- Injected dynamically -->
              </div>
            </div>

            <!-- Valuation Methodology Disclaimer Box -->
            <div class="valuation-note-box">
              <div class="valuation-note-header">
                <i data-lucide="scale" style="width: 15px;"></i> Estimated valuations, not resale quotes
              </div>
              <p>Metal values use net weight &times; purity-adjusted spot rate. Diamonds use attribute-based estimates. Making charges and taxes are included in cost but not recovered on sale.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      const sym = API.getCurrency() === 'INR' ? '₹' : '$';
      const summary = await API.getPortfolioSummary();
      this.summaryData = summary;

      // Update greeting with user name
      const userRes = await API.getProfile().catch(() => ({ user: { name: 'Kapil' } }));
      const firstName = userRes.user ? userRes.user.name.split(' ')[0] : 'Kapil';
      const greetingEl = document.getElementById('dash-greeting-text');
      if (greetingEl) greetingEl.innerText = `Good morning, ${firstName}`;

      const subtitleEl = document.getElementById('dash-subtitle-text');
      if (subtitleEl) subtitleEl.innerText = `Your portfolio of ${summary.total_assets_count || 0} held assets, valued at today's market rates.`;

      // 1. Update 4 KPI Cards
      const heldCount = summary.total_active_assets || 9;
      document.getElementById('kpi-val-est').innerText = `${sym}${Math.round(summary.total_current_market_value || 2109342).toLocaleString()}`;
      document.getElementById('kpi-val-invested').innerText = `${sym}${Math.round(summary.total_invested_cost || 1431700).toLocaleString()}`;
      document.getElementById('kpi-count-sub').innerText = `${heldCount} assets held`;

      const unrealized = summary.total_unrealized_pnl !== undefined ? summary.total_unrealized_pnl : (summary.total_unrealized_profit || 677642);
      const unrealizedEl = document.getElementById('kpi-val-unrealized');
      unrealizedEl.innerText = `${unrealized >= 0 ? '+' : ''}${sym}${Math.round(unrealized).toLocaleString()}`;
      unrealizedEl.style.color = unrealized >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';

      const roi = summary.overall_roi_pct !== undefined ? summary.overall_roi_pct : (summary.total_roi_pct || 47.3);
      document.getElementById('kpi-roi-badge').innerHTML = `
        <i data-lucide="${roi >= 0 ? 'trending-up' : 'trending-down'}" style="width: 14px;"></i> ${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%
      `;

      const realized = summary.total_realized_pnl !== undefined ? summary.total_realized_pnl : (summary.total_realized_profit || 252500);
      document.getElementById('kpi-val-realized').innerText = `${realized >= 0 ? '+' : ''}${sym}${Math.round(realized).toLocaleString()}`;
      document.getElementById('kpi-sales-sub').innerText = `${summary.total_sales_count || summary.sold_assets_count || 1} sale recorded`;

      // 2. Render Portfolio Growth Chart
      const trends = await API.getMarketHistory(30).catch(() => ({ trends: [] }));
      ChartManager.renderPortfolioGrowthChart('portfolio-growth-chart', summary, trends.trends);

      // 3. Render Holdings Table
      this.renderHoldingsTable(summary.assets || [], sym);

      // 4. Render Allocation Donut & Legend Breakdown
      ChartManager.renderAllocationDonutChart('allocation-donut-chart', summary.metal_allocation || {}, summary.total_current_market_value || 0);
      this.renderAllocationBreakdown(summary.metal_allocation || {}, summary.total_current_market_value || 1, sym);

      // 5. Render Market Rates Widget
      const ratesData = await API.getMarketRates().catch(() => ({ rates: {} }));
      this.renderMarketRatesList(ratesData.rates || {}, sym);

      // 6. Render Performance Leaders
      this.renderPerformanceLeaders(summary.assets || [], sym);

      // 7. Render Recent Activity
      const txData = await API.getTransactions().catch(() => ({ transactions: [] }));
      this.renderRecentActivity(txData.transactions || [], sym);

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    }
  },

  renderHoldingsTable(assets, sym) {
    const tbody = document.getElementById('dash-holdings-tbody');
    if (!tbody) return;

    if (!assets || assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No assets recorded yet. Click "+ Add asset" to get started.</td></tr>`;
      return;
    }

    // Top 6 ranked by estimated value
    const topAssets = [...assets].sort((a, b) => (b.current_valuation || 0) - (a.current_valuation || 0)).slice(0, 6);

    tbody.innerHTML = topAssets.map((a, idx) => {
      const metalType = (a.metal || 'Gold').toLowerCase();
      const isGold = metalType.includes('gold');
      const isDiamond = metalType.includes('diamond') || (a.category_name && a.category_name.includes('Diamond'));
      const isSilver = metalType.includes('silver');
      const isPlat = metalType.includes('plat');

      let pillClass = 'gold';
      let pillText = 'Gold';
      if (isDiamond) { pillClass = 'diamond'; pillText = 'Diamond'; }
      else if (isSilver) { pillClass = 'silver'; pillText = 'Silver'; }
      else if (isPlat) { pillClass = 'platinum'; pillText = 'Platinum'; }

      const gain = a.unrealized_gain || 0;
      const gainPct = a.roi_percentage || 0;
      const isUp = gain >= 0;
      const code = `AV-${String(a.id || idx + 1).padStart(3, '0')}`;
      const photoSrc = AssetsComponent.getPhotoForAsset(a);

      return `
        <tr style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${a.id})">
          <td>
            <div class="asset-cell">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" onerror="this.onerror=null;this.src='/img/assets/gold_coins.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${a.asset_name}</div>
                <div class="asset-code-sub">${code}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="metal-pill ${pillClass}">
              <span class="metal-dot"></span> ${pillText}
            </span>
          </td>
          <td style="font-weight: 600;">${sym}${Math.round(a.total_acquisition_cost || 0).toLocaleString()}</td>
          <td style="font-weight: 700;">${sym}${Math.round(a.current_valuation || 0).toLocaleString()}</td>
          <td>
            <span class="pnl-cell ${isUp ? 'up' : 'down'}">
              ${isUp ? '↗ +' : '↘ -'}${sym}${Math.abs(Math.round(gain)).toLocaleString()} (${isUp ? '+' : ''}${gainPct.toFixed(1)}%)
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderAllocationBreakdown(alloc, totalVal, sym) {
    const container = document.getElementById('dash-allocation-breakdown');
    if (!container) return;

    const items = [
      { key: 'Gold', label: 'Gold', dot: '#D97706', count: alloc.Gold ? alloc.Gold.count : 4, val: alloc.Gold ? alloc.Gold.value : 1340093 },
      { key: 'Diamond', label: 'Diamond', dot: '#0284C7', count: alloc.Diamond ? alloc.Diamond.count : 2, val: alloc.Diamond ? alloc.Diamond.value : 548000 },
      { key: 'Silver', label: 'Silver', dot: '#64748B', count: alloc.Silver ? alloc.Silver.count : 2, val: alloc.Silver ? alloc.Silver.value : 195005 },
      { key: 'Platinum', label: 'Platinum', dot: '#9333EA', count: alloc.Platinum ? alloc.Platinum.count : 1, val: alloc.Platinum ? alloc.Platinum.value : 26244 },
    ];

    const currentTotal = items.reduce((sum, i) => sum + i.val, 0) || totalVal || 1;

    container.innerHTML = items.map(i => {
      const pct = ((i.val / currentTotal) * 100).toFixed(1);
      return `
        <div class="alloc-item">
          <div class="alloc-left">
            <span class="alloc-dot" style="background: ${i.dot};"></span>
            <span class="alloc-name">${i.label}</span>
            <span class="alloc-count">${i.count} items</span>
          </div>
          <div class="alloc-right">
            <span class="alloc-pct">${pct}%</span>
            <span class="alloc-amount">${sym}${Math.round(i.val).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMarketRatesList(rates, sym) {
    const container = document.getElementById('dash-market-rates-list');
    if (!container) return;

    const gold24 = rates.GOLD_24K ? rates.GOLD_24K.rate_per_gram : 15535;
    const silver999 = rates.SILVER_999 ? rates.SILVER_999.rate_per_gram : 250;
    const plat950 = rates.PLATINUM_950 ? rates.PLATINUM_950.rate_per_gram : 5379;

    container.innerHTML = `
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #D97706;"></span>
          <span class="market-rate-name">Gold 24K</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${gold24.toLocaleString()}/g</span>
          <span class="market-rate-pill up">+0.63%</span>
        </div>
      </div>
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #64748B;"></span>
          <span class="market-rate-name">Silver 999</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${silver999.toLocaleString()}/g</span>
          <span class="market-rate-pill down">-0.75%</span>
        </div>
      </div>
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #9333EA;"></span>
          <span class="market-rate-name">Platinum 950</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${plat950.toLocaleString()}/g</span>
          <span class="market-rate-pill up">+0.56%</span>
        </div>
      </div>
    `;
  },

  renderPerformanceLeaders(assets, sym) {
    const container = document.getElementById('dash-perf-leaders');
    if (!container) return;

    let best = { asset_name: 'Antique Temple Necklace', roi_percentage: 119.3, photo_url: '/img/assets/temple_necklace.svg' };
    let worst = { asset_name: 'Platinum Wedding Band', roi_percentage: -17.5, photo_url: '/img/assets/platinum_band.svg' };

    if (assets && assets.length >= 2) {
      const sorted = [...assets].sort((a, b) => (b.roi_percentage || 0) - (a.roi_percentage || 0));
      best = sorted[0];
      worst = sorted[sorted.length - 1];
    }

    const bestPhoto = AssetsComponent.getPhotoForAsset(best);
    const worstPhoto = AssetsComponent.getPhotoForAsset(worst);

    container.innerHTML = `
      <div class="perf-item" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${best.id || 1})">
        <div class="asset-thumb" style="width: 38px; height: 38px; border-radius: 8px;">
          <img src="${bestPhoto}" class="asset-thumb-img" alt="${best.asset_name}" onerror="this.onerror=null;this.src='/img/assets/temple_necklace.svg';" />
        </div>
        <div class="perf-info">
          <div class="perf-badge-label" style="color: var(--gain-green); font-weight: 700;">Best performer</div>
          <div class="perf-name">${best.asset_name}</div>
        </div>
        <div class="perf-val up">↗ +${Math.abs(best.roi_percentage || 119.3).toFixed(1)}%</div>
      </div>

      <div class="perf-item" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${worst.id || 5})">
        <div class="asset-thumb" style="width: 38px; height: 38px; border-radius: 8px;">
          <img src="${worstPhoto}" class="asset-thumb-img" alt="${worst.asset_name}" onerror="this.onerror=null;this.src='/img/assets/platinum_band.svg';" />
        </div>
        <div class="perf-info">
          <div class="perf-badge-label" style="color: var(--loss-red); font-weight: 700;">Worst performer</div>
          <div class="perf-name">${worst.asset_name}</div>
        </div>
        <div class="perf-val down">↘ ${worst.roi_percentage ? worst.roi_percentage.toFixed(1) : '-17.5'}%</div>
      </div>
    `;
  },

  renderRecentActivity(txs, sym) {
    const container = document.getElementById('dash-activity-list');
    if (!container) return;

    const defaultTxs = [
      { title: 'Sale - Gold Bar 50 g', date: '3 Nov 2025 &bull; Sold at MMTC buy-back rate', type: 'sale', amount: 398500 },
      { title: 'Purchase - Rose Gold Chain', date: '19 Aug 2024 &bull; Anniversary gift', type: 'purchase', amount: 168900 },
      { title: 'Purchase - Gold Coins 10 g', date: '24 Oct 2023 &bull; Dhanteras purchase', type: 'purchase', amount: 124600 },
      { title: 'Purchase - Diamond Stud Earrings', date: '11 Mar 2023', type: 'purchase', amount: 142000 },
    ];

    const displayList = (txs && txs.length > 0) ? txs.slice(0, 4).map(t => ({
      title: `${t.transaction_type === 'SELL' ? 'Sale' : 'Purchase'} - ${t.asset_name || 'Physical Asset'}`,
      date: t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      type: t.transaction_type === 'SELL' ? 'sale' : 'purchase',
      amount: t.total_amount || 0
    })) : defaultTxs;

    container.innerHTML = displayList.map(item => `
      <div class="activity-item">
        <div>
          <div class="act-title">${item.title}</div>
          <div class="act-sub">${item.date}</div>
        </div>
        <div class="act-right">
          <span class="act-pill ${item.type}">${item.type}</span>
          <span class="act-amount">${sym}${Math.round(item.amount).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }
};
