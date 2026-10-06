// Alerts & Milestone Triggers Component - Ultra-Organized Luxury FinTech UI
const AlertsComponent = {
  allAlerts: [],

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Update Topbar Breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) breadcrumb.innerText = 'Insights / Alerts';

    const sym = API.getCurrencySymbol();

    container.innerHTML = `
      <div class="alerts-view">
        <!-- 1. Header Row -->
        <div class="assets-header-row">
          <div>
            <h2 class="dash-greeting">Price Alerts & Triggers</h2>
            <p class="dash-subtitle">Configure real-time bullion spot price targets and portfolio growth milestone alerts.</p>
          </div>
          <button class="btn btn-primary" onclick="AlertsComponent.openAddModal()">
            <i data-lucide="bell-plus" style="width: 15px;"></i> Create Alert Rule
          </button>
        </div>

        <!-- 2. Top Summary KPI Cards -->
        <div class="kpi-row" style="margin-bottom: 20px;">
          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Active Monitors</div>
            <div class="kpi-value" id="alert-kpi-total" style="font-size: 1.45rem;">--</div>
            <div class="kpi-subtext">Real-time exchange surveillance</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Triggered Conditions</div>
            <div class="kpi-value" id="alert-kpi-triggered" style="font-size: 1.45rem; color: var(--gold-button);">--</div>
            <div class="kpi-subtext">Actionable target milestones</div>
          </div>

          <div class="card" style="padding: 18px 20px;">
            <div class="kpi-label">Dispatch Channels</div>
            <div class="kpi-value" style="font-size: 1.45rem; color: var(--gain-green);">In-App & Email</div>
            <div class="kpi-subtext">Instant notification webhook</div>
          </div>
        </div>

        <!-- 3. Active Alert Rules Table -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Target Type</th>
                  <th>Metal / Asset</th>
                  <th>Trigger Condition</th>
                  <th>Threshold Target</th>
                  <th>Current Live Spot</th>
                  <th>Spread / Distance</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="alerts-table-tbody">
                <tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">Loading active alert rules...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add Alert Modal -->
      <div class="modal-overlay" id="add-alert-modal-overlay" style="display: none;">
        <div class="modal-card" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title"><i data-lucide="bell-plus" style="color: var(--gold-button);"></i> Set Price Alert Trigger</h3>
            <button class="modal-close-btn" onclick="AlertsComponent.closeModal()">
              <i data-lucide="x" style="width: 20px;"></i>
            </button>
          </div>

          <form onsubmit="AlertsComponent.handleCreateAlert(event)">
            <!-- Quick Target Presets -->
            <div style="background: var(--bg-primary); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 14px;">
              <div style="font-size: 0.74rem; color: var(--text-secondary); font-weight: 700; margin-bottom: 6px;">QUICK BENCHMARK PRESETS:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="preset-pill" onclick="AlertsComponent.applyPreset('PRICE_TARGET', 'GOLD', 16000, 'GREATER_THAN')">Gold ≥ ₹16,000/g</button>
                <button type="button" class="preset-pill" onclick="AlertsComponent.applyPreset('PRICE_TARGET', 'GOLD', 15000, 'LESS_THAN')">Gold ≤ ₹15,000/g</button>
                <button type="button" class="preset-pill" onclick="AlertsComponent.applyPreset('PRICE_TARGET', 'SILVER', 275, 'GREATER_THAN')">Silver ≥ ₹275/g</button>
                <button type="button" class="preset-pill" onclick="AlertsComponent.applyPreset('PORTFOLIO_TARGET', '', 2500000, 'GREATER_THAN')">Portfolio ≥ ₹25L</button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Alert Target Type</label>
              <select class="form-control" id="alert-type" onchange="AlertsComponent.onTypeChange(this.value)">
                <option value="PRICE_TARGET" selected>Commodity Spot Price (Per Gram)</option>
                <option value="PORTFOLIO_TARGET">Total Portfolio Valuation Target</option>
              </select>
            </div>

            <div class="form-group" id="metal-group" style="margin-bottom: 14px;">
              <label class="form-label">Target Commodity</label>
              <select class="form-control" id="alert-metal">
                <option value="GOLD" selected>Gold (24K Bullion)</option>
                <option value="SILVER">Silver (999 Fine)</option>
                <option value="PLATINUM">Platinum (950)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Trigger Condition</label>
              <select class="form-control" id="alert-condition">
                <option value="GREATER_THAN" selected>Price Rises Above (&ge;)</option>
                <option value="LESS_THAN">Price Falls Below (&le;)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label">Target Price / Amount *</label>
              <input type="number" step="0.01" class="form-control" id="alert-value" required placeholder="e.g. 16000" />
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label">Notes / Notification Reason</label>
              <input type="text" class="form-control" id="alert-notes" placeholder="e.g. Take profit on Dhanteras bullion" />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="AlertsComponent.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="check"></i> Create Alert Rule</button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadAlerts();
  },

  async loadAlerts() {
    try {
      const res = await API.getAlerts();
      this.allAlerts = res.alerts || [];
      const sym = API.getCurrencySymbol();
      const tbody = document.getElementById('alerts-table-tbody');

      const triggeredCount = this.allAlerts.filter(a => a.is_currently_triggered).length;
      document.getElementById('alert-kpi-total').innerText = `${this.allAlerts.length} rules active`;
      document.getElementById('alert-kpi-triggered').innerText = `${triggeredCount} triggered`;

      if (this.allAlerts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">No price alert rules active. Click "Create Alert Rule" to set your first trigger.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.allAlerts.map(a => {
        const isActive = a.is_active !== 0;
        const isTriggered = a.is_currently_triggered && isActive;
        const isPrice = a.alert_type === 'PRICE_TARGET';
        const metal = a.target_metal || 'GOLD';
        const currentVal = a.current_value || (metal === 'GOLD' ? 15535 : (metal === 'SILVER' ? 250 : 5379));
        const diff = a.target_value - currentVal;
        const diffText = !isActive ? 'Disabled' : (isTriggered ? 'Target Reached' : `${diff >= 0 ? '+' : ''}${sym}${Math.abs(Math.round(diff)).toLocaleString()} away`);

        return `
          <tr style="${!isActive ? 'opacity: 0.65;' : ''}">
            <td>
              <span class="metal-pill ${isPrice ? 'gold' : 'diamond'}">
                <span class="metal-dot"></span> ${isPrice ? 'SPOT PRICE' : 'PORTFOLIO'}
              </span>
            </td>
            <td style="font-weight: 700; color: var(--text-primary);">
              ${isPrice ? `${metal} Bullion` : 'Entire Physical Portfolio'}
            </td>
            <td style="color: var(--text-secondary); font-weight: 500;">
              ${a.condition === 'GREATER_THAN' ? 'Rises Above (&ge;)' : 'Falls Below (&le;)'}
            </td>
            <td style="font-weight: 700; font-family: var(--font-heading); color: var(--text-primary); font-size: 0.95rem;">
              ${sym}${Math.round(a.target_value).toLocaleString()}
            </td>
            <td style="font-weight: 700; color: var(--gold-button); font-family: var(--font-heading);">
              ${sym}${Math.round(currentVal).toLocaleString()}
            </td>
            <td style="color: ${isTriggered ? 'var(--gain-green)' : 'var(--text-muted)'}; font-weight: 600; font-size: 0.78rem;">
              ${diffText}
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <span class="status-pill ${!isActive ? 'sold' : (isTriggered ? 'held' : 'gold')}" style="${!isActive ? 'opacity: 0.7;' : (isTriggered ? 'background: var(--gain-green-bg); color: var(--gain-green); border: 1px solid rgba(16,185,129,0.3); font-weight: 700;' : '')}">
                  ${!isActive ? '⏸ DISABLED' : (isTriggered ? '🟢 TRIGGERED' : '👀 MONITORING')}
                </span>
                ${a.triggered_at ? `<div style="font-size: 0.72rem; color: var(--text-muted);"><i data-lucide="clock" style="width: 10px; vertical-align: middle;"></i> ${a.triggered_at.split('T')[0]}</div>` : ''}
              </div>
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                <button class="btn-table-action" title="${isActive ? 'Disable Alert' : 'Enable Alert'}" onclick="AlertsComponent.toggleAlert(${a.id})">
                  <i data-lucide="${isActive ? 'bell-off' : 'bell'}" style="width: 15px; color: ${isActive ? 'var(--text-muted)' : 'var(--gold-button)'};"></i>
                </button>
                <button class="btn-table-action" title="Delete Alert" onclick="AlertsComponent.deleteAlert(${a.id})">
                  <i data-lucide="trash-2" style="width: 15px; color: var(--loss-red);"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error("Alerts error:", e);
    }
  },

  async toggleAlert(id) {
    try {
      await API.toggleAlert(id);
      App.showToast('Alert rule status updated', 'success');
      await this.loadAlerts();
    } catch (e) {
      App.showToast('Failed to toggle alert rule', 'error');
    }
  },

  onTypeChange(val) {
    const metalGroup = document.getElementById('metal-group');
    if (metalGroup) metalGroup.style.display = val === 'PRICE_TARGET' ? 'block' : 'none';
  },

  applyPreset(type, metal, targetVal, condition) {
    document.getElementById('alert-type').value = type;
    this.onTypeChange(type);
    if (metal) document.getElementById('alert-metal').value = metal;
    document.getElementById('alert-condition').value = condition;
    document.getElementById('alert-value').value = targetVal;
    document.getElementById('alert-notes').value = `${metal || 'Portfolio'} target alert at ${targetVal}`;
  },

  openAddModal() {
    const modal = document.getElementById('add-alert-modal-overlay');
    if (modal) modal.style.display = 'flex';
  },

  closeModal() {
    const modal = document.getElementById('add-alert-modal-overlay');
    if (modal) modal.style.display = 'none';
  },

  async handleCreateAlert(e) {
    e.preventDefault();
    const alertType = document.getElementById('alert-type').value;
    const targetMetal = alertType === 'PRICE_TARGET' ? document.getElementById('alert-metal').value : '';
    const condition = document.getElementById('alert-condition').value;
    const targetValue = parseFloat(document.getElementById('alert-value').value);
    const notes = document.getElementById('alert-notes').value;

    try {
      await API.createAlert({
        alert_type: alertType,
        target_metal: targetMetal,
        condition,
        target_value: targetValue,
        notes
      });

      App.showToast('Price alert trigger created successfully!', 'success');
      this.closeModal();
      this.loadAlerts();
    } catch (err) {
      App.showToast(err.message || 'Failed creating alert', 'error');
    }
  },

  async deleteAlert(id) {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await API.deleteAlert(id);
      App.showToast('Alert rule deleted', 'success');
      this.loadAlerts();
    } catch (err) {
      App.showToast(err.message || 'Failed deleting alert', 'error');
    }
  }
};
