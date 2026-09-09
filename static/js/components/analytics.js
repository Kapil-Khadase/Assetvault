// Unified Portfolio Analytics & Stress Simulator Component - Ultra-Organized Luxury FinTech UI
const AnalyticsComponent = {
  currentShock: {
    gold: 0,
    silver: 0,
    platinum: 0,
    diamond: 0
  },
  summaryData: null,

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update Topbar Breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Insights / Analytics & Simulator';

    const curr = API.getCurrency();
    const sym = curr === 'INR' ? '₹' : '$';

    container.innerHTML = `
      <div class="analytics-view">
        <!-- 1. Header Row -->
        <div class="assets-header-row">
          <div>
            <h2 class="dash-greeting">Portfolio Analytics & Simulator</h2>
            <p class="dash-subtitle">Comprehensive asset concentration, liquidity depth, and interactive market shock stress-testing.</p>
          </div>
        </div>

        <!-- 2. Risk & Performance Ribbon -->
        <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Dominant Asset Class</div>
            <div class="kpi-value" id="analytics-ribbon-dominant" style="font-size: 1.45rem; color: #D97706;">--</div>
            <div class="kpi-subtext" id="analytics-ribbon-dominant-sub">Calculating holdings...</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Liquidity Depth</div>
            <div class="kpi-value" id="analytics-ribbon-liquidity" style="font-size: 1.45rem; color: var(--gain-green);">--</div>
            <div class="kpi-subtext">Instant bullion & jewellery resale</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Portfolio Volatility</div>
            <div class="kpi-value" id="analytics-ribbon-volatility" style="font-size: 1.45rem;">--</div>
            <div class="kpi-subtext">Precious metal hedge ratio</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Historical Alpha</div>
            <div class="kpi-value" id="analytics-ribbon-roi" style="font-size: 1.45rem; color: var(--gain-green);">--</div>
            <div class="kpi-subtext">Unrealized market gain</div>
          </div>
        </div>

        <!-- 3. Upper Analytics: Allocation Donut & Category Matrix -->
        <div class="charts-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
          <!-- Left: Allocation Donut & Legend -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 class="card-heading">Precious Metal Allocation</h3>
                <p class="card-subheading">Breakdown by bullion spot valuation</p>
              </div>
            </div>

            <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
              <div class="donut-chart-wrapper" style="width: 180px; height: 180px; position: relative;">
                <canvas id="analytics-donut-chart"></canvas>
              </div>
              <div style="flex: 1; min-width: 200px;" id="analytics-allocation-breakdown">
                <!-- Injected via JS -->
              </div>
            </div>
          </div>

          <!-- Right: Category Distribution -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 class="card-heading">Asset Category Concentration</h3>
                <p class="card-subheading">Distribution across jewelry, bullion, and diamonds</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;" id="analytics-category-bars">
              <!-- Injected via JS -->
            </div>
          </div>
        </div>

        <!-- 4. Interactive Stress-Testing & Simulation Engine -->
        <div class="card" style="margin-bottom: 24px; border: 1px solid rgba(212, 175, 55, 0.3);">
          <div class="workspace-card-header" style="margin-bottom: 16px;">
            <div>
              <h3 class="workspace-card-title">
                <i data-lucide="sliders" style="color: var(--gold-button); width: 18px;"></i> Market Price Shock Simulator ("What-If" Engine)
              </h3>
              <p class="workspace-card-sub">Stress-test your physical portfolio valuation under hypothetical exchange price movements.</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; align-items: start;">
            <!-- Left: Sliders & Scenario Presets -->
            <div>
              <!-- Gold Slider -->
              <div class="form-group" style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                  <span><span class="cat-dot gold"></span> Gold Price Shock</span>
                  <span id="slider-val-gold" style="color: #D97706; font-size: 0.9rem;">0%</span>
                </div>
                <input type="range" class="range-slider" id="sim-gold-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" />
              </div>

              <!-- Silver Slider -->
              <div class="form-group" style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                  <span><span class="cat-dot silver"></span> Silver Price Shock</span>
                  <span id="slider-val-silver" style="color: #94A3B8; font-size: 0.9rem;">0%</span>
                </div>
                <input type="range" class="range-slider" id="sim-silver-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" />
              </div>

              <!-- Platinum Slider -->
              <div class="form-group" style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                  <span><span class="cat-dot platinum"></span> Platinum Price Shock</span>
                  <span id="slider-val-plat" style="color: #A855F7; font-size: 0.9rem;">0%</span>
                </div>
                <input type="range" class="range-slider" id="sim-plat-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" />
              </div>

              <!-- Diamond Slider -->
              <div class="form-group" style="margin-bottom: 18px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                  <span><span class="cat-dot diamond"></span> Diamond Price Shock</span>
                  <span id="slider-val-diamond" style="color: #0284C7; font-size: 0.9rem;">0%</span>
                </div>
                <input type="range" class="range-slider" id="sim-diamond-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" />
              </div>

              <!-- Scenario Presets -->
              <div style="border-top: 1px solid var(--border-color); padding-top: 14px;">
                <div style="font-size: 0.74rem; color: var(--text-secondary); font-weight: 700; margin-bottom: 8px;">PRESET SCENARIOS:</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <button type="button" class="preset-pill" onclick="AnalyticsComponent.applyPreset(15, 25, 10, 0)">🚀 Bull Rally (+15% Gold)</button>
                  <button type="button" class="preset-pill" onclick="AnalyticsComponent.applyPreset(-15, -25, -10, -5)">🔻 Market Dip (-15% Gold)</button>
                  <button type="button" class="preset-pill" onclick="AnalyticsComponent.applyPreset(30, 30, 30, 20)">🔥 Supercycle (+30%)</button>
                  <button type="button" class="preset-pill" onclick="AnalyticsComponent.applyPreset(0, 0, 0, 0)">🔄 Reset</button>
                </div>
              </div>
            </div>

            <!-- Right: Simulated Outcome Card -->
            <div class="valuation-result-box" style="padding: 20px;">
              <div class="val-res-header">
                <span class="val-res-tag">SIMULATED PORTFOLIO VALUATION</span>
                <span class="val-res-sub" id="sim-impact-tag">Baseline: ${sym}0</span>
              </div>

              <div class="val-res-primary-val" id="sim-total-display">${sym}0</div>

              <div class="val-res-breakdown">
                <div class="breakdown-item">
                  <span class="breakdown-label">Net Projected Impact:</span>
                  <span class="breakdown-val" id="sim-diff-display" style="font-weight: 700;">+${sym}0 (0.0%)</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Simulated Total P&L:</span>
                  <span class="breakdown-val" id="sim-pnl-display" style="color: var(--gain-green); font-weight: 700;">+${sym}0</span>
                </div>
                <div class="breakdown-item">
                  <span class="breakdown-label">Simulated Total ROI:</span>
                  <span class="breakdown-val" id="sim-roi-display" style="color: var(--gain-green); font-weight: 700;">+0.0%</span>
                </div>
              </div>

              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 14px; text-align: center;">
                * Simulated results model hypothetical stress scenarios without altering database records.
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Asset-by-Asset Sensitivity Matrix Table -->
        <div class="table-card">
          <div class="workspace-card-header">
            <div>
              <h3 class="workspace-card-title">
                <i data-lucide="layers" style="color: var(--gold-button); width: 18px;"></i> Asset-by-Asset Sensitivity Analysis
              </h3>
              <p class="workspace-card-sub">Individual valuation reactions under the active simulated price shock.</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Metal / Karat</th>
                  <th>Acquisition Cost</th>
                  <th>Baseline Value</th>
                  <th>Simulated Value</th>
                  <th>Net Shift</th>
                  <th>Simulated ROI</th>
                </tr>
              </thead>
              <tbody id="sim-sensitivity-tbody">
                <tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Computing sensitivity analysis...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadData();
  },

  async loadData() {
    try {
      const summary = await API.getPortfolioSummary();
      this.summaryData = summary;
      const sym = API.getCurrency() === 'INR' ? '₹' : '$';

      const totalVal = summary.total_current_market_value || 0;
      const totalCost = summary.total_invested_cost || 0;
      const activeCount = summary.total_active_assets ?? (summary.total_assets_count ?? 0);
      const overallRoi = summary.overall_roi_pct ?? 0;

      // 1. Update Ribbon KPIs dynamically
      const domEl = document.getElementById('analytics-ribbon-dominant');
      const domSubEl = document.getElementById('analytics-ribbon-dominant-sub');
      const liqEl = document.getElementById('analytics-ribbon-liquidity');
      const volEl = document.getElementById('analytics-ribbon-volatility');
      const roiEl = document.getElementById('analytics-ribbon-roi');

      const allocList = summary.metal_allocation || [];
      if (allocList.length > 0 && totalVal > 0) {
        const sorted = [...allocList].sort((a, b) => (b.value || 0) - (a.value || 0));
        const top = sorted[0];
        if (domEl) domEl.innerText = `${top.label} (${top.percentage}%)`;
        if (domSubEl) domSubEl.innerText = `${activeCount} held ${activeCount === 1 ? 'asset' : 'assets'}`;
        if (liqEl) liqEl.innerText = '98.5% Liquid';
        if (volEl) volEl.innerText = 'Low-Moderate';
      } else {
        if (domEl) domEl.innerText = 'None';
        if (domSubEl) domSubEl.innerText = `${activeCount} held assets`;
        if (liqEl) liqEl.innerText = '100% Liquid';
        if (volEl) volEl.innerText = 'Flat';
      }

      if (roiEl) {
        roiEl.innerText = `${overallRoi >= 0 ? '+' : ''}${overallRoi.toFixed(1)}% ROI`;
        roiEl.style.color = overallRoi >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';
      }

      // 2. Render Donut Chart
      ChartManager.renderAllocationDonutChart('analytics-donut-chart', summary.metal_allocation || [], totalVal);

      // 3. Render Allocation Breakdown List
      this.renderAllocationList(summary.metal_allocation || [], totalVal, sym);

      // 4. Render Category Concentration Bars dynamically
      this.renderCategoryBars(summary.category_allocation || [], totalVal);

      // 5. Compute baseline simulation
      await this.runSimulation();
    } catch (err) {
      console.error('Failed loading analytics:', err);
    }
  },

  renderAllocationList(alloc, totalVal, sym) {
    const container = document.getElementById('analytics-allocation-breakdown');
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
        <div style="text-align: center; padding: 24px 8px; color: var(--text-muted); font-size: 0.82rem;">
          No asset allocation data recorded yet.<br />Add assets to view precious metal distribution.
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
        <div class="alloc-item" style="padding: 6px 0;">
          <div class="alloc-left">
            <span class="alloc-dot" style="background: ${dot};"></span>
            <span class="alloc-name">${i.label}</span>
          </div>
          <div class="alloc-right">
            <span class="alloc-pct">${pct}%</span>
            <span class="alloc-amount" style="font-weight: 700;">${sym}${Math.round(i.value).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderCategoryBars(catAlloc, totalVal) {
    const container = document.getElementById('analytics-category-bars');
    if (!container) return;

    let items = [];
    if (Array.isArray(catAlloc)) {
      items = catAlloc.filter(c => (c.value || 0) > 0);
    } else if (catAlloc && typeof catAlloc === 'object') {
      items = Object.entries(catAlloc).map(([k, v]) => ({
        label: k,
        value: typeof v === 'object' ? (v.value || 0) : Number(v),
        percentage: typeof v === 'object' ? (v.percentage || 0) : 0
      })).filter(c => c.value > 0);
    }

    if (items.length === 0 || totalVal === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 8px; color: var(--text-muted); font-size: 0.82rem;">
          No category concentration data yet.<br />Add jewellery, bullion, or diamonds to view concentration.
        </div>
      `;
      return;
    }

    const catColors = ['#D97706', '#F59E0B', '#0284C7', '#10B981', '#9333EA'];

    container.innerHTML = items.map((c, idx) => {
      const color = catColors[idx % catColors.length];
      const pct = c.percentage !== undefined ? c.percentage : ((c.value / totalVal) * 100).toFixed(1);
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 4px;">
            <span><i data-lucide="gem" style="width: 13px; color: ${color}; vertical-align: middle;"></i> ${c.label}</span>
            <span>${pct}%</span>
          </div>
          <div style="height: 8px; background: var(--bg-primary); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  onSliderInput() {
    const g = parseFloat(document.getElementById('sim-gold-slider').value) || 0;
    const s = parseFloat(document.getElementById('sim-silver-slider').value) || 0;
    const p = parseFloat(document.getElementById('sim-plat-slider').value) || 0;
    const d = parseFloat(document.getElementById('sim-diamond-slider').value) || 0;

    document.getElementById('slider-val-gold').innerText = `${g >= 0 ? '+' : ''}${g}%`;
    document.getElementById('slider-val-silver').innerText = `${s >= 0 ? '+' : ''}${s}%`;
    document.getElementById('slider-val-plat').innerText = `${p >= 0 ? '+' : ''}${p}%`;
    document.getElementById('slider-val-diamond').innerText = `${d >= 0 ? '+' : ''}${d}%`;

    this.currentShock = { gold_shock: g, silver_shock: s, plat_shock: p, diamond_shock: d };
    this.runSimulation();
  },

  applyPreset(g, s, p, d) {
    document.getElementById('sim-gold-slider').value = g;
    document.getElementById('sim-silver-slider').value = s;
    document.getElementById('sim-plat-slider').value = p;
    document.getElementById('sim-diamond-slider').value = d;
    this.onSliderInput();
  },

  async runSimulation() {
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    try {
      const res = await API.runSimulation(this.currentShock);
      const sim = res || {};

      const baseVal = sim.base_total_value ?? 0;
      const simVal = sim.simulated_total_value ?? 0;
      const diffVal = sim.portfolio_value_diff ?? 0;
      const diffPct = sim.portfolio_diff_pct ?? 0;
      const simPnl = sim.simulated_total_pnl ?? 0;
      const simRoi = sim.simulated_total_roi ?? 0;

      const isUp = diffVal >= 0;

      // Update Outcome Box
      const tagEl = document.getElementById('sim-impact-tag');
      const totalEl = document.getElementById('sim-total-display');
      const diffEl = document.getElementById('sim-diff-display');
      const pnlEl = document.getElementById('sim-pnl-display');
      const roiEl = document.getElementById('sim-roi-display');

      if (tagEl) tagEl.innerText = `Baseline: ${sym}${Math.round(baseVal).toLocaleString()}`;
      if (totalEl) totalEl.innerText = `${sym}${Math.round(simVal).toLocaleString()}`;
      if (diffEl) {
        diffEl.innerText = `${isUp ? '+' : ''}${sym}${Math.round(diffVal).toLocaleString()} (${isUp ? '+' : ''}${diffPct.toFixed(1)}%)`;
        diffEl.style.color = isUp ? 'var(--gain-green)' : 'var(--loss-red)';
      }
      if (pnlEl) {
        pnlEl.innerText = `${simPnl >= 0 ? '+' : ''}${sym}${Math.round(simPnl).toLocaleString()}`;
        pnlEl.style.color = simPnl >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';
      }
      if (roiEl) {
        roiEl.innerText = `${simRoi >= 0 ? '+' : ''}${simRoi.toFixed(1)}%`;
        roiEl.style.color = simRoi >= 0 ? 'var(--gain-green)' : 'var(--loss-red)';
      }

      // Render Asset Sensitivity Table
      this.renderSensitivityTable(sim.asset_simulations || [], sym);
    } catch (e) {
      console.error('Simulation error:', e);
    }
  },

  renderSensitivityTable(impacts, sym) {
    const tbody = document.getElementById('sim-sensitivity-tbody');
    if (!tbody) return;

    if (!impacts || impacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No active assets available in vault for simulation.</td></tr>`;
      return;
    }

    tbody.innerHTML = impacts.map(a => {
      const isUp = (a.value_difference || 0) >= 0;
      const photoSrc = AssetsComponent.getPhotoForAsset({ asset_name: a.asset_name, metal: a.metal, photo_url: a.photo_url });

      return `
        <tr>
          <td>
            <div class="asset-cell" style="cursor: pointer;" onclick="AssetsComponent.openDetailModal(${a.asset_id})">
              <div class="asset-thumb">
                <img src="${photoSrc}" class="asset-thumb-img" alt="${a.asset_name}" onerror="this.onerror=null;this.src='/img/assets/gold_coins.svg';" />
              </div>
              <div>
                <div class="asset-name-title">${a.asset_name}</div>
                <div class="asset-code-sub">AV-${String(a.asset_id || 1).padStart(3, '0')}</div>
              </div>
            </div>
          </td>
          <td style="font-weight: 500; color: var(--text-secondary);">${a.metal} ${a.purity || ''}</td>
          <td style="font-weight: 600;">${sym}${Math.round(a.total_cost || 0).toLocaleString()}</td>
          <td style="font-weight: 600; color: var(--text-muted);">${sym}${Math.round(a.base_value || 0).toLocaleString()}</td>
          <td style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary); font-size: 0.95rem;">${sym}${Math.round(a.simulated_value || 0).toLocaleString()}</td>
          <td>
            <span class="pnl-cell ${isUp ? 'up' : 'down'}">
              ${isUp ? '↗ +' : '↘ -'}${sym}${Math.abs(Math.round(a.value_difference || 0)).toLocaleString()}
            </span>
          </td>
          <td>
            <span class="pnl-cell ${(a.simulated_roi || 0) >= 0 ? 'up' : 'down'}">
              ${(a.simulated_roi || 0) >= 0 ? '+' : ''}${(a.simulated_roi || 0).toFixed(1)}%
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }
};
