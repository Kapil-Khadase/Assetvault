// Dashboard Component - Exact Replica of Reference Design
const DashboardComponent = {
  summaryData: null,

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Portfolio Dashboard';

    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    container.innerHTML = `
      <div class="dashboard-view">
        <!-- Header Row -->
        <div class="dash-header">
          <div>
            <h2 class="dash-greeting" id="dash-greeting-text">Good morning</h2>
            <p class="dash-subtitle" id="dash-subtitle-text">Your portfolio of physical assets, valued at today's market rates.</p>
          </div>
          <div class="dash-actions">
            <a href="${API.getPdfReportUrl()}" target="_blank" class="btn btn-secondary">
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
            <div class="kpi-val" id="kpi-val-est">${sym}0</div>
            <div class="kpi-footer">
              <span class="kpi-badge up" id="kpi-est-badge"><i data-lucide="trending-up" style="width: 14px;"></i> 0.0%</span>
              <span class="kpi-footer-sub">vs investment cost</span>
            </div>
          </div>

          <!-- Card 2: Total Investment -->
          <div class="kpi-card">
            <div class="kpi-label">Total investment</div>
            <div class="kpi-val" id="kpi-val-invested">${sym}0</div>
            <div class="kpi-footer">
              <span class="kpi-footer-sub" id="kpi-count-sub">0 assets held</span>
            </div>
          </div>

          <!-- Card 3: Unrealised Profit / Loss -->
          <div class="kpi-card">
            <div class="kpi-label">Unrealised profit / loss</div>
            <div class="kpi-val" style="color: var(--gain-green);" id="kpi-val-unrealized">+${sym}0</div>
            <div class="kpi-footer">
              <span class="kpi-badge up" id="kpi-roi-badge"><i data-lucide="trending-up" style="width: 14px;"></i> +0.0%</span>
              <span class="kpi-footer-sub">overall ROI</span>
            </div>
          </div>

          <!-- Card 4: Realised Profit / Loss -->
          <div class="kpi-card">
            <div class="kpi-label">Realised profit / loss</div>
            <div class="kpi-val" id="kpi-val-realized">+${sym}0</div>
            <div class="kpi-footer">
              <span class="kpi-footer-sub" id="kpi-sales-sub">0 sales recorded</span>
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
                      <th>Asset Name</th>
                      <th>Owner / Holder</th>
                      <th>Type</th>
                      <th>Invested</th>
                      <th>Est. value</th>
                      <th>P / L</th>
                    </tr>
                  </thead>
                  <tbody id="dash-holdings-tbody">
                    <tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">Loading assets...</td></tr>
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

            <!-- Portfolio Wealth Goal Tracker -->
            <div class="card" id="dash-goal-card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="target" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Wealth Goal
                  </h3>
                  <p class="card-subheading">Target portfolio milestone</p>
                </div>
              </div>
              <div id="dash-goal-content">
                <div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">Loading wealth goal...</div>
              </div>
            </div>

            <!-- Concentration Exposure Analytics -->
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h3 class="card-heading" style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="shield-alert" style="width: 17px; height: 17px; color: var(--gold-accent);"></i>
                    Concentration Exposure
                  </h3>
                  <p class="card-subheading">Risk diversification breakdown</p>
                </div>
              </div>
              <div id="dash-concentration-bars" style="display: flex; flex-direction: column; gap: 10px;">
                <!-- Injected dynamically -->
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
                  <p class="card-subheading" id="dash-market-rates-subtitle">Live Bullion Benchmarks</p>
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
      const userRes = await API.getProfile().catch(() => ({ user: { name: 'Investor' } }));
      const firstName = userRes.user && userRes.user.name ? userRes.user.name.split(' ')[0] : 'Investor';
      const greetingEl = document.getElementById('dash-greeting-text');
      if (greetingEl) greetingEl.innerText = `Good morning, ${firstName}`;

      const totalActiveAssets = summary.total_active_assets ?? (summary.total_assets_count ?? 0);
      const subtitleEl = document.getElementById('dash-subtitle-text');
      if (subtitleEl) subtitleEl.innerText = `Your portfolio of ${totalActiveAssets} held assets, valued at today's market rates.`;

      // 1. Update 4 KPI Cards (Use strictly user values without mock fallbacks)
      const currentMarketVal = summary.total_current_market_value ?? 0;
      const investedCost = summary.total_invested_cost ?? 0;
      const unrealizedPnl = summary.total_unrealized_pnl ?? 0;
      const overallRoi = summary.overall_roi_pct ?? 0;
      const realizedPnl = summary.total_realized_pnl ?? 0;
      const salesCount = summary.total_sales_count ?? 0;

      const estEl = document.getElementById('kpi-val-est');
      if (estEl) estEl.innerText = `${sym}${Math.round(currentMarketVal).toLocaleString()}`;

      const estBadge = document.getElementById('kpi-est-badge');
      if (estBadge) {
        estBadge.className = `kpi-badge ${overallRoi >= 0 ? 'up' : 'down'}`;
        estBadge.innerHTML = `<i data-lucide="${overallRoi >= 0 ? 'trending-up' : 'trending-down'}" style="width: 14px;"></i> ${overallRoi >= 0 ? '+' : ''}${overallRoi.toFixed(1)}%`;
      }

      const investedEl = document.getElementById('kpi-val-invested');
      if (investedEl) investedEl.innerText = `${sym}${Math.round(investedCost).toLocaleString()}`;

      const countSubEl = document.getElementById('kpi-count-sub');
      if (countSubEl) countSubEl.innerText = `${totalActiveAssets} ${totalActiveAssets === 1 ? 'asset' : 'assets'} held`;

      const unrealizedEl = document.getElementById('kpi-val-unrealized');
      if (unrealizedEl) {
        unrealizedEl.innerText = `${unrealizedPnl >= 0 ? '+' : ''}${sym}${Math.round(unrealizedPnl).toLocaleString()}`;
        unrealizedEl.style.color = unrealizedPnl >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';
      }

      const roiBadgeEl = document.getElementById('kpi-roi-badge');
      if (roiBadgeEl) {
        roiBadgeEl.className = `kpi-badge ${overallRoi >= 0 ? 'up' : 'down'}`;
        roiBadgeEl.innerHTML = `
          <i data-lucide="${overallRoi >= 0 ? 'trending-up' : 'trending-down'}" style="width: 14px;"></i> ${overallRoi >= 0 ? '+' : ''}${overallRoi.toFixed(1)}%
        `;
      }

      const realizedEl = document.getElementById('kpi-val-realized');
      if (realizedEl) {
        realizedEl.innerText = `${realizedPnl >= 0 ? '+' : ''}${sym}${Math.round(realizedPnl).toLocaleString()}`;
        realizedEl.style.color = realizedPnl >= 0 ? 'var(--text-primary)' : 'var(--loss-red)';
      }

      const salesSubEl = document.getElementById('kpi-sales-sub');
      if (salesSubEl) salesSubEl.innerText = `${salesCount} ${salesCount === 1 ? 'sale' : 'sales'} recorded`;

      // 2. Render Portfolio Growth Chart
      const trends = await API.getMarketHistory(30).catch(() => ({ trends: [] }));
      ChartManager.renderPortfolioGrowthChart('portfolio-growth-chart', summary, trends.trends);

      // 3. Render Holdings Table
      this.renderHoldingsTable(summary.assets || [], sym);

      // 4. Render Allocation Donut & Legend Breakdown
      ChartManager.renderAllocationDonutChart('allocation-donut-chart', summary.metal_allocation || [], currentMarketVal);
      this.renderAllocationBreakdown(summary.metal_allocation || [], currentMarketVal, sym);

      // 4b. Render Goal Tracker & Concentration Exposure
      await this.renderGoalTracker(currentMarketVal, sym);
      this.renderConcentrationExposure(summary, sym);

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
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px 20px; color: var(--text-muted);">
            <i data-lucide="inbox" style="width: 24px; height: 24px; color: var(--text-muted); margin-bottom: 8px; display: block; margin-inline: auto;"></i>
            No assets recorded in your vault yet.<br />
            <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="AssetsComponent.openAddModal()">
              <i data-lucide="plus" style="width: 14px;"></i> Add your first asset
            </button>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Top 6 ranked by estimated value
    const topAssets = [...assets].sort((a, b) => (b.current_estimated_value || b.current_valuation || 0) - (a.current_estimated_value || a.current_valuation || 0)).slice(0, 6);

    tbody.innerHTML = topAssets.map((a, idx) => {
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
        pillText = a.asset_type || 'Digital Gold';
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

      const gain = a.profit_loss ?? (a.unrealized_gain ?? 0);
      const gainPct = a.roi_percentage ?? 0;
      const isUp = gain >= 0;
      const code = `AV-${String(a.id || idx + 1).padStart(3, '0')}`;
      const photoSrc = AssetsComponent.getPhotoForAsset(a);
      const estVal = a.current_estimated_value ?? (a.current_valuation ?? 0);

      return `
        <tr style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${a.id})">
          <td>
            <div class="asset-cell">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" onerror="this.onerror=null;this.src='/img/assets/digital_gold.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${a.asset_name}</div>
                <div class="asset-code-sub">${code} &bull; ${a.category_name || (isDigiGold ? 'Digital Gold & ETFs' : 'Jewellery')}</div>
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
          <td style="font-weight: 600;">${sym}${Math.round(a.total_acquisition_cost || 0).toLocaleString()}</td>
          <td style="font-weight: 700;">${sym}${Math.round(estVal).toLocaleString()}</td>
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

    let items = [];
    if (Array.isArray(alloc)) {
      items = alloc.filter(a => (a.value || 0) > 0);
    } else if (alloc && typeof alloc === 'object') {
      items = Object.entries(alloc).map(([k, v]) => ({
        label: k,
        value: typeof v === 'object' ? (v.value || 0) : Number(v),
        percentage: typeof v === 'object' ? (v.percentage || 0) : 0
      })).filter(a => a.value > 0);
    }

    if (items.length === 0 || totalVal === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 16px 8px; color: var(--text-muted); font-size: 0.8rem;">
          No asset allocation data yet.<br />Add holdings to view breakdown.
        </div>
      `;
      return;
    }

    const dotColors = {
      gold: '#D97706',
      diamond: '#0284C7',
      silver: '#64748B',
      platinum: '#9333EA'
    };

    container.innerHTML = items.map(i => {
      const l = (i.label || '').toLowerCase();
      let dot = '#10B981';
      if (l.includes('gold')) dot = dotColors.gold;
      else if (l.includes('diamond')) dot = dotColors.diamond;
      else if (l.includes('silver')) dot = dotColors.silver;
      else if (l.includes('plat')) dot = dotColors.platinum;

      const pct = i.percentage !== undefined ? i.percentage : ((i.value / totalVal) * 100).toFixed(1);
      return `
        <div class="alloc-item">
          <div class="alloc-left">
            <span class="alloc-dot" style="background: ${dot};"></span>
            <span class="alloc-name">${i.label}</span>
          </div>
          <div class="alloc-right">
            <span class="alloc-pct">${pct}%</span>
            <span class="alloc-amount">${sym}${Math.round(i.value).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  async renderGoalTracker(currentMarketVal, sym) {
    const container = document.getElementById('dash-goal-content');
    if (!container) return;

    try {
      const res = await API.getGoals();
      const goals = res.goals || [];
      if (goals.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 14px 10px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">Set a wealth milestone to track your bullion accumulation target.</p>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('settings')">
              <i data-lucide="target" style="width: 13px;"></i> Configure Portfolio Goal
            </button>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      const activeGoal = goals[0];
      const target = activeGoal.target_amount || 1;
      const pct = Math.min(100, Math.max(0, Number(((currentMarketVal / target) * 100).toFixed(1))));
      const remaining = Math.max(0, target - currentMarketVal);

      container.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${activeGoal.title}</span>
            <span style="font-weight: 700; color: var(--gold-accent); font-size: 0.9rem;">${pct}%</span>
          </div>
          <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #d97706, #10b981); border-radius: 4px;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted);">
            <span>Target: <b>${sym}${Math.round(target).toLocaleString()}</b></span>
            <span>${remaining > 0 ? `${sym}${Math.round(remaining).toLocaleString()} to goal` : 'Goal Achieved!'}</span>
          </div>
          ${activeGoal.target_date ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px;"><i data-lucide="calendar" style="width: 11px; vertical-align: middle;"></i> Target Date: ${activeGoal.target_date}</div>` : ''}
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.warn('Could not load goals:', e);
      container.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 10px;">Goal tracking unavailable</div>`;
    }
  },

  renderConcentrationExposure(summary, sym) {
    const container = document.getElementById('dash-concentration-bars');
    if (!container) return;

    const totalVal = summary.total_current_market_value || 0;
    const assets = (summary.assets || []).filter(a => (a.status || 'Active') === 'Active');

    if (totalVal === 0 || assets.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 10px;">Add assets to view concentration exposure.</div>`;
      return;
    }

    const categories = {
      Gold: { val: 0, color: '#D97706' },
      Silver: { val: 0, color: '#94A3B8' },
      Platinum: { val: 0, color: '#9333EA' },
      Diamond: { val: 0, color: '#0284C7' },
      Other: { val: 0, color: '#10B981' }
    };

    assets.forEach(a => {
      const metal = (a.metal || '').toUpperCase();
      const val = a.current_estimated_value || 0;
      if (metal.includes('GOLD')) categories.Gold.val += val;
      else if (metal.includes('SILVER')) categories.Silver.val += val;
      else if (metal.includes('PLAT')) categories.Platinum.val += val;
      else if (metal.includes('DIAMOND') || (a.category_name && a.category_name.includes('Diamond'))) categories.Diamond.val += val;
      else categories.Other.val += val;
    });

    let warningHtml = '';
    let barsHtml = '';

    Object.entries(categories).forEach(([name, data]) => {
      if (data.val <= 0) return;
      const pct = Number(((data.val / totalVal) * 100).toFixed(1));
      if (pct >= 70) {
        warningHtml = `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; color: #f59e0b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="alert-triangle" style="width: 14px; flex-shrink: 0;"></i>
            High Concentration: <b>${pct}%</b> in ${name} holdings.
          </div>
        `;
      }
      barsHtml += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 3px;">
            <span style="font-weight: 600;">${name}</span>
            <span style="color: var(--text-muted);">${sym}${Math.round(data.val).toLocaleString()} (${pct}%)</span>
          </div>
          <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${data.color}; border-radius: 3px;"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = warningHtml + barsHtml;
    if (window.lucide) lucide.createIcons();
  },

  renderMarketRatesList(rates, sym) {
    const container = document.getElementById('dash-market-rates-list');
    if (!container) return;

    // Check if rates came from fallback cache
    const subEl = document.getElementById('dash-market-rates-subtitle');
    const isCached = Object.values(rates).some(r => r.source === 'Historical Cache' || r.status === 'CACHED');
    if (subEl) {
      if (isCached) {
        subEl.innerHTML = `<span style="color: var(--gold-accent);"><i data-lucide="clock" style="width: 12px; vertical-align: middle;"></i> Using last available rate (Cached)</span>`;
      } else {
        subEl.innerHTML = `<span style="color: var(--gain-green);"><i data-lucide="wifi" style="width: 12px; vertical-align: middle;"></i> Live Bullion Exchange</span>`;
      }
      if (window.lucide) lucide.createIcons();
    }

    const gold24 = rates.GOLD_24K ? Math.round(rates.GOLD_24K.rate_per_gram) : 7420;
    const silver999 = rates.SILVER_999 ? Math.round(rates.SILVER_999.rate_per_gram) : 93;
    const plat950 = rates.PLATINUM_950 ? Math.round(rates.PLATINUM_950.rate_per_gram) : 3180;

    const rateBadge = isCached ? 
      `<span class="market-rate-pill" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">Cached</span>` : 
      `<span class="market-rate-pill up">Live</span>`;

    container.innerHTML = `
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #D97706;"></span>
          <span class="market-rate-name">Gold 24K</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${gold24.toLocaleString()}/g</span>
          ${rateBadge}
        </div>
      </div>
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #64748B;"></span>
          <span class="market-rate-name">Silver 999</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${silver999.toLocaleString()}/g</span>
          ${rateBadge}
        </div>
      </div>
      <div class="market-rate-item">
        <div class="market-rate-left">
          <span class="market-rate-dot" style="background: #9333EA;"></span>
          <span class="market-rate-name">Platinum 950</span>
        </div>
        <div class="market-rate-right">
          <span class="market-rate-price">${sym}${plat950.toLocaleString()}/g</span>
          ${rateBadge}
        </div>
      </div>
    `;
  },

  renderPerformanceLeaders(assets, sym) {
    const container = document.getElementById('dash-perf-leaders');
    if (!container) return;

    const activeAssets = (assets || []).filter(a => (a.status || 'Active') === 'Active');

    if (activeAssets.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px 10px; color: var(--text-muted); font-size: 0.8rem;">
          <i data-lucide="sparkles" style="width: 20px; color: var(--gold-primary); margin-bottom: 6px; display: block; margin-inline: auto;"></i>
          Add holdings to see top performing assets.
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const sorted = [...activeAssets].sort((a, b) => (b.roi_percentage || 0) - (a.roi_percentage || 0));
    const best = sorted[0];
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;

    const bestPhoto = AssetsComponent.getPhotoForAsset(best);
    const bestRoi = best.roi_percentage ?? 0;

    let worstHtml = '';
    if (worst && worst.id !== best.id) {
      const worstPhoto = AssetsComponent.getPhotoForAsset(worst);
      const worstRoi = worst.roi_percentage ?? 0;
      worstHtml = `
        <div class="perf-item" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${worst.id})">
          <div class="asset-thumb" style="width: 38px; height: 38px; border-radius: 8px;">
            <img src="${worstPhoto}" class="asset-thumb-img" alt="${worst.asset_name}" onerror="this.onerror=null;this.src='/img/assets/platinum_band.svg';" />
          </div>
          <div class="perf-info">
            <div class="perf-badge-label" style="color: var(--loss-red); font-weight: 700;">Worst performer</div>
            <div class="perf-name">${worst.asset_name}</div>
          </div>
          <div class="perf-val ${worstRoi >= 0 ? 'up' : 'down'}">${worstRoi >= 0 ? '↗ +' : '↘ '}${worstRoi.toFixed(1)}%</div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="perf-item" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${best.id})">
        <div class="asset-thumb" style="width: 38px; height: 38px; border-radius: 8px;">
          <img src="${bestPhoto}" class="asset-thumb-img" alt="${best.asset_name}" onerror="this.onerror=null;this.src='/img/assets/temple_necklace.svg';" />
        </div>
        <div class="perf-info">
          <div class="perf-badge-label" style="color: var(--gain-green); font-weight: 700;">Best performer</div>
          <div class="perf-name">${best.asset_name}</div>
        </div>
        <div class="perf-val ${bestRoi >= 0 ? 'up' : 'down'}">${bestRoi >= 0 ? '↗ +' : '↘ '}${bestRoi.toFixed(1)}%</div>
      </div>
      ${worstHtml}
    `;
  },

  renderRecentActivity(txs, sym) {
    const container = document.getElementById('dash-activity-list');
    if (!container) return;

    if (!txs || txs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 0.82rem;">
          <i data-lucide="activity" style="width: 20px; color: var(--text-muted); margin-bottom: 6px; display: block; margin-inline: auto;"></i>
          No transaction events recorded yet.<br />Purchases and sales will appear here.
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const displayList = txs.slice(0, 5).map(t => ({
      title: `${t.transaction_type === 'SALE' ? 'Sale' : 'Purchase'} - ${t.asset_name || 'Physical Asset'}`,
      date: t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      type: t.transaction_type === 'SALE' ? 'sale' : 'purchase',
      amount: t.total_amount || t.amount || 0
    }));

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
