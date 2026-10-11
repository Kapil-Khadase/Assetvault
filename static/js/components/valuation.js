// AssetVault Market Rates & Bullion Valuation Engine Component - Ultra-Organized Luxury FinTech UI
const ValuationComponent = {
  currentCategory: 'all', // 'all' | 'gold' | 'silver' | 'platinum'
  currentDays: 30,
  activeChartMetals: { gold24: true, gold22: true, silver: true, plat: true },
  latestRates: null,
  prevRates: null,
  marketInfo: null,
  tickerTimer: null,

  calcState: {
    metal: 'GOLD',
    purity: '22K',
    weight: 10.0,
    makingPct: 0,
    includeGst: false
  },

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update Topbar Breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Insights / Market Rates';

    const curr = API.getCurrency();
    const sym = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : '£'));

    container.innerHTML = `
      <div class="market-view-container">
        <!-- 1. Header Banner with Live Exchange Indicator & Actions -->
        <div class="market-header-card">
          <div class="market-header-info">
            <div class="market-header-badge">
              <span class="pulse-indicator"></span>
              <span id="market-feed-label">LIVE BULLION BENCHMARK &bull; IBJA & DOMESTIC RETAIL FEED</span>
            </div>
            <div id="market-sync-status" style="font-size: 0.76rem; color: var(--text-muted); margin: 6px 0 2px 2px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="clock" style="width: 12px; color: var(--gold-light);"></i>
              <span id="market-sync-time">Synchronizing live market spot...</span>
            </div>
            <h1 class="market-header-title">Bullion Market Rates & Valuation Engine</h1>
            <p class="market-header-desc">Real-time purity-calibrated rates for 24K/22K/18K gold, 999/925 silver, platinum, and certified diamond benchmarks with integrated valuation calculator.</p>
          </div>

          <div class="market-header-actions">
            <!-- Currency Switcher Pill Group -->
            <div class="curr-pill-group">
              <button class="curr-pill ${curr === 'INR' ? 'active' : ''}" onclick="ValuationComponent.setCurrency('INR')">₹ INR</button>
              <button class="curr-pill ${curr === 'USD' ? 'active' : ''}" onclick="ValuationComponent.setCurrency('USD')">$ USD</button>
              <button class="curr-pill ${curr === 'EUR' ? 'active' : ''}" onclick="ValuationComponent.setCurrency('EUR')">€ EUR</button>
              <button class="curr-pill ${curr === 'GBP' ? 'active' : ''}" onclick="ValuationComponent.setCurrency('GBP')">£ GBP</button>
            </div>

            <button class="btn btn-secondary" onclick="App.navigate('alerts')" title="Configure custom threshold alerts">
              <i data-lucide="bell" style="width: 15px;"></i> Price Alerts
            </button>

            <button class="btn btn-primary" id="btn-sync-rates" onclick="ValuationComponent.syncRates()">
              <i data-lucide="refresh-cw" id="sync-spin-icon" style="width: 15px;"></i> Sync Rates
            </button>
          </div>
        </div>

        <!-- 2. Rate Category Tabs Filter -->
        <div class="market-category-tabs">
          <button class="market-tab ${this.currentCategory === 'all' ? 'active' : ''}" onclick="ValuationComponent.switchCategory('all')">
            <i data-lucide="layers" style="width: 15px;"></i> All Metals
          </button>
          <button class="market-tab ${this.currentCategory === 'gold' ? 'active' : ''}" onclick="ValuationComponent.switchCategory('gold')">
            <span class="cat-dot gold"></span> Gold Suite (24K, 22K, 18K, 14K)
          </button>
          <button class="market-tab ${this.currentCategory === 'silver' ? 'active' : ''}" onclick="ValuationComponent.switchCategory('silver')">
            <span class="cat-dot silver"></span> Silver Suite (999 Fine, 925 Sterling)
          </button>
          <button class="market-tab ${this.currentCategory === 'platinum' ? 'active' : ''}" onclick="ValuationComponent.switchCategory('platinum')">
            <span class="cat-dot platinum"></span> Platinum & Solitaires
          </button>
        </div>

        <!-- 3. Organized Live Spot Cards Grid -->
        <div class="market-cards-grid" id="market-cards-container">
          <div class="loading-state">
            <i data-lucide="loader-2" class="spin"></i> Loading live bullion benchmarks...
          </div>
        </div>

        <!-- 4. Split Analytics & Calculator Workspace (Two Balanced Columns) -->
        <div class="market-workspace-grid">
          
          <!-- LEFT: Commodity Price Trajectory & Historical Multi-line Chart -->
          <div class="workspace-card chart-card">
            <div class="workspace-card-header">
              <div>
                <h3 class="workspace-card-title">
                  <i data-lucide="trending-up" style="color: var(--gold-light); width: 18px;"></i> Price Trajectory & Historical Trends
                </h3>
                <p class="workspace-card-sub">Daily market rate movement calibrated to domestic spot exchange.</p>
              </div>

              <!-- Timeframe Selector -->
              <div class="timeframe-btn-group">
                <button class="tf-btn ${this.currentDays === 7 ? 'active' : ''}" onclick="ValuationComponent.changeTimeframe(7)">7D</button>
                <button class="tf-btn ${this.currentDays === 30 ? 'active' : ''}" onclick="ValuationComponent.changeTimeframe(30)">30D</button>
                <button class="tf-btn ${this.currentDays === 90 ? 'active' : ''}" onclick="ValuationComponent.changeTimeframe(90)">90D</button>
                <button class="tf-btn ${this.currentDays === 365 ? 'active' : ''}" onclick="ValuationComponent.changeTimeframe(365)">1Y</button>
              </div>
            </div>

            <!-- Chart Canvas Container -->
            <div class="chart-canvas-wrapper" style="height: 330px; position: relative;">
              <canvas id="market-trends-chart"></canvas>
            </div>

            <!-- Statistical Benchmarks Ribbon Underneath Chart -->
            <div class="market-stats-ribbon">
              <div class="stat-ribbon-item">
                <span class="stat-ribbon-label">30D Gold High</span>
                <span class="stat-ribbon-val" id="stat-gold-high">₹15,780/g</span>
              </div>
              <div class="stat-ribbon-item">
                <span class="stat-ribbon-label">30D Gold Low</span>
                <span class="stat-ribbon-val" id="stat-gold-low">₹15,190/g</span>
              </div>
              <div class="stat-ribbon-item">
                <span class="stat-ribbon-label">30D Silver Net</span>
                <span class="stat-ribbon-val up">+3.8%</span>
              </div>
              <div class="stat-ribbon-item">
                <span class="stat-ribbon-label">Landed Duty & GST</span>
                <span class="stat-ribbon-val">11.0% Included</span>
              </div>
            </div>
          </div>

          <!-- RIGHT: Interactive Purity & Melt Valuation Calculator -->
          <div class="workspace-card calc-card">
            <div class="workspace-card-header">
              <div>
                <h3 class="workspace-card-title">
                  <i data-lucide="calculator" style="color: var(--gold-light); width: 18px;"></i> Valuation & Melt Calculator
                </h3>
                <p class="workspace-card-sub">Instantly estimate pure metal melt value and replacement cost.</p>
              </div>
            </div>

            <div class="calc-body">
              <!-- Metal Selector Chips -->
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Select Metal</label>
                <div class="calc-metal-chips">
                  <button type="button" class="metal-chip ${this.calcState.metal === 'GOLD' ? 'active' : ''}" onclick="ValuationComponent.setCalcMetal('GOLD')">
                    <span class="cat-dot gold"></span> Gold
                  </button>
                  <button type="button" class="metal-chip ${this.calcState.metal === 'SILVER' ? 'active' : ''}" onclick="ValuationComponent.setCalcMetal('SILVER')">
                    <span class="cat-dot silver"></span> Silver
                  </button>
                  <button type="button" class="metal-chip ${this.calcState.metal === 'PLATINUM' ? 'active' : ''}" onclick="ValuationComponent.setCalcMetal('PLATINUM')">
                    <span class="cat-dot platinum"></span> Platinum
                  </button>
                  <button type="button" class="metal-chip ${this.calcState.metal === 'DIAMOND' ? 'active' : ''}" onclick="ValuationComponent.setCalcMetal('DIAMOND')">
                    <span class="cat-dot diamond"></span> Diamond
                  </button>
                </div>
              </div>

              <!-- Purity Pill Selector -->
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Purity Standard</label>
                <div class="purity-pills-row" id="calc-purity-container">
                  <!-- Injected via JS based on selected metal -->
                </div>
              </div>

              <!-- Weight Input & Quick Increments -->
              <div class="form-group" style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" id="calc-weight-label" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin: 0;">Net Weight (Grams)</label>
                  <span style="font-size: 0.74rem; color: var(--text-muted);">Hallmark net purity weight</span>
                </div>
                
                <div class="weight-input-wrapper">
                  <input type="number" step="0.01" min="0.01" class="form-control weight-input" id="calc-weight-input" value="10.0" oninput="ValuationComponent.onWeightChange(this.value)" />
                  <span class="weight-unit-badge" id="calc-unit-badge">g</span>
                </div>

                <!-- Quick Presets -->
                <div class="quick-presets-row" id="calc-presets-row">
                  <button type="button" class="preset-pill" onclick="ValuationComponent.addWeight(1)">+1g</button>
                  <button type="button" class="preset-pill" onclick="ValuationComponent.setExactWeight(8)">8g (1 Sov)</button>
                  <button type="button" class="preset-pill" onclick="ValuationComponent.setExactWeight(10)">10g (1 Tola)</button>
                  <button type="button" class="preset-pill" onclick="ValuationComponent.addWeight(10)">+10g</button>
                  <button type="button" class="preset-pill" onclick="ValuationComponent.setExactWeight(100)">100g Bar</button>
                  <button type="button" class="preset-pill" onclick="ValuationComponent.setExactWeight(1000)">1 kg</button>
                </div>
              </div>

              <!-- Optional Commercial Adjustments (Making Charges & GST) -->
              <div class="calc-adjustments-box">
                <div class="adjustment-row">
                  <label style="font-size: 0.78rem; color: var(--text-secondary);">Making Charges / Wastage</label>
                  <select class="form-control adjustment-select" id="calc-making-select" onchange="ValuationComponent.onMakingChange(this.value)">
                    <option value="0" selected>0% (Pure Melt Bullion)</option>
                    <option value="6">6% (Minted Coins / Bars)</option>
                    <option value="10">10% (Standard Jewellery)</option>
                    <option value="14">14% (Antique Nakshi Work)</option>
                  </select>
                </div>

                <div class="adjustment-row" style="margin-top: 8px;">
                  <label style="font-size: 0.78rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="calc-gst-check" onchange="ValuationComponent.onGstToggle(this.checked)" />
                    <span>Include 3% Jewellery GST</span>
                  </label>
                  <span style="font-size: 0.74rem; color: var(--text-muted);" id="calc-gst-amount">+₹0</span>
                </div>
              </div>

              <!-- Valuation Receipt Result Card -->
              <div class="valuation-result-box">
                <div class="val-res-header">
                  <span class="val-res-tag">ESTIMATED VALUATION</span>
                  <span class="val-res-sub" id="calc-rate-benchmark">Rate: ₹14,240 / g</span>
                </div>

                <div class="val-res-primary-val" id="calc-total-display">₹1,42,400</div>

                <div class="val-res-breakdown">
                  <div class="breakdown-item">
                    <span class="breakdown-label">Metal Melt Value:</span>
                    <span class="breakdown-val" id="calc-melt-val">₹1,42,400</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">Making Charges:</span>
                    <span class="breakdown-val" id="calc-making-val">₹0</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">Applicable GST (3%):</span>
                    <span class="breakdown-val" id="calc-tax-val">₹0</span>
                  </div>
                </div>

                <button class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; margin-top: 14px;" onclick="ValuationComponent.openAddWithCalc()">
                  <i data-lucide="plus-circle" style="width: 14px;"></i> Record Asset at this Valuation
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Structured Indian Bullion Market Reference Matrix Table -->
        <div class="market-table-card">
          <div class="workspace-card-header">
            <div>
              <h3 class="workspace-card-title">
                <i data-lucide="table" style="color: var(--gold-light); width: 18px;"></i> Domestic Bullion Reference Matrix
              </h3>
              <p class="workspace-card-sub">Official standard grade benchmarks, purity specifications, and multi-unit conversions.</p>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              Rates updated live &bull; Sourced from domestic bullion exchange
            </div>
          </div>

          <div class="table-responsive">
            <table class="market-matrix-table">
              <thead>
                <tr>
                  <th>Metal & Grade</th>
                  <th>Hallmark Purity</th>
                  <th>Spot Rate (/g)</th>
                  <th>10 Grams (Tola)</th>
                  <th>100g / 1kg Bar</th>
                  <th>24h Movement</th>
                  <th>Primary Application</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="market-matrix-tbody">
                <!-- Populated dynamically via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Stop any previous ticker before re-rendering
    this.stopLiveTicker();

    // Load Live Rates and render cards
    await this.loadRates(true);
    await this.loadChart(this.currentDays);
    this.updatePurityOptions();
    this.computeValuation();

    // Start continuous live ticker polling
    this.startLiveTicker();
  },

  switchCategory(cat) {
    this.currentCategory = cat;
    document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.market-tab')).find(b => 
      cat === 'all' ? b.innerText.includes('All Metals') :
      (cat === 'gold' ? b.innerText.includes('Gold Suite') :
      (cat === 'silver' ? b.innerText.includes('Silver Suite') : b.innerText.includes('Platinum')))
    );
    if (btn) btn.classList.add('active');
    this.renderRateCards();
  },

  startLiveTicker() {
    this.stopLiveTicker();
    this.tickerTimer = setInterval(async () => {
      const container = document.getElementById('market-cards-container');
      if (!container) {
        this.stopLiveTicker();
        return;
      }
      try {
        await this.loadRates(true);
      } catch (e) {
        console.warn("Live ticker poll error:", e);
      }
    }, 8000);
  },

  stopLiveTicker() {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }
  },

  async loadRates(force = false) {
    try {
      const data = await API.getMarketRates(force);
      const newRates = data.rates || {};
      this.marketInfo = data.market_info || null;

      const previous = this.latestRates ? { ...this.latestRates } : null;
      this.latestRates = newRates;

      // Update Header Feed Label with status badge
      const feedLabel = document.getElementById('market-feed-label');
      if (feedLabel) {
        if (this.marketInfo) {
          const isOpen = this.marketInfo.is_open;
          const statusText = this.marketInfo.status_label || (isOpen ? 'Live Exchange Spot Feed' : 'Market Closed');
          feedLabel.innerHTML = `<span class="ticker-pulse-dot ${isOpen ? 'online' : 'closed'}"></span>${statusText.toUpperCase()}`;
        } else if (newRates['GOLD_24K']) {
          const src = newRates['GOLD_24K'].status_label || 'Live Bullion Benchmark';
          feedLabel.innerText = `LIVE BENCHMARK • ${src.toUpperCase()}`;
        }
      }

      // Update live sync timestamp & source
      const syncTimeEl = document.getElementById('market-sync-time');
      if (syncTimeEl && newRates['GOLD_24K']) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const provider = newRates['GOLD_24K'].source || 'Live Exchange Spot';
        const sessionState = this.marketInfo?.is_open ? 'SESSION ACTIVE' : 'SETTLEMENT BENCHMARK';
        const sessionColor = this.marketInfo?.is_open ? 'var(--gain-green)' : 'var(--text-muted)';
        syncTimeEl.innerHTML = `Live Feed Synced: <strong style="color: var(--text-primary);">${timeStr}</strong> &bull; Provider: <span style="color: var(--gold-light);">${provider}</span> &bull; Market: <strong style="color: ${sessionColor};">${sessionState}</strong>`;
      }

      // If cards already rendered in DOM, update in-place with smooth tick animation
      const existingCards = document.querySelectorAll('.market-rate-card[data-card-key]');
      if (existingCards.length > 0 && previous) {
        this.updateRateCardsInPlace(previous, newRates);
      } else {
        this.renderRateCards();
      }

      this.renderMatrixTable();
      this.updateRibbonStats();
      this.computeValuation();
    } catch (e) {
      console.error("Failed to load rates:", e);
      const container = document.getElementById('market-cards-container');
      if (container && (!this.latestRates || Object.keys(this.latestRates).length === 0)) {
        container.innerHTML = `<div class="error-state">Unable to load live market rates. Please check connection.</div>`;
      }
    }
  },

  updateRateCardsInPlace(oldRates, newRates) {
    const sym = API.getCurrencySymbol();
    for (const [key, item] of Object.entries(newRates)) {
      const card = document.querySelector(`.market-rate-card[data-card-key="${key}"]`);
      if (!card) continue;

      const oldItem = oldRates[key];
      const oldRate = oldItem ? Number(oldItem.rate_per_gram) : null;
      const newRate = Number(item.rate_per_gram);

      const priceNumEl = card.querySelector('.rate-main-num');
      const changeTag = card.querySelector('.rate-change-tag');
      const subunitsEl = card.querySelector('.rate-card-subunits');

      if (priceNumEl) {
        priceNumEl.innerText = Math.round(newRate).toLocaleString();
      }

      // Check if price moved up or down
      if (oldRate !== null && newRate !== oldRate && priceNumEl) {
        const tickUp = newRate > oldRate;
        priceNumEl.classList.remove('price-tick-up', 'price-tick-down');
        card.classList.remove('price-card-tick-up', 'price-card-tick-down');

        // Force reflow to retrigger animation
        void priceNumEl.offsetWidth;

        if (tickUp) {
          priceNumEl.classList.add('price-tick-up');
          card.classList.add('price-card-tick-up');
        } else {
          priceNumEl.classList.add('price-tick-down');
          card.classList.add('price-card-tick-down');
        }

        setTimeout(() => {
          if (priceNumEl) priceNumEl.classList.remove('price-tick-up', 'price-tick-down');
          if (card) card.classList.remove('price-card-tick-up', 'price-card-tick-down');
        }, 1500);
      }

      // 24h change movement
      let pct = typeof item.change_pct === 'number' ? item.change_pct : 0.0;
      let isUp = pct >= 0;
      if (changeTag) {
        changeTag.className = `rate-change-tag ${isUp ? 'up' : 'down'}`;
        changeTag.innerHTML = `
          <i data-lucide="${isUp ? 'trending-up' : 'trending-down'}" style="width: 12px;"></i>
          ${isUp ? '+' : ''}${pct.toFixed(2)}%
        `;
      }

      // Update subunit breakdown
      if (subunitsEl) {
        if (key === 'GOLD_24K') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(newRate * 8).toLocaleString()} &bull; 100g: ${sym}${Math.round(newRate * 100).toLocaleString()}`;
        } else if (key === 'GOLD_22K') {
          subunitsEl.innerHTML = `10g (Tola): ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(newRate * 8).toLocaleString()}`;
        } else if (key === 'GOLD_18K') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 1 Sov: ${sym}${Math.round(newRate * 8).toLocaleString()}`;
        } else if (key === 'GOLD_14K') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 100g: ${sym}${Math.round(newRate * 100).toLocaleString()}`;
        } else if (key === 'SILVER_999') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 100g: ${sym}${Math.round(newRate * 100).toLocaleString()} &bull; 1 kg: ${sym}${Math.round(newRate * 1000).toLocaleString()}`;
        } else if (key === 'SILVER_925') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 1 kg: ${sym}${Math.round(newRate * 1000).toLocaleString()}`;
        } else if (key === 'PLATINUM_950') {
          subunitsEl.innerHTML = `10g: ${sym}${Math.round(newRate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(newRate * 8).toLocaleString()}`;
        } else if (key === 'DIAMOND_SOLITAIRE') {
          subunitsEl.innerHTML = `0.5 ct: ${sym}${Math.round(newRate * 0.44).toLocaleString()} &bull; 1.0 ct: ${sym}${Math.round(newRate).toLocaleString()} &bull; 2.0 ct: ${sym}${Math.round(newRate * 2.45).toLocaleString()}`;
        }
      }
    }
    if (window.lucide) lucide.createIcons();
  },

  renderRateCards() {
    const container = document.getElementById('market-cards-container');
    if (!container || !this.latestRates) return;

    const sym = API.getCurrency() === 'INR' ? '₹' : (API.getCurrency() === 'USD' ? '$' : (API.getCurrency() === 'EUR' ? '€' : '£'));
    const r = this.latestRates;

    const getChg = (key, fallback = '+0.00%') => {
      const item = r[key];
      if (item && typeof item.change_pct === 'number') {
        const pct = item.change_pct;
        const isUp = pct >= 0;
        return { change: `${isUp ? '+' : ''}${pct.toFixed(2)}%`, isUp };
      }
      return { change: fallback, isUp: !fallback.startsWith('-') };
    };

    const cardsData = [
      {
        key: 'GOLD_24K',
        metal: 'Gold',
        purity: '24K (999)',
        grade: 'Fine Investment Bullion',
        category: 'gold',
        isFeatured: true,
        rate: r['GOLD_24K'] ? r['GOLD_24K'].rate_per_gram : 15535,
        change: getChg('GOLD_24K', '+0.00%').change,
        isUp: getChg('GOLD_24K', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(rate * 8).toLocaleString()} &bull; 100g: ${sym}${Math.round(rate * 100).toLocaleString()}`,
        badge: '99.9% Pure',
        badgeClass: 'gold',
        icon: 'sparkles'
      },
      {
        key: 'GOLD_22K',
        metal: 'Gold',
        purity: '22K (916)',
        grade: 'Hallmarked Jewellery Standard',
        category: 'gold',
        rate: r['GOLD_22K'] ? r['GOLD_22K'].rate_per_gram : 14240,
        change: getChg('GOLD_22K', '+0.00%').change,
        isUp: getChg('GOLD_22K', '+0.00%').isUp,
        subUnits: (rate) => `10g (Tola): ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(rate * 8).toLocaleString()}`,
        badge: '91.67% Fine',
        badgeClass: 'gold',
        icon: 'coins'
      },
      {
        key: 'GOLD_18K',
        metal: 'Gold',
        purity: '18K (750)',
        grade: 'Diamond & Luxury Setting',
        category: 'gold',
        rate: r['GOLD_18K'] ? r['GOLD_18K'].rate_per_gram : 11651,
        change: getChg('GOLD_18K', '+0.00%').change,
        isUp: getChg('GOLD_18K', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 1 Sov: ${sym}${Math.round(rate * 8).toLocaleString()}`,
        badge: '75.0% Fine',
        badgeClass: 'gold',
        icon: 'gem'
      },
      {
        key: 'GOLD_14K',
        metal: 'Gold',
        purity: '14K (585)',
        grade: 'Modern Daily Wear',
        category: 'gold',
        rate: r['GOLD_14K'] ? r['GOLD_14K'].rate_per_gram : 9063,
        change: getChg('GOLD_14K', '+0.00%').change,
        isUp: getChg('GOLD_14K', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 100g: ${sym}${Math.round(rate * 100).toLocaleString()}`,
        badge: '58.3% Fine',
        badgeClass: 'gold',
        icon: 'shield'
      },
      {
        key: 'SILVER_999',
        metal: 'Silver',
        purity: 'Silver 999',
        grade: 'Pure Bullion Bars & Coins',
        category: 'silver',
        rate: r['SILVER_999'] ? r['SILVER_999'].rate_per_gram : 250,
        change: getChg('SILVER_999', '+0.00%').change,
        isUp: getChg('SILVER_999', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 100g: ${sym}${Math.round(rate * 100).toLocaleString()} &bull; 1 kg: ${sym}${Math.round(rate * 1000).toLocaleString()}`,
        badge: '99.9% Pure',
        badgeClass: 'silver',
        icon: 'circle-dot'
      },
      {
        key: 'SILVER_925',
        metal: 'Silver',
        purity: 'Silver 925',
        grade: 'Sterling Silverware & Utensils',
        category: 'silver',
        rate: r['SILVER_925'] ? r['SILVER_925'].rate_per_gram : 231.25,
        change: getChg('SILVER_925', '+0.00%').change,
        isUp: getChg('SILVER_925', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 1 kg: ${sym}${Math.round(rate * 1000).toLocaleString()}`,
        badge: '92.5% Sterling',
        badgeClass: 'silver',
        icon: 'disc'
      },
      {
        key: 'PLATINUM_950',
        metal: 'Platinum',
        purity: 'Platinum 950',
        grade: 'PT950 Certified Hallmarked',
        category: 'platinum',
        rate: r['PLATINUM_950'] ? r['PLATINUM_950'].rate_per_gram : 5379,
        change: getChg('PLATINUM_950', '+0.00%').change,
        isUp: getChg('PLATINUM_950', '+0.00%').isUp,
        subUnits: (rate) => `10g: ${sym}${Math.round(rate * 10).toLocaleString()} &bull; 1 Sov (8g): ${sym}${Math.round(rate * 8).toLocaleString()}`,
        badge: '95.0% Fine',
        badgeClass: 'platinum',
        icon: 'award'
      },
      {
        key: 'DIAMOND_SOLITAIRE',
        metal: 'Diamond',
        purity: 'Solitaire F/VS1',
        grade: 'GIA / IGI Certified Index',
        category: 'platinum',
        rate: r['DIAMOND_SOLITAIRE'] ? r['DIAMOND_SOLITAIRE'].rate_per_gram : 377450,
        unitLabel: '/ carat',
        change: getChg('DIAMOND_SOLITAIRE', '+0.45%').change,
        isUp: getChg('DIAMOND_SOLITAIRE', '+0.45%').isUp,
        subUnits: (rate) => `0.5 ct: ${sym}${Math.round(rate * 0.44).toLocaleString()} &bull; 1.0 ct: ${sym}${Math.round(rate).toLocaleString()} &bull; 2.0 ct: ${sym}${Math.round(rate * 2.45).toLocaleString()}`,
        badge: 'Triple Excellent',
        badgeClass: 'diamond',
        icon: 'diamond'
      }
    ];

    const filtered = this.currentCategory === 'all' ? cardsData : cardsData.filter(c => c.category === this.currentCategory);

    container.innerHTML = filtered.map(item => {
      const isHero = item.isFeatured && this.currentCategory === 'all';
      const formattedRate = Math.round(item.rate).toLocaleString();
      const unit = item.unitLabel || '/ gram';

      return `
        <div class="market-rate-card ${isHero ? 'hero-gold-card' : ''}" data-card-key="${item.key}" onclick="ValuationComponent.quickFillCalc('${item.metal.toUpperCase()}', '${item.purity.split(' ')[0]}')">
          <div class="rate-card-top">
            <div class="rate-metal-badge ${item.badgeClass}">
              <i data-lucide="${item.icon}" style="width: 13px;"></i>
              <span>${item.purity}</span>
            </div>
            <span class="rate-change-tag ${item.isUp ? 'up' : 'down'}">
              <i data-lucide="${item.isUp ? 'trending-up' : 'trending-down'}" style="width: 12px;"></i>
              ${item.change}
            </span>
          </div>

          <div class="rate-card-grade">${item.grade}</div>

          <div class="rate-card-price-row">
            <span class="rate-symbol">${sym}</span>
            <span class="rate-main-num">${formattedRate}</span>
            <span class="rate-unit">${unit}</span>
          </div>

          <div class="rate-card-subunits">
            ${item.subUnits(item.rate)}
          </div>

          <div class="rate-card-footer">
            <span class="click-to-calc-hint">
              <i data-lucide="calculator" style="width: 12px;"></i> Click to calculate
            </span>
            <span class="purity-badge-pill">${item.badge}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  renderMatrixTable() {
    const tbody = document.getElementById('market-matrix-tbody');
    if (!tbody || !this.latestRates) return;

    const sym = API.getCurrency() === 'INR' ? '₹' : (API.getCurrency() === 'USD' ? '$' : (API.getCurrency() === 'EUR' ? '€' : '£'));
    const r = this.latestRates;

    const getChg = (key, fallback = '+0.00%') => {
      const item = r[key];
      if (item && typeof item.change_pct === 'number') {
        const pct = item.change_pct;
        const isUp = pct >= 0;
        return { change: `${isUp ? '+' : ''}${pct.toFixed(2)}%`, isUp };
      }
      return { change: fallback, isUp: !fallback.startsWith('-') };
    };

    const rows = [
      {
        metal: 'Gold 24K',
        dot: 'gold',
        hallmark: '999 (99.9% Pure Bullion)',
        rate: r['GOLD_24K'] ? r['GOLD_24K'].rate_per_gram : 15535,
        change: getChg('GOLD_24K', '+0.00%').change,
        isUp: getChg('GOLD_24K', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 100).toLocaleString()} (100g)`,
        app: 'Minted Coins, Cast Bars, Investment Bullion',
        mKey: 'GOLD',
        pKey: '24K'
      },
      {
        metal: 'Gold 22K',
        dot: 'gold',
        hallmark: '916 (91.67% Hallmarked)',
        rate: r['GOLD_22K'] ? r['GOLD_22K'].rate_per_gram : 14240,
        change: getChg('GOLD_22K', '+0.00%').change,
        isUp: getChg('GOLD_22K', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 100).toLocaleString()} (100g)`,
        app: 'Bridal Jewellery, Necklaces, Kada Bangles',
        mKey: 'GOLD',
        pKey: '22K'
      },
      {
        metal: 'Gold 18K',
        dot: 'gold',
        hallmark: '750 (75.00% Fine)',
        rate: r['GOLD_18K'] ? r['GOLD_18K'].rate_per_gram : 11651,
        change: getChg('GOLD_18K', '+0.00%').change,
        isUp: getChg('GOLD_18K', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 100).toLocaleString()} (100g)`,
        app: 'Solitaire Mounts, Diamond Rings, Rose Gold',
        mKey: 'GOLD',
        pKey: '18K'
      },
      {
        metal: 'Gold 14K',
        dot: 'gold',
        hallmark: '585 (58.33% Daily Wear)',
        rate: r['GOLD_14K'] ? r['GOLD_14K'].rate_per_gram : 9063,
        change: getChg('GOLD_14K', '+0.00%').change,
        isUp: getChg('GOLD_14K', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 100).toLocaleString()} (100g)`,
        app: 'Lightweight Daily Jewellery, Studs, Chains',
        mKey: 'GOLD',
        pKey: '14K'
      },
      {
        metal: 'Silver 999',
        dot: 'silver',
        hallmark: '999 Fine Silver (99.9%)',
        rate: r['SILVER_999'] ? r['SILVER_999'].rate_per_gram : 250,
        change: getChg('SILVER_999', '+0.00%').change,
        isUp: getChg('SILVER_999', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 1000).toLocaleString()} (1 kg)`,
        app: 'Silver Minted Bars, Investment Ingots',
        mKey: 'SILVER',
        pKey: '999'
      },
      {
        metal: 'Silver 925',
        dot: 'silver',
        hallmark: '925 Sterling Silver (92.5%)',
        rate: r['SILVER_925'] ? r['SILVER_925'].rate_per_gram : 231.25,
        change: getChg('SILVER_925', '+0.00%').change,
        isUp: getChg('SILVER_925', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 1000).toLocaleString()} (1 kg)`,
        app: 'Pooja Thalis, Sterling Silver Utensils & Diya',
        mKey: 'SILVER',
        pKey: '925'
      },
      {
        metal: 'Platinum 950',
        dot: 'platinum',
        hallmark: 'PT950 (95.0% Pure)',
        rate: r['PLATINUM_950'] ? r['PLATINUM_950'].rate_per_gram : 5379,
        change: getChg('PLATINUM_950', '+0.00%').change,
        isUp: getChg('PLATINUM_950', '+0.00%').isUp,
        bar: (rate) => `${sym}${Math.round(rate * 100).toLocaleString()} (100g)`,
        app: 'Wedding Bands, Solitaire Rings, Luxury Chains',
        mKey: 'PLATINUM',
        pKey: '950'
      }
    ];

    tbody.innerHTML = rows.map(row => {
      const per10g = Math.round(row.rate * 10).toLocaleString();
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
              <span class="cat-dot ${row.dot}"></span>
              <span>${row.metal}</span>
            </div>
          </td>
          <td><span class="purity-badge-pill">${row.hallmark}</span></td>
          <td style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary);">${sym}${row.rate.toLocaleString()}</td>
          <td style="font-weight: 600;">${sym}${per10g}</td>
          <td>${row.bar(row.rate)}</td>
          <td>
            <span class="rate-change-tag ${row.isUp ? 'up' : 'down'}">
              ${row.change}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 220px;">${row.app}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="ValuationComponent.quickFillCalc('${row.mKey}', '${row.pKey}')">
              <i data-lucide="calculator" style="width: 13px;"></i> Calc
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  updateRibbonStats() {
    if (!this.latestRates) return;
    const sym = API.getCurrencySymbol();
    const g24 = this.latestRates['GOLD_24K'] ? this.latestRates['GOLD_24K'].rate_per_gram : 15535;
    
    const highEl = document.getElementById('stat-gold-high');
    const lowEl = document.getElementById('stat-gold-low');
    if (highEl) highEl.innerText = `${sym}${Math.round(g24 * 1.018).toLocaleString()}/g`;
    if (lowEl) lowEl.innerText = `${sym}${Math.round(g24 * 0.982).toLocaleString()}/g`;
  },

  // Calculator Logic
  setCalcMetal(metal) {
    this.calcState.metal = metal;
    document.querySelectorAll('.metal-chip').forEach(b => b.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.metal-chip')).find(b => b.innerText.includes(metal.charAt(0) + metal.slice(1).toLowerCase()));
    if (btn) btn.classList.add('active');

    // Default Purity for selected metal
    if (metal === 'GOLD') this.calcState.purity = '22K';
    else if (metal === 'SILVER') this.calcState.purity = '999';
    else if (metal === 'PLATINUM') this.calcState.purity = '950';
    else if (metal === 'DIAMOND') this.calcState.purity = 'F/VS1';

    // Unit label
    const unitBadge = document.getElementById('calc-unit-badge');
    const weightLabel = document.getElementById('calc-weight-label');
    if (unitBadge && weightLabel) {
      if (metal === 'DIAMOND') {
        unitBadge.innerText = 'ct';
        weightLabel.innerText = 'Carat Weight';
      } else {
        unitBadge.innerText = 'g';
        weightLabel.innerText = 'Net Weight (Grams)';
      }
    }

    this.updatePurityOptions();
    this.computeValuation();
  },

  updatePurityOptions() {
    const container = document.getElementById('calc-purity-container');
    if (!container) return;

    const metal = this.calcState.metal;
    let options = [];

    if (metal === 'GOLD') {
      options = [
        { key: '24K', label: '24K (99.9% Pure)', factor: 1.0 },
        { key: '22K', label: '22K (91.6% Hallmark)', factor: 0.9167 },
        { key: '18K', label: '18K (75.0% Fine)', factor: 0.75 },
        { key: '14K', label: '14K (58.3%)', factor: 0.5833 }
      ];
    } else if (metal === 'SILVER') {
      options = [
        { key: '999', label: '999 Fine Silver (99.9%)', factor: 1.0 },
        { key: '925', label: '925 Sterling Silver (92.5%)', factor: 0.925 }
      ];
    } else if (metal === 'PLATINUM') {
      options = [
        { key: '950', label: 'Platinum 950 (95%)', factor: 0.95 },
        { key: '900', label: 'Platinum 900 (90%)', factor: 0.90 }
      ];
    } else if (metal === 'DIAMOND') {
      options = [
        { key: 'D-E/VVS', label: 'D-E Color / VVS' },
        { key: 'F/VS1', label: 'F Color / VS1 (Standard)' },
        { key: 'G-H/SI', label: 'G-H Color / SI' }
      ];
    }

    container.innerHTML = options.map(opt => `
      <button type="button" class="purity-pill ${this.calcState.purity === opt.key ? 'active' : ''}" onclick="ValuationComponent.setCalcPurity('${opt.key}')">
        ${opt.label}
      </button>
    `).join('');
  },

  setCalcPurity(purity) {
    this.calcState.purity = purity;
    document.querySelectorAll('.purity-pill').forEach(p => p.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.purity-pill')).find(b => b.innerText.includes(purity));
    if (btn) btn.classList.add('active');
    this.computeValuation();
  },

  onWeightChange(val) {
    this.calcState.weight = parseFloat(val) || 0;
    this.computeValuation();
  },

  addWeight(amount) {
    const input = document.getElementById('calc-weight-input');
    if (!input) return;
    const current = parseFloat(input.value) || 0;
    const next = current + amount;
    input.value = next;
    this.calcState.weight = next;
    this.computeValuation();
  },

  setExactWeight(exact) {
    const input = document.getElementById('calc-weight-input');
    if (!input) return;
    input.value = exact;
    this.calcState.weight = exact;
    this.computeValuation();
  },

  onMakingChange(pct) {
    this.calcState.makingPct = parseFloat(pct) || 0;
    this.computeValuation();
  },

  onGstToggle(checked) {
    this.calcState.includeGst = checked;
    this.computeValuation();
  },

  computeValuation() {
    if (!this.latestRates) return;
    const sym = API.getCurrencySymbol();
    const { metal, purity, weight, makingPct, includeGst } = this.calcState;

    let ratePerUnit = 0;

    if (metal === 'GOLD') {
      const key = `GOLD_${purity}`;
      if (this.latestRates[key]) {
        ratePerUnit = this.latestRates[key].rate_per_gram;
      } else {
        const base24 = this.latestRates['GOLD_24K'] ? this.latestRates['GOLD_24K'].rate_per_gram : 15535;
        const factor = purity === '22K' ? 0.9167 : (purity === '18K' ? 0.75 : 0.5833);
        ratePerUnit = base24 * factor;
      }
    } else if (metal === 'SILVER') {
      const key = `SILVER_${purity}`;
      ratePerUnit = this.latestRates[key] ? this.latestRates[key].rate_per_gram : (purity === '999' ? 250 : 231.25);
    } else if (metal === 'PLATINUM') {
      const key = `PLATINUM_${purity}`;
      ratePerUnit = this.latestRates[key] ? this.latestRates[key].rate_per_gram : 5379;
    } else if (metal === 'DIAMOND') {
      // Diamond base per carat
      ratePerUnit = purity.includes('VVS') ? 485000 : (purity.includes('VS1') ? 377450 : 265000);
    }

    const meltValue = Math.round(weight * ratePerUnit);
    const makingAmount = Math.round(meltValue * (makingPct / 100));
    const subtotal = meltValue + makingAmount;
    const gstAmount = includeGst ? Math.round(subtotal * 0.03) : 0;
    const totalValuation = subtotal + gstAmount;

    // Update UI elements
    const unitText = metal === 'DIAMOND' ? '/ ct' : '/ g';
    const rateBenchmarkEl = document.getElementById('calc-rate-benchmark');
    const totalDisplayEl = document.getElementById('calc-total-display');
    const meltValEl = document.getElementById('calc-melt-val');
    const makingValEl = document.getElementById('calc-making-val');
    const taxValEl = document.getElementById('calc-tax-val');
    const gstAmtHint = document.getElementById('calc-gst-amount');

    if (rateBenchmarkEl) rateBenchmarkEl.innerText = `Spot Benchmark: ${sym}${Math.round(ratePerUnit).toLocaleString()} ${unitText}`;
    if (totalDisplayEl) totalDisplayEl.innerText = `${sym}${totalValuation.toLocaleString()}`;
    if (meltValEl) meltValEl.innerText = `${sym}${meltValue.toLocaleString()}`;
    if (makingValEl) makingValEl.innerText = `+${sym}${makingAmount.toLocaleString()} (${makingPct}%)`;
    if (taxValEl) taxValEl.innerText = `+${sym}${gstAmount.toLocaleString()} (3%)`;
    if (gstAmtHint) gstAmtHint.innerText = `+${sym}${gstAmount.toLocaleString()}`;
  },

  quickFillCalc(metal, purity) {
    this.setCalcMetal(metal);
    this.setCalcPurity(purity);
    // Scroll smoothly to calculator card
    const calcCard = document.querySelector('.calc-card');
    if (calcCard) {
      calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      calcCard.classList.add('highlight-pulse');
      setTimeout(() => calcCard.classList.remove('highlight-pulse'), 1500);
    }
  },

  openAddWithCalc() {
    const { metal, purity, weight } = this.calcState;
    AssetsComponent.openAddModal();
    // Auto-select metal and purity in modal
    setTimeout(() => {
      const metalSel = document.getElementById('modal-metal-select');
      const puritySel = document.getElementById('modal-purity-select');
      const grossInput = document.getElementById('modal-gross-wt');
      const netInput = document.getElementById('modal-net-wt');

      if (metalSel) {
        metalSel.value = metal;
        metalSel.dispatchEvent(new Event('change'));
      }
      if (puritySel) puritySel.value = purity;
      if (grossInput) grossInput.value = weight;
      if (netInput) netInput.value = weight;
    }, 150);
  },

  async changeTimeframe(days) {
    this.currentDays = days;
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.tf-btn')).find(b => b.innerText.includes(`${days}D`) || (days === 365 && b.innerText.includes('1Y')));
    if (activeBtn) activeBtn.classList.add('active');
    await this.loadChart(days);
  },

  async loadChart(days = 30) {
    try {
      const hist = await API.getMarketHistory(days);
      ChartManager.renderMarketRatesChart('market-trends-chart', hist.trends || []);
    } catch (e) {
      console.error("Failed to load historical chart:", e);
    }
  },

  async setCurrency(curr) {
    API.setCurrency(curr);
    App.showToast(`Switched currency to ${curr}`, 'success');
    await this.render();
  },

  async syncRates() {
    const btn = document.getElementById('btn-sync-rates');
    const spinIcon = document.getElementById('sync-spin-icon');
    if (btn) btn.disabled = true;
    if (spinIcon) spinIcon.classList.add('spin');

    try {
      await API.syncMarketRates();
      await this.loadRates(true);
      await this.loadChart(this.currentDays, true);
      App.showToast('Live bullion market benchmarks synced successfully!', 'success');
      App.updateSidebarLiveRates();
      App.updateSyncTimestamp();

      // Visual flash animation on cards so user clearly sees the refresh
      document.querySelectorAll('.market-rate-card').forEach(card => {
        card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        card.style.borderColor = 'var(--gold-button)';
        card.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.3)';
        setTimeout(() => {
          card.style.borderColor = '';
          card.style.boxShadow = '';
        }, 800);
      });
    } catch (e) {
      App.showToast('Failed to sync rates. Using cached benchmarks.', 'error');
    } finally {
      if (btn) btn.disabled = false;
      if (spinIcon) spinIcon.classList.remove('spin');
      if (window.lucide) lucide.createIcons();
    }
  }
};
