// Chart.js Manager for AssetVault - Light & Dark Mode Optimized
const ChartManager = {
  instances: {},

  destroyChart(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      isDark,
      textColor: isDark ? '#9CA3AF' : '#78716C',
      textPrimary: isDark ? '#F3F4F6' : '#1C1917',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(60, 50, 40, 0.06)',
      tooltipBg: isDark ? '#1F2937' : '#FDFAF4',
      tooltipTitle: isDark ? '#FFFFFF' : '#1C1917',
      tooltipBody: isDark ? '#D1D5DB' : '#57534E',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E6DFD1',
      gold: '#D97706',
      diamond: '#0284C7',
      silver: '#94A3B8',
      platinum: '#9333EA',
      gain: '#059669',
      loss: '#DC2626'
    };
  },

  renderPortfolioGrowthChart(canvasId, summary, trendData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = this.getThemeColors();
    const sym = (typeof API !== 'undefined' && API.getCurrencySymbol) ? API.getCurrencySymbol() : '₹';

    const currentEst = summary ? (summary.total_current_market_value ?? 0) : 0;
    const currentCost = summary ? (summary.total_invested_cost ?? 0) : 0;

    let labels = [
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan',
      'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'
    ];

    let estPoints = [];
    let costPoints = [];

    if (trendData && Array.isArray(trendData) && trendData.length > 1 && currentEst > 0) {
      labels = trendData.map(p => p.date);
      const latestGold = trendData[trendData.length - 1].gold_24k || 1;
      estPoints = trendData.map(p => {
        const factor = (p.gold_24k || latestGold) / latestGold;
        return Math.round(currentEst * factor);
      });
      costPoints = trendData.map(() => Math.round(currentCost));
    } else if (currentEst === 0 && currentCost === 0) {
      // Empty portfolio: flat zero baseline
      estPoints = new Array(labels.length).fill(0);
      costPoints = new Array(labels.length).fill(0);
    } else {
      estPoints = [
        Math.round(currentEst * 0.94),
        Math.round(currentEst * 0.94),
        Math.round(currentEst * 0.95),
        Math.round(currentEst * 0.96),
        Math.round(currentEst * 0.96),
        Math.round(currentEst * 0.97),
        Math.round(currentEst * 0.97),
        Math.round(currentEst * 0.98),
        Math.round(currentEst * 0.98),
        Math.round(currentEst * 0.99),
        Math.round(currentEst * 0.99),
        Math.round(currentEst * 1.00),
        Math.round(currentEst)
      ];

      costPoints = new Array(13).fill(Math.round(currentCost));
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, colors.isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(217, 119, 6, 0.12)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Estimated Value',
            data: estPoints,
            borderColor: '#D97706',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#D97706'
          },
          {
            label: 'Investment Cost',
            data: costPoints,
            borderColor: colors.isDark ? '#6B7280' : '#9CA3AF',
            borderDash: [4, 4],
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.3,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { left: 0, right: 10, top: 8, bottom: 0 }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            min: 0,
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: {
              color: colors.textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              callback: function(val) {
                if (val >= 10000000) return `${sym}${(val / 10000000).toFixed(1)}Cr`;
                if (val >= 100000) return `${sym}${(val / 100000).toFixed(1)}L`;
                if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}k`;
                return `${sym}${val}`;
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: colors.textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipBody,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${sym}${context.raw.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  },

  renderAllocationDonutChart(canvasId, allocation, totalVal, rawAssets = []) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = this.getThemeColors();
    const sym = (typeof API !== 'undefined' && API.getCurrencySymbol) ? API.getCurrencySymbol() : (API.getCurrency() === 'INR' ? '₹' : '$');

    let items = [];
    if (Array.isArray(allocation)) {
      items = allocation.filter(a => (a.value || 0) > 0);
    } else if (allocation && typeof allocation === 'object') {
      items = Object.entries(allocation).map(([k, v]) => ({
        label: k,
        value: typeof v === 'object' ? (v.value || 0) : Number(v)
      })).filter(a => a.value > 0);
    }

    // Auto-derive from raw assets if allocation list is empty
    if (items.length === 0 && Array.isArray(rawAssets) && rawAssets.length > 0) {
      const allocMap = {};
      rawAssets.forEach(a => {
        if ((a.status || 'Active').toLowerCase() === 'active') {
          const m = (a.metal || 'Gold').charAt(0).toUpperCase() + (a.metal || 'Gold').slice(1).toLowerCase();
          const val = Number(a.current_estimated_value || a.current_valuation || a.total_acquisition_cost) || 0;
          if (val > 0) allocMap[m] = (allocMap[m] || 0) + val;
        }
      });
      items = Object.entries(allocMap).map(([label, value]) => ({ label, value })).filter(i => i.value > 0);
    }

    const calculatedTotal = items.reduce((s, i) => s + (i.value || 0), 0);
    const total = (totalVal && totalVal > 0) ? totalVal : calculatedTotal;
    const isEmpty = items.length === 0 || total === 0;

    let labels = [];
    let dataValues = [];
    let palette = [];
    let formattedTotal = `${sym}0`;
    let subtitleText = 'No assets';

    if (isEmpty) {
      labels = ['Vault Ready'];
      dataValues = [1];
      // Visible, elegant subtle gold placeholder ring so chart NEVER looks blank or broken
      palette = [colors.isDark ? 'rgba(217, 119, 6, 0.28)' : 'rgba(217, 119, 6, 0.22)'];
      formattedTotal = `${sym}0`;
      subtitleText = '0 assets held';
    } else {
      labels = items.map(i => i.label);
      dataValues = items.map(i => i.value);
      palette = items.map(i => {
        const l = (i.label || '').toLowerCase();
        if (l.includes('gold')) return '#F59E0B';     // Rich Gold
        if (l.includes('diamond')) return '#38BDF8';  // Sky Diamond
        if (l.includes('silver')) return '#94A3B8';   // Crisp Silver
        if (l.includes('plat')) return '#A855F7';     // Royal Platinum
        return '#10B981';                             // Emerald Other
      });

      if (total >= 10000000) formattedTotal = `${sym}${(total / 10000000).toFixed(2)}Cr`;
      else if (total >= 100000) formattedTotal = `${sym}${(total / 100000).toFixed(1)}L`;
      else formattedTotal = `${sym}${Math.round(total).toLocaleString()}`;
      subtitleText = 'estimated';
    }

    // Custom Plugin for Center Text
    const centerTextPlugin = {
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        const radius = Math.min((chartArea.right - chartArea.left), (chartArea.bottom - chartArea.top)) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Main Amount - dynamically scaled to available chart radius
        const mainFontSize = Math.max(13, Math.min(18, Math.round(radius * 0.24)));
        const subFontSize = Math.max(9, Math.min(12, Math.round(radius * 0.15)));

        ctx.font = `bold ${mainFontSize}px Outfit, sans-serif`;
        ctx.fillStyle = colors.textPrimary;
        ctx.fillText(formattedTotal, centerX, centerY - Math.round(subFontSize * 0.6));

        // Subtitle
        ctx.font = `600 ${subFontSize}px Plus Jakarta Sans, sans-serif`;
        ctx.fillStyle = colors.textColor;
        ctx.fillText(subtitleText, centerX, centerY + Math.round(mainFontSize * 0.8));

        ctx.restore();
      }
    };

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: palette,
          borderWidth: isEmpty ? 1 : 2,
          borderColor: isEmpty ? (colors.isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(217, 119, 6, 0.3)') : (colors.isDark ? '#1F2937' : '#FFFFFF'),
          hoverOffset: isEmpty ? 0 : 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: !isEmpty,
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipBody,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${sym}${Number(val).toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  },

  renderMarketRatesChart(canvasId, trendData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = this.getThemeColors();
    const sym = (typeof API !== 'undefined' && API.getCurrencySymbol) ? API.getCurrencySymbol() : '₹';

    const labels = trendData.map(d => d.date);
    const gold24k = trendData.map(d => d.gold_24k);
    const gold22k = trendData.map(d => d.gold_22k);
    const silver = trendData.map(d => d.silver_999);
    const plat = trendData.map(d => d.platinum_950);

    const gradientGold = ctx.createLinearGradient(0, 0, 0, 260);
    gradientGold.addColorStop(0, colors.isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.08)');
    gradientGold.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Gold 24K',
            data: gold24k,
            borderColor: '#D97706',
            backgroundColor: gradientGold,
            fill: true,
            tension: 0.35,
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#D97706'
          },
          {
            label: 'Gold 22K (916)',
            data: gold22k,
            borderColor: '#F59E0B',
            borderDash: [3, 3],
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Silver 999',
            data: silver,
            borderColor: colors.silver,
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Platinum 950',
            data: plat,
            borderColor: colors.platinum,
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 1.8,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            grid: { color: colors.gridColor, drawBorder: false },
            ticks: {
              color: colors.textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              callback: function(val) {
                if (val >= 100000) return `${sym}${(val / 100000).toFixed(1)}L`;
                if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}k`;
                return `${sym}${val}`;
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colors.textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 10
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipBody,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${sym}${Math.round(context.raw).toLocaleString()} / g`;
              }
            }
          }
        }
      }
    });
  }
};
