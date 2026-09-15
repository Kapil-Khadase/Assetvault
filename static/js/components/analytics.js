// Unified Portfolio Analytics & Stress Simulator Component - Organized Luxury FinTech UI
const AnalyticsComponent = {
  currentShock: {
    gold_shock: 0,
    silver_shock: 0,
    plat_shock: 0,
    diamond_shock: 0
  },
  summaryData: null,
  currentTab: 'all', // 'all' | 'allocation' | 'simulator'
  activePreset: 'reset',
  sensitivityData: [],
  searchFilter: '',

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
        <div class="assets-header-row" style="margin-bottom: 16px;">
          <div>
            <h2 class="dash-greeting">Portfolio Analytics & Simulator</h2>
            <p class="dash-subtitle">Analyze asset concentration, liquidity depth, and stress-test physical holdings against market shocks.</p>
          </div>
        </div>

        <!-- 2. Segmented Sub-Tab Switcher -->
        <div class="analytics-tab-nav" role="tablist" aria-label="Analytics view sections">
          <button class="analytics-tab-btn ${this.currentTab === 'all' ? 'active' : ''}" onclick="AnalyticsComponent.setTab('all')" role="tab" aria-selected="${this.currentTab === 'all'}">
            <i data-lucide="layout-grid" style="width: 15px; height: 15px;"></i> All Insights
          </button>
          <button class="analytics-tab-btn ${this.currentTab === 'allocation' ? 'active' : ''}" onclick="AnalyticsComponent.setTab('allocation')" role="tab" aria-selected="${this.currentTab === 'allocation'}">
            <i data-lucide="pie-chart" style="width: 15px; height: 15px;"></i> Portfolio Allocation
          </button>
          <button class="analytics-tab-btn ${this.currentTab === 'simulator' ? 'active' : ''}" onclick="AnalyticsComponent.setTab('simulator')" role="tab" aria-selected="${this.currentTab === 'simulator'}">
            <i data-lucide="sliders" style="width: 15px; height: 15px;"></i> Stress Simulator ("What-If")
          </button>
        </div>

        <!-- 3. Risk & Performance Ribbon -->
        <div id="analytics-section-ribbon" class="kpi-row" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Dominant Asset Class</div>
            <div class="kpi-value" id="analytics-ribbon-dominant" style="font-size: 1.4rem; color: var(--gold-button);">--</div>
            <div class="kpi-subtext" id="analytics-ribbon-dominant-sub">Calculating holdings...</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Liquidity Depth</div>
            <div class="kpi-value" id="analytics-ribbon-liquidity" style="font-size: 1.4rem; color: var(--gain-green);">--</div>
            <div class="kpi-subtext">Instant bullion & SGB resale depth</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Portfolio Volatility</div>
            <div class="kpi-value" id="analytics-ribbon-volatility" style="font-size: 1.4rem;">--</div>
            <div class="kpi-subtext">Physical precious metal hedge ratio</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Historical Alpha</div>
            <div class="kpi-value" id="analytics-ribbon-roi" style="font-size: 1.4rem; color: var(--gain-green);">--</div>
            <div class="kpi-subtext">Total unrealized portfolio gain</div>
          </div>
        </div>

        <!-- 4. Allocation & Concentration Section -->
        <div id="analytics-section-allocation" class="charts-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
          <!-- Left: Allocation Donut & Legend -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 class="card-heading">Precious Metal Allocation</h3>
                <p class="card-subheading">Weight distribution by bullion spot valuation</p>
              </div>
            </div>

            <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-top: 10px;">
              <div class="donut-chart-wrapper" style="width: 180px; height: 180px; position: relative;">
                <canvas id="analytics-donut-chart"></canvas>
              </div>
              <div style="flex: 1; min-width: 210px;" id="analytics-allocation-breakdown">
                <!-- Injected via JS -->
              </div>
            </div>
          </div>

          <!-- Right: Category Distribution -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h3 class="card-heading">Asset Category Concentration</h3>
                <p class="card-subheading">Holdings distribution across Jewellery, Bullion, and Diamonds</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;" id="analytics-category-bars">
              <!-- Injected via JS -->
            </div>
          </div>
        </div>

        <!-- 5. Interactive Stress-Testing & Simulation Engine -->
        <div id="analytics-section-simulator" style="margin-bottom: 24px;">
          <div class="card" style="border: 1px solid rgba(212, 175, 55, 0.35);">
            <div class="workspace-card-header" style="margin-bottom: 18px;">
              <div>
                <h3 class="workspace-card-title">
                  <i data-lucide="sliders" style="color: var(--gold-button); width: 18px;"></i> Market Price Shock Simulator ("What-If" Engine)
                </h3>
                <p class="workspace-card-sub">Stress-test your physical vault holdings under hypothetical bullion and gem price shocks in real time.</p>
              </div>
            </div>

            <!-- Scenario Presets Bar -->
            <div style="margin-bottom: 20px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 16px;">
              <div style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;">
                One-Click Macro Shock Presets:
              </div>
              <div class="preset-grid">
                <button type="button" class="preset-card ${this.activePreset === 'bull_rally' ? 'active' : ''}" onclick="AnalyticsComponent.applyPreset('bull_rally', 15, 25, 10, 0)">
                  <i data-lucide="trending-up" style="color: var(--gain-green); width: 16px; height: 16px;"></i>
                  <div>
                    <div>Bull Rally</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">+15% Au, +25% Ag</div>
                  </div>
                </button>

                <button type="button" class="preset-card ${this.activePreset === 'market_dip' ? 'active' : ''}" onclick="AnalyticsComponent.applyPreset('market_dip', -15, -25, -10, -5)">
                  <i data-lucide="trending-down" style="color: var(--loss-red); width: 16px; height: 16px;"></i>
                  <div>
                    <div>Market Dip</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">-15% Au, -25% Ag</div>
                  </div>
                </button>

                <button type="button" class="preset-card ${this.activePreset === 'supercycle' ? 'active' : ''}" onclick="AnalyticsComponent.applyPreset('supercycle', 30, 30, 30, 20)">
                  <i data-lucide="zap" style="color: var(--gold-button); width: 16px; height: 16px;"></i>
                  <div>
                    <div>Supercycle</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">+30% All Metals</div>
                  </div>
                </button>

                <button type="button" class="preset-card ${this.activePreset === 'diamond_surge' ? 'active' : ''}" onclick="AnalyticsComponent.applyPreset('diamond_surge', 10, 5, 5, 25)">
                  <i data-lucide="gem" style="color: #0284C7; width: 16px; height: 16px;"></i>
                  <div>
                    <div>Gems Surge</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">+25% Diamond, +10% Au</div>
                  </div>
                </button>

                <button type="button" class="preset-card ${this.activePreset === 'reset' ? 'active' : ''}" onclick="AnalyticsComponent.applyPreset('reset', 0, 0, 0, 0)">
                  <i data-lucide="rotate-ccw" style="color: var(--text-muted); width: 16px; height: 16px;"></i>
                  <div>
                    <div>Spot Baseline</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">Reset (0%)</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Simulator Two-Column Layout -->
            <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 24px; align-items: start;">
              <!-- Left: Sliders Grid -->
              <div>
                <!-- Gold Slider -->
                <div class="slider-control-card">
                  <div class="slider-head">
                    <div class="slider-title-wrap">
                      <span class="cat-dot gold"></span>
                      <span>Gold Price Shock</span>
                      <span class="slider-badge" id="slider-val-gold" style="color: var(--gold-button); background: rgba(245, 158, 11, 0.14);">0%</span>
                    </div>
                    <div class="slider-actions">
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('gold', -5)">-5%</button>
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('gold', 5)">+5%</button>
                    </div>
                  </div>
                  <input type="range" class="range-slider" id="sim-gold-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" aria-label="Gold price shock percentage" />
                </div>

                <!-- Silver Slider -->
                <div class="slider-control-card">
                  <div class="slider-head">
                    <div class="slider-title-wrap">
                      <span class="cat-dot silver"></span>
                      <span>Silver Price Shock</span>
                      <span class="slider-badge" id="slider-val-silver" style="color: var(--text-secondary); background: rgba(148, 163, 184, 0.16);">0%</span>
                    </div>
                    <div class="slider-actions">
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('silver', -5)">-5%</button>
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('silver', 5)">+5%</button>
                    </div>
                  </div>
                  <input type="range" class="range-slider" id="sim-silver-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" aria-label="Silver price shock percentage" />
                </div>

                <!-- Platinum Slider -->
                <div class="slider-control-card">
                  <div class="slider-head">
                    <div class="slider-title-wrap">
                      <span class="cat-dot platinum"></span>
                      <span>Platinum Price Shock</span>
                      <span class="slider-badge" id="slider-val-plat" style="color: #9333EA; background: rgba(147, 51, 234, 0.14);">0%</span>
                    </div>
                    <div class="slider-actions">
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('plat', -5)">-5%</button>
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('plat', 5)">+5%</button>
                    </div>
                  </div>
                  <input type="range" class="range-slider" id="sim-plat-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" aria-label="Platinum price shock percentage" />
                </div>

                <!-- Diamond Slider -->
                <div class="slider-control-card">
                  <div class="slider-head">
                    <div class="slider-title-wrap">
                      <span class="cat-dot diamond"></span>
                      <span>Diamond Price Shock</span>
                      <span class="slider-badge" id="slider-val-diamond" style="color: #0284C7; background: rgba(2, 132, 199, 0.14);">0%</span>
                    </div>
                    <div class="slider-actions">
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('diamond', -5)">-5%</button>
                      <button type="button" class="slider-step-btn" onclick="AnalyticsComponent.stepSlider('diamond', 5)">+5%</button>
                    </div>
                  </div>
                  <input type="range" class="range-slider" id="sim-diamond-slider" min="-50" max="100" value="0" step="5" oninput="AnalyticsComponent.onSliderInput()" aria-label="Diamond price shock percentage" />
                </div>
              </div>

              <!-- Right: Executive Simulated Outcome Card -->
              <div class="sim-outcome-hero">
                <div class="sim-outcome-top">
                  <div class="sim-tag-group">
                    <span class="sim-tag-label">Projected Portfolio Valuation</span>
                    <div class="sim-baseline-pill" id="sim-impact-tag">
                      <i data-lucide="anchor" style="width: 13px; height: 13px; color: var(--text-muted);"></i>
                      <span>Baseline: ${sym}0</span>
                    </div>
                  </div>
                  <div class="sim-status-pill neutral" id="sim-scenario-badge">
                    <span class="metal-dot" style="background: currentColor;"></span>
                    <span id="sim-scenario-text">Spot Baseline</span>
                  </div>
                </div>

                <!-- Large Simulated Valuation Hero -->
                <div class="sim-hero-val" id="sim-total-display">${sym}0</div>

                <!-- 3-Tile KPI Grid -->
                <div class="sim-kpi-grid">
                  <div class="sim-kpi-tile">
                    <span class="sim-tile-label">Net Projected Shift</span>
                    <span class="sim-tile-val" id="sim-diff-display">+${sym}0 (0.0%)</span>
                  </div>
                  <div class="sim-kpi-tile">
                    <span class="sim-tile-label">Simulated P&L</span>
                    <span class="sim-tile-val" id="sim-pnl-display" style="color: var(--gain-green);">+${sym}0</span>
                  </div>
                  <div class="sim-kpi-tile">
                    <span class="sim-tile-label">Simulated ROI</span>
                    <span class="sim-tile-val" id="sim-roi-display" style="color: var(--gain-green);">+0.0%</span>
                  </div>
                </div>

                <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
                  * Simulated valuations model hypothetical market price shocks instantly without modifying your recorded acquisitions.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Asset-by-Asset Sensitivity Matrix Table -->
        <div id="analytics-section-sensitivity" class="table-card">
          <div class="sensitivity-toolbar">
            <div>
              <h3 class="workspace-card-title" style="margin-bottom: 2px;">
                <i data-lucide="layers" style="color: var(--gold-button); width: 17px;"></i> Asset-by-Asset Sensitivity Analysis
              </h3>
              <p class="workspace-card-sub" style="margin: 0;">Granular valuation reaction of each asset under the active simulated price shocks.</p>
            </div>

            <div class="sensitivity-search-wrap">
              <i data-lucide="search" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
              <input type="text" class="sensitivity-search-input" id="sim-table-search" placeholder="Filter assets in matrix..." oninput="AnalyticsComponent.onTableSearch(this.value)" aria-label="Filter sensitivity matrix" />
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
    this.updateTabVisibility();
  },

  setTab(tab) {
    this.currentTab = tab;
    const buttons = document.querySelectorAll('.analytics-tab-btn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    const activeBtn = Array.from(buttons).find(b => b.getAttribute('onclick')?.includes(`'${tab}'`));
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }

    this.updateTabVisibility();
  },

  updateTabVisibility() {
    const ribbon = document.getElementById('analytics-section-ribbon');
    const allocation = document.getElementById('analytics-section-allocation');
    const simulator = document.getElementById('analytics-section-simulator');
    const sensitivity = document.getElementById('analytics-section-sensitivity');

    if (!ribbon || !allocation || !simulator || !sensitivity) return;

    if (this.currentTab === 'allocation') {
      ribbon.style.display = 'grid';
      allocation.style.display = 'grid';
      simulator.style.display = 'none';
      sensitivity.style.display = 'none';
    } else if (this.currentTab === 'simulator') {
      ribbon.style.display = 'none';
      allocation.style.display = 'none';
      simulator.style.display = 'block';
      sensitivity.style.display = 'block';
    } else {
      // 'all'
      ribbon.style.display = 'grid';
      allocation.style.display = 'grid';
      simulator.style.display = 'block';
      sensitivity.style.display = 'block';
    }
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
      gold: 'var(--gold-button)',
      diamond: '#0284C7',
      silver: '#94A3B8',
      platinum: '#9333EA'
    };

    container.innerHTML = items.map(i => {
      const l = (i.label || '').toLowerCase();
      let dot = 'var(--gain-green)';
      if (l.includes('gold')) dot = dotColors.gold;
      else if (l.includes('diamond')) dot = dotColors.diamond;
      else if (l.includes('silver')) dot = dotColors.silver;
      else if (l.includes('plat')) dot = dotColors.platinum;

      const pct = i.percentage !== undefined ? i.percentage : ((i.value / totalVal) * 100).toFixed(1);
      return `
        <div class="alloc-item" style="padding: 8px 0; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <div class="alloc-left" style="display: flex; align-items: center; gap: 8px;">
            <span class="metal-dot" style="background: ${dot};"></span>
            <span class="alloc-name" style="font-weight: 600; font-size: 0.84rem;">${i.label}</span>
          </div>
          <div class="alloc-right" style="display: flex; align-items: center; gap: 10px;">
            <span class="slider-badge" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.74rem;">${pct}%</span>
            <span class="alloc-amount" style="font-weight: 700; font-size: 0.86rem; min-width: 80px; text-align: right;">${sym}${Math.round(i.value).toLocaleString()}</span>
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

    const catColors = ['var(--gold-button)', '#0284C7', 'var(--gain-green)', '#9333EA', '#F59E0B'];

    container.innerHTML = items.map((c, idx) => {
      const color = catColors[idx % catColors.length];
      const pct = c.percentage !== undefined ? c.percentage : ((c.value / totalVal) * 100).toFixed(1);
      return `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 5px;">
            <span><i data-lucide="gem" style="width: 13px; color: ${color}; vertical-align: middle;"></i> ${c.label}</span>
            <span style="font-weight: 700;">${pct}%</span>
          </div>
          <div style="height: 8px; background: var(--bg-primary); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  onSliderInput() {
    const g = parseFloat(document.getElementById('sim-gold-slider')?.value) || 0;
    const s = parseFloat(document.getElementById('sim-silver-slider')?.value) || 0;
    const p = parseFloat(document.getElementById('sim-plat-slider')?.value) || 0;
    const d = parseFloat(document.getElementById('sim-diamond-slider')?.value) || 0;

    const goldValEl = document.getElementById('slider-val-gold');
    const silverValEl = document.getElementById('slider-val-silver');
    const platValEl = document.getElementById('slider-val-plat');
    const diamondValEl = document.getElementById('slider-val-diamond');

    if (goldValEl) goldValEl.innerText = `${g >= 0 ? '+' : ''}${g}%`;
    if (silverValEl) silverValEl.innerText = `${s >= 0 ? '+' : ''}${s}%`;
    if (platValEl) platValEl.innerText = `${p >= 0 ? '+' : ''}${p}%`;
    if (diamondValEl) diamondValEl.innerText = `${d >= 0 ? '+' : ''}${d}%`;

    this.currentShock = { gold_shock: g, silver_shock: s, plat_shock: p, diamond_shock: d };
    this.runSimulation();
  },

  stepSlider(metal, delta) {
    const idMap = {
      gold: 'sim-gold-slider',
      silver: 'sim-silver-slider',
      plat: 'sim-plat-slider',
      diamond: 'sim-diamond-slider'
    };

    const slider = document.getElementById(idMap[metal]);
    if (!slider) return;

    let val = parseFloat(slider.value) || 0;
    val = Math.max(-50, Math.min(100, val + delta));
    slider.value = val;

    this.activePreset = 'custom';
    this.updatePresetButtons();
    this.onSliderInput();
  },

  applyPreset(presetKey, g, s, p, d) {
    this.activePreset = presetKey;
    const goldSlider = document.getElementById('sim-gold-slider');
    const silverSlider = document.getElementById('sim-silver-slider');
    const platSlider = document.getElementById('sim-plat-slider');
    const diamondSlider = document.getElementById('sim-diamond-slider');

    if (goldSlider) goldSlider.value = g;
    if (silverSlider) silverSlider.value = s;
    if (platSlider) platSlider.value = p;
    if (diamondSlider) diamondSlider.value = d;

    this.updatePresetButtons();
    this.onSliderInput();
  },

  updatePresetButtons() {
    const buttons = document.querySelectorAll('.preset-card');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(`'${this.activePreset}'`)) {
        btn.classList.add('active');
      }
    });
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
      const scenarioBadge = document.getElementById('sim-scenario-badge');
      const scenarioText = document.getElementById('sim-scenario-text');

      if (tagEl) tagEl.innerHTML = `<i data-lucide="anchor" style="width: 13px; height: 13px; color: var(--text-muted);"></i><span>Baseline: ${sym}${Math.round(baseVal).toLocaleString()}</span>`;
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

      // Update Scenario Sentiment Badge
      if (scenarioBadge && scenarioText) {
        scenarioBadge.className = 'sim-status-pill';
        if (Math.abs(diffVal) < 10) {
          scenarioBadge.classList.add('neutral');
          scenarioText.innerText = 'Spot Baseline';
        } else if (diffVal > 0) {
          scenarioBadge.classList.add('favorable');
          scenarioText.innerText = `Favorable Shock (+${diffPct.toFixed(1)}%)`;
        } else {
          scenarioBadge.classList.add('adverse');
          scenarioText.innerText = `Adverse Drawdown (${diffPct.toFixed(1)}%)`;
        }
      }

      this.sensitivityData = sim.asset_simulations || [];
      this.renderSensitivityTable(sym);
    } catch (e) {
      console.error('Simulation error:', e);
    }
  },

  onTableSearch(query) {
    this.searchFilter = (query || '').toLowerCase().trim();
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';
    this.renderSensitivityTable(sym);
  },

  renderSensitivityTable(sym) {
    const tbody = document.getElementById('sim-sensitivity-tbody');
    if (!tbody) return;

    let items = this.sensitivityData || [];
    if (this.searchFilter) {
      items = items.filter(a => {
        const name = (a.asset_name || '').toLowerCase();
        const metal = (a.metal || '').toLowerCase();
        const purity = (a.purity || '').toLowerCase();
        return name.includes(this.searchFilter) || metal.includes(this.searchFilter) || purity.includes(this.searchFilter);
      });
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">${this.searchFilter ? 'No matching assets found for this search filter.' : 'No active assets available in vault for simulation.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(a => {
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
          <td style="font-weight: 600; color: var(--text-secondary);">${a.metal} ${a.purity || ''}</td>
          <td style="font-weight: 600;">${sym}${Math.round(a.total_cost || 0).toLocaleString()}</td>
          <td style="font-weight: 600; color: var(--text-muted);">${sym}${Math.round(a.base_value || 0).toLocaleString()}</td>
          <td style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary); font-size: 0.95rem;">${sym}${Math.round(a.simulated_value || 0).toLocaleString()}</td>
          <td>
            <div class="pnl-stack ${isUp ? 'up' : 'down'}">
              <span class="pnl-val">${isUp ? '+' : '-'}${sym}${Math.abs(Math.round(a.value_difference || 0)).toLocaleString()}</span>
              <span class="pnl-badge">${isUp ? '↗' : '↘'} ${((Math.abs(a.value_difference || 0) / (a.base_value || 1)) * 100).toFixed(1)}%</span>
            </div>
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
