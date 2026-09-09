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
      textColor: isDark ? '#9CA3AF' : '#6B7280',
      textPrimary: isDark ? '#F3F4F6' : '#111827',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      gold: '#D97706',
      diamond: '#0284C7',
      silver: '#94A3B8',
      platinum: '#9333EA',
      gain: '#10B981',
      loss: '#EF4444'
    };
  },

  renderPortfolioGrowthChart(canvasId, summary, trendData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = this.getThemeColors();
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    const currentEst = summary ? summary.total_current_market_value || 2109342 : 2109342;
    const currentCost = summary ? summary.total_invested_cost || 1431700 : 1431700;

    // Generate 13 Months Timeline Labels
    const labels = [
      'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan',
      'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'
    ];

    // Smooth historical curve up to current values
    const estPoints = [
      Math.round(currentEst * 0.72),
      Math.round(currentEst * 0.74),
      Math.round(currentEst * 0.76),
      Math.round(currentEst * 0.79),
      Math.round(currentEst * 0.81),
      Math.round(currentEst * 0.83),
      Math.round(currentEst * 0.86),
      Math.round(currentEst * 0.88),
      Math.round(currentEst * 0.91),
      Math.round(currentEst * 0.93),
      Math.round(currentEst * 0.96),
      Math.round(currentEst * 0.98),
      Math.round(currentEst)
    ];

    const costPoints = [
      Math.round(currentCost * 0.85),
      Math.round(currentCost * 0.85),
      Math.round(currentCost * 0.88),
      Math.round(currentCost * 0.90),
      Math.round(currentCost * 0.90),
      Math.round(currentCost * 0.92),
      Math.round(currentCost * 0.94),
      Math.round(currentCost * 0.95),
      Math.round(currentCost * 0.98),
      Math.round(currentCost * 0.98),
      Math.round(currentCost * 1.00),
      Math.round(currentCost * 1.00),
      Math.round(currentCost)
    ];

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
            backgroundColor: colors.isDark ? '#1F2937' : '#FFFFFF',
            titleColor: colors.isDark ? '#FFFFFF' : '#111827',
            bodyColor: colors.isDark ? '#D1D5DB' : '#374151',
            borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
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

  renderAllocationDonutChart(canvasId, allocation, totalVal) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = this.getThemeColors();
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

    const goldVal = allocation.Gold ? allocation.Gold.value : 1340093;
    const diamondVal = allocation.Diamond ? allocation.Diamond.value : 548000;
    const silverVal = allocation.Silver ? allocation.Silver.value : 195005;
    const platVal = allocation.Platinum ? allocation.Platinum.value : 26244;

    const labels = ['Gold', 'Diamond', 'Silver', 'Platinum'];
    const dataValues = [goldVal, diamondVal, silverVal, platVal];
    const palette = [colors.gold, colors.diamond, colors.silver, colors.platinum];

    // Format center text e.g. "₹21.1L estimated"
    const total = dataValues.reduce((a, b) => a + b, 0) || totalVal || 2109342;
    let formattedTotal = `${sym}${(total / 100000).toFixed(1)}L`;
    if (total >= 10000000) formattedTotal = `${sym}${(total / 10000000).toFixed(2)}Cr`;
    else if (total < 100000) formattedTotal = `${sym}${Math.round(total).toLocaleString()}`;

    // Custom Plugin for Center Text
    const centerTextPlugin = {
      id: 'centerText',
      afterDraw(chart) {
        const { width, height } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Main Amount
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.fillStyle = colors.textPrimary;
        ctx.fillText(formattedTotal, width / 2, height / 2 - 8);

        // Subtitle
        ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = colors.textColor;
        ctx.fillText('estimated', width / 2, height / 2 + 12);

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
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.isDark ? '#1F2937' : '#FFFFFF',
            titleColor: colors.isDark ? '#FFFFFF' : '#111827',
            bodyColor: colors.isDark ? '#D1D5DB' : '#374151',
            borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${sym}${val.toLocaleString()} (${pct}%)`;
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
    const sym = API.getCurrency() === 'INR' ? '₹' : '$';

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
            backgroundColor: colors.isDark ? '#1F2937' : '#FFFFFF',
            titleColor: colors.isDark ? '#FFFFFF' : '#111827',
            bodyColor: colors.isDark ? '#D1D5DB' : '#374151',
            borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
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
