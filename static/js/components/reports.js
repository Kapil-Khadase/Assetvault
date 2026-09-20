// Reports & Exports Download Center Component
const ReportsComponent = {
  render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="reports-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800;">Portfolio Valuation Reports & Exports</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">Generate executive valuation statements, audit spreadsheets, and transaction ledgers.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
          <!-- PDF Report Card -->
          <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: #ef4444; margin-bottom: 16px;">
                <i data-lucide="file-text" style="width: 26px; height: 26px;"></i>
              </div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Official PDF Valuation Statement</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                Formal executive report generated via native ReportLab engine with executive summary KPI table, full purity breakdown, acquisition cost vs market value matrix, and disclaimer notes.
              </p>
            </div>
            <button id="btn-dl-pdf" class="btn btn-primary" style="width: 100%;">
              <i data-lucide="download"></i> Download PDF Statement
            </button>
          </div>

          <!-- Excel Workbook Card -->
          <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #10b981; margin-bottom: 16px;">
                <i data-lucide="table" style="width: 26px; height: 26px;"></i>
              </div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Multi-Sheet Excel Workbook (.XLSX)</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                Structured workbook powered by OpenPyXL containing separate sheets for Portfolio Overview, Asset Inventory, Spot Rates, and Chronological Lifecycle Transactions.
              </p>
            </div>
            <button id="btn-dl-excel" class="btn btn-primary" style="width: 100%; background: #10b981; color: white;">
              <i data-lucide="download"></i> Download Excel Workbook
            </button>
          </div>

          <!-- CSV Export Card -->
          <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; color: #38bdf8; margin-bottom: 16px;">
                <i data-lucide="file-spreadsheet" style="width: 26px; height: 26px;"></i>
              </div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Raw CSV Tabular Data</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                Lightweight comma-separated file format ideal for importing into Google Sheets, personal accounting software, or database backup.
              </p>
            </div>
            <button id="btn-dl-csv" class="btn btn-secondary" style="width: 100%;">
              <i data-lucide="download"></i> Export CSV Data
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    const handleDownload = async (btnId, type, label) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Generating ${label}...`;
        if (window.lucide) lucide.createIcons();
        try {
          await API.downloadReport(type);
        } catch (e) {
          alert('Error downloading report: ' + e.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = origHTML;
          if (window.lucide) lucide.createIcons();
        }
      });
    };

    handleDownload('btn-dl-pdf', 'pdf', 'PDF');
    handleDownload('btn-dl-excel', 'excel', 'Excel');
    handleDownload('btn-dl-csv', 'csv', 'CSV');
  }
};
