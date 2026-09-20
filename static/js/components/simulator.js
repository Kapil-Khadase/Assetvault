// Scenario Simulator ("What-If" Market Analysis)
const SimulatorComponent = {
  async render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="simulator-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800;">Asset Value Simulator ("What-If" Engine)</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">
            Stress-test your physical portfolio under hypothetical market fluctuations (e.g. ±5%, ±10%, ±20% bullion and diamond rate changes).
          </p>
        </div>

        <!-- Simulation Grid: Controls + Summary -->
        <div class="charts-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 24px;">
          <!-- Controls -->
          <div class="glass-card">
            <h3 class="card-title" style="margin-bottom: 16px;"><i data-lucide="sliders" style="color: var(--gold-light);"></i> Market Price Shock Sliders</h3>
            
            <div class="slider-container">
              <div class="slider-header">
                <span>Gold Price Shock</span>
                <span id="gold-slider-val" style="color: var(--gold-light); font-weight: 700;">0%</span>
              </div>
              <input type="range" class="range-slider" id="gold-slider" min="-50" max="100" value="0" step="5" oninput="SimulatorComponent.onSliderChange()" />
            </div>

            <div class="slider-container">
              <div class="slider-header">
                <span>Silver Price Shock</span>
                <span id="silver-slider-val" style="color: #94a3b8; font-weight: 700;">0%</span>
              </div>
              <input type="range" class="range-slider" id="silver-slider" min="-50" max="100" value="0" step="5" oninput="SimulatorComponent.onSliderChange()" />
            </div>

            <div class="slider-container">
              <div class="slider-header">
                <span>Platinum Price Shock</span>
                <span id="plat-slider-val" style="color: #38bdf8; font-weight: 700;">0%</span>
              </div>
              <input type="range" class="range-slider" id="plat-slider" min="-50" max="100" value="0" step="5" oninput="SimulatorComponent.onSliderChange()" />
            </div>

            <div class="slider-container">
              <div class="slider-header">
                <span>Diamond & Gemstone Shock</span>
                <span id="diamond-slider-val" style="color: #c084fc; font-weight: 700;">0%</span>
              </div>
              <input type="range" class="range-slider" id="diamond-slider" min="-50" max="100" value="0" step="5" oninput="SimulatorComponent.onSliderChange()" />
            </div>

            <!-- Preset Buttons -->
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
              <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 8px;">Preset Shock Scenarios</span>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary btn-sm" onclick="SimulatorComponent.applyPreset(15, 25, 10, 0)">🚀 Bull Rally (+15% Gold)</button>
                <button class="btn btn-secondary btn-sm" onclick="SimulatorComponent.applyPreset(-15, -25, -10, -5)">🔻 Market Dip (-15% Gold)</button>
                <button class="btn btn-secondary btn-sm" onclick="SimulatorComponent.applyPreset(30, 30, 30, 20)">🔥 Supercycle (+30%)</button>
                <button class="btn btn-secondary btn-sm" onclick="SimulatorComponent.applyPreset(0, 0, 0, 0)">🔄 Reset</button>
              </div>
            </div>
          </div>

          <!-- Simulation Outcome Card -->
          <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 class="card-title" style="margin-bottom: 16px;"><i data-lucide="zap" style="color: var(--gold-light);"></i> Simulated Portfolio Outcome</h3>
              
              <div style="background: rgba(255,255,255,0.03); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.88rem;">
                  <span style="color: var(--text-muted);">Current Market Valuation:</span>
                  <b id="sim-base-val">--</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 1.1rem; font-weight: 700;">
                  <span>Simulated Portfolio Value:</span>
                  <span id="sim-outcome-val" style="color: var(--gold-light); font-size: 1.3rem;">--</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 10px; font-size: 0.92rem;">
                  <span>Value Change (Impact):</span>
                  <b id="sim-diff-val">--</b>
                </div>
              </div>

              <div class="kpi-grid" style="grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 0;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md);">
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Simulated Total P&L</div>
                  <div id="sim-pnl-val" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-heading); margin-top: 2px;">--</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md);">
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Simulated Overall ROI</div>
                  <div id="sim-roi-val" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-heading); margin-top: 2px;">--</div>
                </div>
              </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 16px;">
              * Note: Simulated valuations are indicative scenario models and do not alter actual recorded transactions in your database.
            </div>
          </div>
        </div>

        <!-- Asset-by-Asset Simulation Impact Table -->
        <div class="glass-card">
          <h3 class="card-title" style="margin-bottom: 16px;"><i data-lucide="layers" style="color: var(--gold-light);"></i> Asset-by-Asset Stress-Test Sensitivity</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Owner / Holder</th>
                  <th>Metal / Karat</th>
                  <th>Acquisition Cost</th>
                  <th>Current Value</th>
                  <th>Simulated Value</th>
                  <th>Difference</th>
                  <th>Simulated P&L</th>
                  <th>Simulated ROI %</th>
                </tr>
              </thead>
              <tbody id="sim-table-tbody">
                <tr><td colspan="9" style="text-align: center; padding: 20px;">Computing simulation...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.runSim();
  },

  onSliderChange() {
    const g = document.getElementById('gold-slider').value;
    const s = document.getElementById('silver-slider').value;
    const p = document.getElementById('plat-slider').value;
    const d = document.getElementById('diamond-slider').value;

    document.getElementById('gold-slider-val').innerText = `${g >= 0 ? '+' : ''}${g}%`;
    document.getElementById('silver-slider-val').innerText = `${s >= 0 ? '+' : ''}${s}%`;
    document.getElementById('plat-slider-val').innerText = `${p >= 0 ? '+' : ''}${p}%`;
    document.getElementById('diamond-slider-val').innerText = `${d >= 0 ? '+' : ''}${d}%`;

    this.runSim();
  },

  applyPreset(g, s, p, d) {
    document.getElementById('gold-slider').value = g;
    document.getElementById('silver-slider').value = s;
    document.getElementById('plat-slider').value = p;
    document.getElementById('diamond-slider').value = d;
    this.onSliderChange();
  },

  async runSim() {
    const g = parseFloat(document.getElementById('gold-slider').value) || 0;
    const s = parseFloat(document.getElementById('silver-slider').value) || 0;
    const p = parseFloat(document.getElementById('plat-slider').value) || 0;
    const d = parseFloat(document.getElementById('diamond-slider').value) || 0;

    try {
      const res = await API.runSimulation({
        gold_shock: g,
        silver_shock: s,
        plat_shock: p,
        diamond_shock: d
      });

      const sym = API.getCurrency() === 'INR' ? '₹' : '$';

      document.getElementById('sim-base-val').innerText = `${sym}${res.base_total_value.toLocaleString()}`;
      document.getElementById('sim-outcome-val').innerText = `${sym}${res.simulated_total_value.toLocaleString()}`;

      const diff = res.portfolio_value_diff;
      const diffElem = document.getElementById('sim-diff-val');
      diffElem.innerText = `${diff >= 0 ? '+' : ''}${sym}${diff.toLocaleString()} (${res.portfolio_diff_pct >= 0 ? '+' : ''}${res.portfolio_diff_pct}%)`;
      diffElem.style.color = diff >= 0 ? 'var(--emerald-gain)' : 'var(--crimson-loss)';

      const pnl = res.simulated_total_pnl;
      const pnlElem = document.getElementById('sim-pnl-val');
      pnlElem.innerText = `${pnl >= 0 ? '+' : ''}${sym}${pnl.toLocaleString()}`;
      pnlElem.style.color = pnl >= 0 ? 'var(--emerald-gain)' : 'var(--crimson-loss)';

      const roiElem = document.getElementById('sim-roi-val');
      roiElem.innerText = `${res.simulated_total_roi >= 0 ? '+' : ''}${res.simulated_total_roi}%`;
      roiElem.style.color = res.simulated_total_roi >= 0 ? 'var(--emerald-gain)' : 'var(--crimson-loss)';

      // Render Asset Sensitivity Table
      const tbody = document.getElementById('sim-table-tbody');
      tbody.innerHTML = res.asset_simulations.map(a => {
        const isDiffGain = a.value_difference >= 0;
        const isPnlGain = a.simulated_pnl >= 0;
        return `
          <tr>
            <td style="font-weight: 600;">${a.asset_name}</td>
            <td>
              <span class="owner-pill">
                <i data-lucide="user"></i>
                ${a.owner_name || 'Self'}
              </span>
            </td>
            <td><span class="ticker-item" style="font-size:0.75rem; padding: 2px 6px;">${a.metal} ${a.purity || ''}</span></td>
            <td>${sym}${a.total_cost.toLocaleString()}</td>
            <td>${sym}${a.base_value.toLocaleString()}</td>
            <td style="font-weight: 700; color: var(--gold-light);">${sym}${a.simulated_value.toLocaleString()}</td>
            <td style="font-weight: 700; color: ${isDiffGain ? 'var(--emerald-gain)' : 'var(--crimson-loss)'};">
              ${isDiffGain ? '+' : ''}${sym}${a.value_difference.toLocaleString()} (${a.difference_percentage >= 0 ? '+' : ''}${a.difference_percentage}%)
            </td>
            <td style="font-weight: 600; color: ${isPnlGain ? 'var(--emerald-gain)' : 'var(--crimson-loss)'};">
              ${isPnlGain ? '+' : ''}${sym}${a.simulated_pnl.toLocaleString()}
            </td>
            <td>
              <span class="${isPnlGain ? 'badge-gain' : 'badge-loss'}">${a.simulated_roi >= 0 ? '+' : ''}${a.simulated_roi}%</span>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error("Simulation failure:", e);
    }
  }
};
