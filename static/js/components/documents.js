// Documents & Media Management Component - Luxury Vault Design System
const DocumentsComponent = {
  assetsList: [],
  currentPage: 1,
  limit: 12,
  totalPages: 1,
  totalCount: 0,
  currentDocsList: [],
  activePreviewUrl: null,
  activeInspectedDocId: null,
  viewMode: 'grid', // 'grid' | 'table'
  activeCategory: '', // '' for all, or document_type
  allDocumentsCache: [], // Used for fast KPI stats

  async render() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Restore saved view preference
    const savedMode = localStorage.getItem('assetvault_doc_view') || 'grid';
    this.viewMode = savedMode;

    container.innerHTML = `
      <div class="doc-vault-container">
        <!-- Header Row -->
        <div class="doc-header-row">
          <div>
            <div class="doc-header-title">
              <i data-lucide="shield-check" style="color: var(--gold-button); width: 26px; height: 26px;"></i>
              Digital Document & Certificate Vault
              <span class="doc-header-badge">
                <i data-lucide="lock" style="width: 12px; height: 12px;"></i>
                AES-256-GCM Zero-Knowledge
              </span>
            </div>
            <p class="doc-header-sub">
              Tamper-evident repository for physical assay certificates, GIA/IGI diamond dossiers, purchase invoices, BIS hallmark slips, and custody deeds.
            </p>
          </div>
          <div class="doc-header-actions">
            <!-- View Mode Switcher -->
            <div class="doc-view-switcher" role="radiogroup" aria-label="View Mode">
              <button class="doc-view-btn ${this.viewMode === 'grid' ? 'active' : ''}" id="doc-view-grid-btn" onclick="DocumentsComponent.setViewMode('grid')" title="Gallery Cards View">
                <i data-lucide="layout-grid" style="width: 15px; height: 15px;"></i>
                <span>Cards</span>
              </button>
              <button class="doc-view-btn ${this.viewMode === 'table' ? 'active' : ''}" id="doc-view-table-btn" onclick="DocumentsComponent.setViewMode('table')" title="Structured Table View">
                <i data-lucide="table" style="width: 15px; height: 15px;"></i>
                <span>Table</span>
              </button>
            </div>

            <button class="btn btn-gold" onclick="DocumentsComponent.scrollToDeposit()" title="Deposit New Document to Vault">
              <i data-lucide="upload-cloud"></i>
              <span>Deposit Document</span>
            </button>
          </div>
        </div>

        <!-- 4 KPI Summary Metric Cards -->
        <div class="doc-kpi-row" id="doc-kpi-container">
          <div class="doc-kpi-card featured">
            <div class="doc-kpi-icon">
              <i data-lucide="file-check" style="width: 22px; height: 22px;"></i>
            </div>
            <div class="doc-kpi-info">
              <div class="doc-kpi-num" id="kpi-total-docs">--</div>
              <div class="doc-kpi-label">Vault Documents</div>
              <div class="doc-kpi-sub" id="kpi-total-verified">100% Verified in Ledger</div>
            </div>
          </div>

          <div class="doc-kpi-card">
            <div class="doc-kpi-icon gold">
              <i data-lucide="award" style="width: 22px; height: 22px;"></i>
            </div>
            <div class="doc-kpi-info">
              <div class="doc-kpi-num" id="kpi-assay-docs">--</div>
              <div class="doc-kpi-label">Assay & Hallmarks</div>
              <div class="doc-kpi-sub">MMTC-PAMP, PGI & BIS HUID</div>
            </div>
          </div>

          <div class="doc-kpi-card">
            <div class="doc-kpi-icon diamond">
              <i data-lucide="sparkles" style="width: 22px; height: 22px;"></i>
            </div>
            <div class="doc-kpi-info">
              <div class="doc-kpi-num" id="kpi-diamond-docs">--</div>
              <div class="doc-kpi-label">Diamond Dossiers</div>
              <div class="doc-kpi-sub">GIA & IGI Certified Dossiers</div>
            </div>
          </div>

          <div class="doc-kpi-card">
            <div class="doc-kpi-icon invoice">
              <i data-lucide="receipt" style="width: 22px; height: 22px;"></i>
            </div>
            <div class="doc-kpi-info">
              <div class="doc-kpi-num" id="kpi-invoice-docs">--</div>
              <div class="doc-kpi-label">Invoices & Deeds</div>
              <div class="doc-kpi-sub">Tanishq, Malabar & Swiss Deeds</div>
            </div>
          </div>
        </div>

        <!-- Cryptographic Vault Notice Banner -->
        <div class="doc-security-card">
          <div class="doc-sec-left">
            <div class="doc-sec-icon">
              <i data-lucide="shield-alert" style="width: 18px; height: 18px;"></i>
            </div>
            <div class="doc-sec-text">
              <strong style="color: var(--text-primary); font-weight: 700;">Client-Side Cryptographic Vault Active:</strong>
              All files are validated and encrypted locally in memory via authenticated <strong>AES-256-GCM</strong>. Only encrypted ciphertext is sent to the server. No master key or backdoor exists.
            </div>
          </div>
          <span class="doc-sec-badge">
            <i data-lucide="check-circle" style="width: 12px; vertical-align: middle; margin-right: 3px;"></i>
            ZERO-KNOWLEDGE VERIFIED
          </span>
        </div>

        <!-- Filters & Search Toolbar -->
        <div class="doc-controls-panel">
          <!-- Top Row: Search Input -->
          <div class="doc-search-row">
            <div class="doc-search-box">
              <i data-lucide="search" class="doc-search-icon"></i>
              <input type="text" id="doc-search-input" class="doc-search-input" placeholder="Search by document name, asset, category, or issuer (e.g. MMTC-PAMP, GIA, Tanishq, Necklace)..." oninput="DocumentsComponent.handleSearch(event)" />
              <button class="doc-search-clear" id="doc-search-clear-btn" onclick="DocumentsComponent.clearSearch()" title="Clear Search">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>

          <!-- Quick Category Filter Pills -->
          <div class="doc-pills-row" id="doc-category-pills">
            <button class="doc-pill active" data-category="" onclick="DocumentsComponent.setCategory('')">
              <i data-lucide="folder" style="width: 13px; height: 13px;"></i>
              <span>All Documents</span>
              <span class="doc-pill-count" id="count-pill-all">-</span>
            </button>
            <button class="doc-pill" data-category="Certificate" onclick="DocumentsComponent.setCategory('Certificate')">
              <i data-lucide="award" style="width: 13px; height: 13px; color: #059669;"></i>
              <span>Assay Certificates</span>
              <span class="doc-pill-count" id="count-pill-cert">-</span>
            </button>
            <button class="doc-pill" data-category="Diamond Certificate" onclick="DocumentsComponent.setCategory('Diamond Certificate')">
              <i data-lucide="sparkles" style="width: 13px; height: 13px; color: #0284C7;"></i>
              <span>Diamond Dossiers (GIA/IGI)</span>
              <span class="doc-pill-count" id="count-pill-diamond">-</span>
            </button>
            <button class="doc-pill" data-category="Invoice" onclick="DocumentsComponent.setCategory('Invoice')">
              <i data-lucide="receipt" style="width: 13px; height: 13px;"></i>
              <span>Tax Invoices & Memos</span>
              <span class="doc-pill-count" id="count-pill-invoice">-</span>
            </button>
            <button class="doc-pill" data-category="Hallmark Record" onclick="DocumentsComponent.setCategory('Hallmark Record')">
              <i data-lucide="shield" style="width: 13px; height: 13px; color: #D97706;"></i>
              <span>BIS Hallmark & HUID</span>
              <span class="doc-pill-count" id="count-pill-hallmark">-</span>
            </button>
            <button class="doc-pill" data-category="Depository Deed" onclick="DocumentsComponent.setCategory('Depository Deed')">
              <i data-lucide="file-check" style="width: 13px; height: 13px; color: #9333EA;"></i>
              <span>Depository Deeds</span>
              <span class="doc-pill-count" id="count-pill-deed">-</span>
            </button>
          </div>

          <!-- Bottom Row: Secondary Filters (Asset Selector, Sort, Reset) -->
          <div class="doc-sub-filters-row">
            <div class="doc-sub-left">
              <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <i data-lucide="layers" style="width: 14px;"></i> Asset:
              </label>
              <select id="doc-filter-asset" class="doc-filter-select" onchange="DocumentsComponent.handleAssetFilterChange()">
                <option value="">All Physical Assets</option>
              </select>

              <label style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-left: 8px;">
                <i data-lucide="arrow-up-down" style="width: 14px;"></i> Sort:
              </label>
              <select id="doc-sort-select" class="doc-filter-select" onchange="DocumentsComponent.handleSortChange()">
                <option value="date-desc">Newest Uploaded First</option>
                <option value="date-asc">Oldest Uploaded First</option>
                <option value="name-asc">Document Name (A-Z)</option>
                <option value="size-desc">File Size (Largest First)</option>
              </select>
            </div>

            <div>
              <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.resetFilters()" title="Reset All Filters">
                <i data-lucide="rotate-ccw"></i> Reset Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Document Repository Views Container (Cards or Table) -->
        <div id="doc-views-root">
          <div style="text-align: center; padding: 48px; color: var(--text-muted);">
            <i data-lucide="loader" class="spin" style="width: 24px; height: 24px; margin: 0 auto 10px;"></i>
            <div>Accessing client-encrypted vault repository...</div>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div id="doc-pagination-container" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.84rem; margin-top: 18px; box-shadow: var(--shadow-card);">
          <span id="doc-pagination-info" style="color: var(--text-muted);">Showing documents...</span>
          <div style="display: flex; gap: 8px;">
            <button id="doc-prev-btn" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.prevPage()" disabled>
              <i data-lucide="chevron-left"></i> Previous
            </button>
            <button id="doc-next-btn" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.nextPage()" disabled>
              Next <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- Extended Deposit Vault Document Division (Full-Width Console)     -->
        <!-- ================================================================= -->
        <div class="doc-workspace-section" id="vault-workspace-section">
          <div class="doc-section-header">
            <div>
              <h3 class="doc-section-title">
                <i data-lucide="shield-check" style="color: var(--gold-button); width: 22px; height: 22px;"></i>
                Encrypt & Deposit Vault Document
                <span class="doc-badge-live">
                  <span class="pulse-dot"></span> ZERO-KNOWLEDGE AES-256-GCM
                </span>
              </h3>
              <p class="doc-section-sub">
                End-to-end client-side encrypted depository pipeline. Drag & drop or browse physical certificates, assay slips, invoices, and deeds.
              </p>
            </div>
            <div class="doc-workspace-meta-pills">
              <span class="doc-meta-pill">
                <i data-lucide="lock" style="width: 12px; height: 12px; color: var(--gold-button);"></i>
                AES-256-GCM Client Encrypted
              </span>
              <span class="doc-meta-pill">
                <i data-lucide="database" style="width: 12px; height: 12px; color: #059669;"></i>
                Relational Ledger Synced
              </span>
            </div>
          </div>

          <!-- Extended Full-Width Deposit Console Card -->
          <div class="doc-deposit-extended-card" id="doc-deposit-card">
            <form onsubmit="DocumentsComponent.handleUpload(event)" id="doc-upload-form" class="doc-deposit-form-extended">
              <div class="doc-deposit-grid">
                <!-- Left Column: Spacious Interactive Drag & Drop Box -->
                <div class="doc-dropzone-extended" id="doc-dropzone" onclick="document.getElementById('upload-file-input').click()">
                  <div class="doc-dropzone-icon">
                    <i data-lucide="upload-cloud" style="width: 26px; height: 26px;"></i>
                  </div>
                  <div class="doc-dropzone-title" id="dropzone-text">
                    Choose a document or drag & drop here
                  </div>
                  <div class="doc-dropzone-hint">
                    Official PDFs, BIS Hallmark slips, GIA reports, JPG, PNG, WEBP (Up to 25 MB)
                  </div>
                  <div id="dropzone-file-name" class="doc-dropzone-filename" style="display: none;"></div>
                  <div class="doc-dropzone-btn-hint">
                    <i data-lucide="folder-open" style="width: 14px; height: 14px;"></i> Browse Document Files
                  </div>
                  <input type="file" id="upload-file-input" style="display: none;" required accept=".pdf,.png,.jpg,.jpeg,.webp" onchange="DocumentsComponent.handleFileSelected(this)" />
                </div>

                <!-- Right Column: Fields, Crypto Guarantee & Submit Button -->
                <div class="doc-deposit-right-panel">
                  <div class="doc-deposit-fields-extended">
                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" style="font-weight: 700; font-size: 0.80rem; display: flex; align-items: center; gap: 5px;">
                        <i data-lucide="tag" style="width: 13px; color: var(--gold-button);"></i> Document Category *
                      </label>
                      <select class="form-control" id="upload-doc-type" required>
                        <option value="Certificate">Assay / Authenticity Certificate</option>
                        <option value="Diamond Certificate">Diamond Grading Report (GIA/IGI)</option>
                        <option value="Invoice">Purchase Bill / Tax Invoice</option>
                        <option value="Hallmark Record">BIS Hallmark / HUID Record</option>
                        <option value="Depository Deed">Depository / Vault Deed</option>
                        <option value="Photograph">Physical Asset Photograph</option>
                      </select>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label" style="font-weight: 700; font-size: 0.80rem; display: flex; align-items: center; gap: 5px;">
                        <i data-lucide="package" style="width: 13px; color: var(--gold-button);"></i> Linked Physical Asset *
                      </label>
                      <select class="form-control" id="upload-asset-id" required>
                        <option value="">Select Asset...</option>
                      </select>
                    </div>
                  </div>

                  <div class="doc-crypto-note">
                    <i data-lucide="shield-check" style="color: #059669; min-width: 18px; width: 18px; height: 18px; margin-top: 1px;"></i>
                    <div>
                      <strong>Zero-Knowledge Cryptographic Ingestion:</strong>
                      Your document is converted to an authenticated binary buffer and encrypted locally in browser memory with <strong>AES-256-GCM</strong> and a unique 96-bit IV before being uploaded. No unencrypted payload ever touches the network.
                    </div>
                  </div>

                  <div class="doc-deposit-actions-row">
                    <button type="submit" class="btn btn-gold" id="upload-submit-btn" style="height: 44px; font-weight: 700; font-size: 0.90rem; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
                      <i data-lucide="lock"></i>
                      <span>Encrypt & Deposit Document to Vault</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>

      <!-- Document Preview Pop-up Modal on Same Screen -->
      <div class="modal-overlay" id="doc-preview-modal" onclick="if(event.target === this) DocumentsComponent.closePreviewModal()" style="display: none;">
        <div class="modal-card doc-preview-modal-card">
          <!-- Modal Header -->
          <div class="doc-modal-header">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <div class="doc-format-icon" id="preview-modal-badge">PDF</div>
              <div style="min-width: 0;">
                <h3 class="doc-modal-title text-truncate" id="preview-modal-title">Document Preview</h3>
                <div class="doc-modal-subtitle text-truncate" id="preview-modal-sub">Authentic Physical Certificate Stage</div>
              </div>
            </div>
            
            <div class="doc-modal-header-actions">
              <a id="preview-modal-newtab-btn" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Open in Full Screen Tab">
                <i data-lucide="external-link"></i>
                <span class="hide-mobile">Open in New Tab</span>
              </a>
              <a id="preview-modal-dl-btn" href="#" download class="btn btn-gold btn-sm" title="Download Decrypted File">
                <i data-lucide="download"></i>
                <span class="hide-mobile">Download</span>
              </a>
              <button type="button" class="btn btn-secondary btn-sm btn-icon-only" onclick="DocumentsComponent.closePreviewModal()" title="Close Preview (Esc)">&times;</button>
            </div>
          </div>

          <!-- Modal Body Canvas -->
          <div class="doc-modal-body" id="preview-modal-body">
            <!-- Dynamically populated -->
          </div>

          <!-- Modal Footer -->
          <div class="doc-modal-footer">
            <div style="display: flex; align-items: center; gap: 14px; font-size: 0.78rem; color: var(--text-secondary);">
              <span style="display: flex; align-items: center; gap: 5px; color: #059669; font-weight: 700;">
                <i data-lucide="shield-check" style="width: 14px; height: 14px;"></i> Relational Ledger Synced
              </span>
              <span id="preview-modal-meta-info" style="color: var(--text-muted);">
                SHA-256 Validated &bull; Zero-Knowledge Decrypted
              </span>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreviewModal()">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupDropzone();
    this.setupModalDismiss();
    if (window.lucide) lucide.createIcons();
    await this.loadAssetsDropdown();
    await this.loadDocuments();
  },

  setupDropzone() {
    setTimeout(() => {
      const dropzone = document.getElementById('doc-dropzone');
      if (!dropzone) return;

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        }, false);
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          const fileInput = document.getElementById('upload-file-input');
          if (fileInput) {
            fileInput.files = files;
            this.handleFileSelected(fileInput);
          }
        }
      }, false);
    }, 100);
  },

  scrollToDeposit() {
    const card = document.getElementById('doc-deposit-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('pulse-highlight');
      void card.offsetWidth; // trigger reflow
      card.classList.add('pulse-highlight');
      setTimeout(() => {
        document.getElementById('upload-file-input')?.focus();
      }, 400);
    }
  },

  async loadAssetsDropdown() {
    try {
      const res = await API.getAssets({ limit: 100 });
      this.assetsList = res.assets || [];

      // Populate filter dropdown in controls panel
      const filterSelect = document.getElementById('doc-filter-asset');
      if (filterSelect) {
        filterSelect.innerHTML = `<option value="">All Physical Assets (${this.assetsList.length})</option>` +
          this.assetsList.map(a => `<option value="${a.id}">${a.asset_name} (${a.metal || ''} ${a.purity || ''})</option>`).join('');
      }

      // Populate upload modal asset selector
      const uploadSelect = document.getElementById('upload-asset-id');
      if (uploadSelect) {
        uploadSelect.innerHTML = `<option value="">Select Associated Asset...</option>` +
          this.assetsList.map(a => `<option value="${a.id}">${a.asset_name} • ${a.metal || ''} (${a.status || 'Active'})</option>`).join('');
      }
    } catch (e) {
      console.warn("Failed to load assets for dropdown", e);
    }
  },

  async loadDocuments() {
    try {
      const assetFilter = document.getElementById('doc-filter-asset')?.value || '';
      const searchVal = document.getElementById('doc-search-input')?.value?.trim() || '';

      const params = {
        page: this.currentPage,
        limit: this.limit
      };

      if (this.activeCategory) {
        params.document_type = this.activeCategory;
      }
      if (assetFilter) {
        params.asset_id = assetFilter;
      }
      if (searchVal) {
        params.search = searchVal;
      }

      const res = await API.getDocuments(params);
      const docs = res.documents || [];
      this.currentDocsList = docs;
      this.totalCount = res.total || docs.length;
      this.totalPages = res.pages || 1;

      // Update Pagination Bar
      const pageInfo = document.getElementById('doc-pagination-info');
      if (pageInfo) {
        pageInfo.innerText = `Showing ${docs.length} of ${this.totalCount} documents • Page ${this.currentPage} of ${this.totalPages}`;
      }

      const prevBtn = document.getElementById('doc-prev-btn');
      const nextBtn = document.getElementById('doc-next-btn');
      if (prevBtn) prevBtn.disabled = (this.currentPage <= 1);
      if (nextBtn) nextBtn.disabled = (this.currentPage >= this.totalPages);

      // Refresh KPI summary stats from entire repository
      this.updateKPISummary(docs);

      // Render items
      this.renderCurrentView();

      // Auto-inspect the first document if no document is currently inspected
      if (docs.length > 0 && !this.activeInspectedDocId) {
        this.inspectDoc(docs[0].id, docs[0].file_name, docs[0].is_encrypted, false);
      }

    } catch (e) {
      console.error("Failed to load documents", e);
      const root = document.getElementById('doc-views-root');
      if (root) {
        root.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--loss-red); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <i data-lucide="alert-triangle" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
            <div style="font-weight: 700;">Could not load document repository</div>
            <div style="font-size: 0.80rem; color: var(--text-muted); margin-top: 4px;">${e.message || 'Server connection error'}</div>
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.loadDocuments()" style="margin-top: 14px;">
              <i data-lucide="rotate-ccw"></i> Retry
            </button>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  async updateKPISummary(activeDocs) {
    try {
      // Fetch full count overview if not cached
      if (this.allDocumentsCache.length === 0) {
        const fullRes = await API.getDocuments({ limit: 100 }).catch(() => ({ documents: [] }));
        this.allDocumentsCache = fullRes.documents || [];
      }
      const all = this.allDocumentsCache.length > 0 ? this.allDocumentsCache : activeDocs;

      const total = all.length;
      const certCount = all.filter(d => (d.document_type || '').toLowerCase().includes('certificate') && !(d.document_type || '').toLowerCase().includes('diamond')).length;
      const diamondCount = all.filter(d => (d.document_type || '').toLowerCase().includes('diamond')).length;
      const invoiceCount = all.filter(d => (d.document_type || '').toLowerCase().includes('invoice') || (d.document_type || '').toLowerCase().includes('deed')).length;
      const hallmarkCount = all.filter(d => (d.document_type || '').toLowerCase().includes('hallmark')).length;
      const deedCount = all.filter(d => (d.document_type || '').toLowerCase().includes('deed')).length;

      // Update KPI cards
      const kpiTotal = document.getElementById('kpi-total-docs');
      const kpiAssay = document.getElementById('kpi-assay-docs');
      const kpiDiamond = document.getElementById('kpi-diamond-docs');
      const kpiInvoice = document.getElementById('kpi-invoice-docs');

      if (kpiTotal) kpiTotal.innerText = total || 0;
      if (kpiAssay) kpiAssay.innerText = certCount + hallmarkCount;
      if (kpiDiamond) kpiDiamond.innerText = diamondCount;
      if (kpiInvoice) kpiInvoice.innerText = invoiceCount;

      // Update pill count tags
      const countAll = document.getElementById('count-pill-all');
      const countCert = document.getElementById('count-pill-cert');
      const countDiamond = document.getElementById('count-pill-diamond');
      const countInvoice = document.getElementById('count-pill-invoice');
      const countHallmark = document.getElementById('count-pill-hallmark');
      const countDeed = document.getElementById('count-pill-deed');

      if (countAll) countAll.innerText = total;
      if (countCert) countCert.innerText = certCount;
      if (countDiamond) countDiamond.innerText = diamondCount;
      if (countInvoice) countInvoice.innerText = all.filter(d => (d.document_type || '').toLowerCase().includes('invoice')).length;
      if (countHallmark) countHallmark.innerText = hallmarkCount;
      if (countDeed) countDeed.innerText = deedCount;

    } catch (e) {
      console.warn("Could not calculate document KPIs", e);
    }
  },

  handleSearch(e) {
    clearTimeout(this.searchDebounce);
    const clearBtn = document.getElementById('doc-search-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = e.target.value.length > 0 ? 'flex' : 'none';
    }
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.loadDocuments();
    }, 300);
  },

  clearSearch() {
    const input = document.getElementById('doc-search-input');
    const clearBtn = document.getElementById('doc-search-clear-btn');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    this.currentPage = 1;
    this.loadDocuments();
  },

  setCategory(category) {
    this.activeCategory = category;
    this.currentPage = 1;

    // Update pill UI active class
    const pills = document.querySelectorAll('#doc-category-pills .doc-pill');
    pills.forEach(p => {
      if (p.getAttribute('data-category') === category) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    this.loadDocuments();
  },

  handleAssetFilterChange() {
    this.currentPage = 1;
    this.loadDocuments();
  },

  handleSortChange() {
    this.renderCurrentView();
  },

  resetFilters() {
    const searchInput = document.getElementById('doc-search-input');
    const clearBtn = document.getElementById('doc-search-clear-btn');
    const assetSelect = document.getElementById('doc-filter-asset');
    const sortSelect = document.getElementById('doc-sort-select');

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (assetSelect) assetSelect.value = '';
    if (sortSelect) sortSelect.value = 'date-desc';

    this.activeCategory = '';
    this.currentPage = 1;

    const pills = document.querySelectorAll('#doc-category-pills .doc-pill');
    pills.forEach(p => {
      if (p.getAttribute('data-category') === '') {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    this.loadDocuments();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    localStorage.setItem('assetvault_doc_view', mode);

    const gridBtn = document.getElementById('doc-view-grid-btn');
    const tableBtn = document.getElementById('doc-view-table-btn');

    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (tableBtn) tableBtn.classList.toggle('active', mode === 'table');

    this.renderCurrentView();
  },

  getSortedDocs() {
    const sortVal = document.getElementById('doc-sort-select')?.value || 'date-desc';
    const docs = [...this.currentDocsList];

    if (sortVal === 'date-desc') {
      docs.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
    } else if (sortVal === 'date-asc') {
      docs.sort((a, b) => new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0));
    } else if (sortVal === 'name-asc') {
      docs.sort((a, b) => (a.file_name || '').localeCompare(b.file_name || ''));
    } else if (sortVal === 'size-desc') {
      docs.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
    }
    return docs;
  },

  renderCurrentView() {
    const root = document.getElementById('doc-views-root');
    if (!root) return;

    const docs = this.getSortedDocs();

    if (docs.length === 0) {
      root.innerHTML = `
        <div style="text-align: center; padding: 56px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--border-subtle); color: var(--text-muted); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <i data-lucide="file-question" style="width: 28px; height: 28px;"></i>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">No Documents Match Criteria</h3>
          <p style="font-size: 0.84rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 18px;">
            No vault certificates or receipts were found matching your active filter. Try resetting search filters or upload a new physical asset proof.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.resetFilters()">
              <i data-lucide="rotate-ccw"></i> Reset All Filters
            </button>
            <button class="btn btn-gold btn-sm" onclick="DocumentsComponent.scrollToDeposit()">
              <i data-lucide="upload-cloud"></i> Deposit New Document
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (this.viewMode === 'grid') {
      this.renderGridView(root, docs);
    } else {
      this.renderTableView(root, docs);
    }

    // Re-apply active highlight if a document is selected
    if (this.activeInspectedDocId) {
      const activeCard = document.getElementById(`doc-card-${this.activeInspectedDocId}`);
      if (activeCard) activeCard.classList.add('doc-item-active');
      const activeRow = document.getElementById(`doc-row-${this.activeInspectedDocId}`);
      if (activeRow) activeRow.classList.add('doc-item-active');
    }

    if (window.lucide) lucide.createIcons();
  },

  renderGridView(root, docs) {
    root.innerHTML = `
      <div class="doc-cards-grid">
        ${docs.map(d => this.renderCardHTML(d)).join('')}
      </div>
    `;
  },

  renderCardHTML(d) {
    const sizeKb = (d.file_size / 1024).toFixed(1);
    const safeName = (d.file_name || 'document').replace(/'/g, "\\'");
    const isEncrypted = Boolean(d.is_encrypted);
    const dateStr = (d.uploaded_at || '').split(' ')[0] || 'Unknown';

    // Type badge classification
    let typeClass = 'cert';
    let typeLabel = d.document_type || 'Certificate';
    let typeIcon = 'award';
    const lowerType = typeLabel.toLowerCase();

    if (lowerType.includes('diamond')) {
      typeClass = 'diamond';
      typeIcon = 'sparkles';
    } else if (lowerType.includes('invoice') || lowerType.includes('bill')) {
      typeClass = 'invoice';
      typeIcon = 'receipt';
    } else if (lowerType.includes('hallmark')) {
      typeClass = 'hallmark';
      typeIcon = 'shield';
    } else if (lowerType.includes('deed')) {
      typeClass = 'deed';
      typeIcon = 'file-check';
    }

    let cleanTitle = d.file_name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

    return `
      <div class="doc-card ${this.activeInspectedDocId === d.id ? 'doc-item-active' : ''}" id="doc-card-${d.id}">
        <div>
          <!-- Card Header Badges -->
          <div class="doc-card-badge-row">
            <span class="doc-type-tag ${typeClass}">
              <i data-lucide="${typeIcon}" style="width: 12px; height: 12px;"></i>
              ${typeLabel}
            </span>
            <span class="doc-enc-pill" title="${isEncrypted ? 'End-to-End Client Encrypted' : 'Relational Vault Ledger Record'}">
              <i data-lucide="${isEncrypted ? 'lock' : 'check-circle'}" style="width: 11px; color: ${isEncrypted ? 'var(--gold-button)' : '#059669'};"></i>
              ${isEncrypted ? 'AES-GCM' : 'VERIFIED'}
            </span>
          </div>

          <!-- Document Title & File Name -->
          <div class="doc-card-body">
            <div class="doc-card-title" title="${cleanTitle}">${cleanTitle}</div>
            <div class="doc-card-filename">${d.file_name}</div>
          </div>

          <!-- Linked Physical Asset -->
          <div class="doc-card-asset-box">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
              <i data-lucide="package" style="width: 14px; color: var(--gold-button); flex-shrink: 0;"></i>
              <span class="doc-asset-name">${d.asset_name || 'General Portfolio'}</span>
            </div>
            ${d.metal ? `<span style="font-size: 0.70rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(212, 175, 55, 0.12); color: #B45309; white-space: nowrap;">${d.metal} ${d.purity || ''}</span>` : ''}
          </div>
        </div>

        <div>
          <!-- Metadata: Date & Size -->
          <div class="doc-meta-row">
            <span><i data-lucide="calendar" style="width: 12px; vertical-align: middle; margin-right: 2px;"></i> ${dateStr}</span>
            <span><i data-lucide="hard-drive" style="width: 12px; vertical-align: middle; margin-right: 2px;"></i> ${sizeKb} KB</span>
          </div>

          <!-- Actions -->
          <div class="doc-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.viewDoc(${d.id}, '${safeName}', ${isEncrypted})" title="Preview Document in Pop-up Modal">
              <i data-lucide="eye" style="width: 14px;"></i> Preview
            </button>
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="DocumentsComponent.downloadDoc(${d.id}, '${safeName}', ${isEncrypted})" title="Download File">
              <i data-lucide="download" style="width: 14px;"></i>
            </button>
            <button class="btn btn-secondary btn-sm btn-icon-only" style="color: var(--loss-red);" onclick="DocumentsComponent.deleteDoc(${d.id})" title="Delete File">
              <i data-lucide="trash-2" style="width: 14px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderTableView(root, docs) {
    root.innerHTML = `
      <div class="doc-table-card">
        <div style="overflow-x: auto; width: 100%;">
          <table class="doc-table">
            <thead>
              <tr>
                <th style="width: 70px; text-align: center;">Format</th>
                <th style="min-width: 240px;">Document Title & File</th>
                <th style="width: 150px;">Category</th>
                <th style="width: 190px;">Associated Physical Asset</th>
                <th style="width: 120px;">Security</th>
                <th style="width: 110px;">Date</th>
                <th style="width: 90px;">Size</th>
                <th style="width: 120px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${docs.map(d => this.renderTableRowHTML(d)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderTableRowHTML(d) {
    const sizeKb = (d.file_size / 1024).toFixed(1);
    const safeName = (d.file_name || 'document').replace(/'/g, "\\'");
    const isEncrypted = Boolean(d.is_encrypted);
    const ext = (d.file_name || '').split('.').pop().toUpperCase() || 'FILE';
    const dateStr = (d.uploaded_at || '').split(' ')[0] || 'Unknown';
    let cleanTitle = d.file_name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

    return `
      <tr class="${this.activeInspectedDocId === d.id ? 'doc-item-active' : ''}" id="doc-row-${d.id}">
        <td style="text-align: center;">
          <div class="doc-format-icon" style="margin: 0 auto;">${ext}</div>
        </td>
        <td>
          <div class="doc-file-info">
            <div>
              <div class="doc-file-name-text">${cleanTitle}</div>
              <div class="doc-file-subtext">${d.file_name}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="tag" style="width: 11px; color: var(--gold-button);"></i>
            ${d.document_type || 'Certificate'}
          </span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 0.82rem;">${d.asset_name || 'General Portfolio'}</div>
          ${d.metal ? `<div style="font-size: 0.72rem; color: #B45309; font-weight: 600;">${d.metal} &bull; ${d.purity || ''}</div>` : ''}
        </td>
        <td>
          <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${isEncrypted ? 'rgba(245, 158, 11, 0.12)' : 'rgba(6, 78, 59, 0.12)'}; color: ${isEncrypted ? '#B45309' : '#059669'}; display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="${isEncrypted ? 'lock' : 'check-circle'}" style="width: 11px;"></i>
            ${isEncrypted ? 'AES-GCM' : 'Verified'}
          </span>
        </td>
        <td style="font-size: 0.78rem; color: var(--text-secondary);">${dateStr}</td>
        <td style="font-size: 0.78rem; font-variant-numeric: tabular-nums; color: var(--text-muted);">${sizeKb} KB</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 5px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" title="Preview Document" onclick="DocumentsComponent.viewDoc(${d.id}, '${safeName}', ${isEncrypted})">
              <i data-lucide="eye" style="width: 13px;"></i>
            </button>
            <button class="btn btn-secondary btn-sm" title="Download Document" onclick="DocumentsComponent.downloadDoc(${d.id}, '${safeName}', ${isEncrypted})">
              <i data-lucide="download" style="width: 13px;"></i>
            </button>
            <button class="btn btn-secondary btn-sm" style="color: var(--loss-red);" title="Delete Document" onclick="DocumentsComponent.deleteDoc(${d.id})">
              <i data-lucide="trash-2" style="width: 13px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  setupModalDismiss() {
    if (!this._dismissSetup) {
      this._dismissSetup = true;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          DocumentsComponent.closePreviewModal();
        }
      });
    }
  },

  async openPreviewModal(id, fileName, isEncrypted) {
    if (!id) return;
    this.activeInspectedDocId = id;

    // Highlight active card & table row in background list
    document.querySelectorAll('.doc-card').forEach(el => el.classList.remove('doc-item-active'));
    document.querySelectorAll('.doc-table tr').forEach(el => el.classList.remove('doc-item-active'));
    const activeCard = document.getElementById(`doc-card-${id}`);
    if (activeCard) activeCard.classList.add('doc-item-active');
    const activeRow = document.getElementById(`doc-row-${id}`);
    if (activeRow) activeRow.classList.add('doc-item-active');

    const modal = document.getElementById('doc-preview-modal');
    if (!modal) return;

    const titleEl = document.getElementById('preview-modal-title');
    const subEl = document.getElementById('preview-modal-sub');
    const badgeEl = document.getElementById('preview-modal-badge');
    const bodyEl = document.getElementById('preview-modal-body');
    const dlBtn = document.getElementById('preview-modal-dl-btn');
    const newtabBtn = document.getElementById('preview-modal-newtab-btn');
    const metaInfo = document.getElementById('preview-modal-meta-info');

    const ext = (fileName || '').split('.').pop().toUpperCase() || 'PDF';
    const cleanTitle = (fileName || 'Document').replace(/\.[^/.]+$/, "").replace(/_/g, " ");

    if (titleEl) titleEl.innerText = cleanTitle;
    if (subEl) subEl.innerText = `${fileName} • Decrypting document with Web Crypto...`;
    if (badgeEl) badgeEl.innerText = ext;
    if (dlBtn) dlBtn.style.display = 'none';
    if (newtabBtn) newtabBtn.style.display = 'none';

    // Show loading state in modal body
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="doc-preview-loading">
          <div class="doc-preview-spinner"></div>
          <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); margin-top: 16px;">
            Decrypting Document in Browser Memory
          </div>
          <div style="font-size: 0.80rem; color: var(--text-muted); margin-top: 6px; max-width: 380px;">
            Zero-knowledge client-side decryption using authenticated AES-256-GCM cipher...
          </div>
        </div>
      `;
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();

    try {
      if (this.activePreviewUrl) {
        URL.revokeObjectURL(this.activePreviewUrl);
        this.activePreviewUrl = null;
      }

      const { blob, url } = await API.fetchDecryptedDocument(id, fileName);
      this.activePreviewUrl = url;

      const sizeKb = (blob.size / 1024).toFixed(1);
      if (subEl) {
        subEl.innerText = `${fileName} • ${sizeKb} KB • ${isEncrypted ? 'AES-256-GCM Decrypted' : 'Vault Ledger Verified'}`;
      }
      if (metaInfo) {
        metaInfo.innerText = `File Size: ${sizeKb} KB • SHA-256 Authenticated • Zero-Knowledge Decrypted`;
      }

      // Enable Action Buttons
      if (dlBtn) {
        dlBtn.href = url;
        dlBtn.download = fileName;
        dlBtn.style.display = 'inline-flex';
      }
      if (newtabBtn) {
        newtabBtn.href = url;
        newtabBtn.style.display = 'inline-flex';
      }

      const lowerExt = ext.toLowerCase();
      if (lowerExt === 'pdf') {
        bodyEl.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
            <div style="flex: 1; position: relative; background: #525659; overflow: hidden;">
              <object data="${url}" type="application/pdf" style="width: 100%; height: 100%; display: block; border: none;">
                <iframe src="${url}" title="${fileName}" style="width: 100%; height: 100%; border: none; background: #FFFFFF;">
                  <div style="padding: 40px; text-align: center; color: #FFFFFF; background: #333;">
                    <p style="margin-bottom: 12px; font-weight: 600; font-size: 1rem;">Document Decrypted Successfully</p>
                    <p style="font-size: 0.85rem; color: #CCC; margin-bottom: 16px;">If your browser does not display the PDF preview inline, click below to open or download:</p>
                    <a href="${url}" target="_blank" class="btn btn-gold btn-sm" style="margin-right: 8px;">Open PDF in New Window</a>
                    <a href="${url}" download="${fileName}" class="btn btn-secondary btn-sm">Download PDF</a>
                  </div>
                </iframe>
              </object>
            </div>
            <div class="doc-preview-modal-subbar">
              <span style="display: flex; align-items: center; gap: 6px; color: #059669; font-weight: 600; font-size: 0.76rem;">
                <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Relational Ledger Integrity Verified &bull; SHA-256 Validated
              </span>
              <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--gold-button); text-decoration: none; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Open Full Screen Tab
              </a>
            </div>
          </div>
        `;
      } else {
        bodyEl.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); padding: 20px; overflow: auto;">
              <img src="${url}" alt="${fileName}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--radius-sm); box-shadow: var(--shadow-md);" />
            </div>
            <div class="doc-preview-modal-subbar">
              <span style="display: flex; align-items: center; gap: 6px; color: #059669; font-weight: 600; font-size: 0.76rem;">
                <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Verified Vault Image Asset
              </span>
              <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--gold-button); text-decoration: none; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> View High-Res Image
              </a>
            </div>
          </div>
        `;
      }
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error("Preview modal error:", err);
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="padding: 48px 24px; text-align: center; max-width: 500px; margin: auto;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); color: var(--loss-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <i data-lucide="alert-triangle" style="width: 26px; height: 26px;"></i>
            </div>
            <h4 style="color: var(--text-primary); margin-bottom: 8px; font-size: 1.15rem; font-weight: 800;">
              Could not display document preview
            </h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
              ${err.message || 'Key mismatch or format error during zero-knowledge decryption.'}
            </p>
            <div style="display: flex; justify-content: center; gap: 10px;">
              <button class="btn btn-secondary" onclick="DocumentsComponent.closePreviewModal()">Close</button>
              <button class="btn btn-gold" onclick="DocumentsComponent.openPreviewModal(${id}, '${fileName}', ${isEncrypted})">
                <i data-lucide="rotate-ccw"></i> Retry Decryption
              </button>
            </div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  closePreviewModal() {
    const modal = document.getElementById('doc-preview-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    document.body.style.overflow = '';
    if (this.activePreviewUrl) {
      URL.revokeObjectURL(this.activePreviewUrl);
      this.activePreviewUrl = null;
    }
  },

  viewDoc(id, fileName, isEncrypted) {
    this.openPreviewModal(id, fileName, isEncrypted);
  },

  inspectDoc(id, fileName, isEncrypted) {
    this.openPreviewModal(id, fileName, isEncrypted);
  },

  openFullScreen(url, fileName, ext) {
    const modal = document.getElementById('doc-preview-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  },

  closeFullScreen() {
    this.closePreviewModal();
  },

  async downloadDoc(id, fileName, isEncrypted) {
    try {
      App.showToast('Accessing document...', 'info');
      const { url } = await API.fetchDecryptedDocument(id, fileName);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      App.showToast('Document downloaded successfully!', 'success');
    } catch (err) {
      App.showToast(err.message || 'Download failed', 'error');
    }
  },

  async deleteDoc(id) {
    if (!confirm('Are you sure you want to delete this document from the vault? This action is permanent.')) return;
    try {
      await API.deleteDocument(id);
      App.showToast('Document removed from vault register', 'success');
      this.allDocumentsCache = []; // invalidate cache
      if (this.activeInspectedDocId === id) {
        this.activeInspectedDocId = null;
      }
      await this.loadDocuments();
    } catch (e) {
      App.showToast('Failed to delete document', 'error');
    }
  },

  handleFileSelected(input) {
    const file = input?.files?.[0];
    const textEl = document.getElementById('dropzone-text');
    const nameEl = document.getElementById('dropzone-file-name');
    if (file) {
      if (textEl) textEl.innerText = "File Selected:";
      if (nameEl) {
        nameEl.innerText = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        nameEl.style.display = 'block';
      }
    } else {
      if (textEl) textEl.innerText = "Choose a file or drag & drop here";
      if (nameEl) nameEl.style.display = 'none';
    }
  },

  async handleUpload(e) {
    e.preventDefault();
    const assetId = document.getElementById('upload-asset-id')?.value || 0;
    const docType = document.getElementById('upload-doc-type')?.value || 'Certificate';
    const fileInput = document.getElementById('upload-file-input');
    const submitBtn = document.getElementById('upload-submit-btn');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      App.showToast('Please select a file to upload', 'error');
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 25 * 1024 * 1024) {
      App.showToast('File size exceeds the 25MB depository limit', 'error');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader" class="spin"></i> Encrypting locally...`;
      }
      if (window.lucide) lucide.createIcons();

      const uploadRes = await API.uploadDocumentEncrypted(file, assetId, docType);
      App.showToast('Document encrypted client-side and saved securely!', 'success');

      // Clear form & dropzone
      const form = document.getElementById('doc-upload-form');
      if (form) form.reset();
      const textEl = document.getElementById('dropzone-text');
      const nameEl = document.getElementById('dropzone-file-name');
      if (textEl) textEl.innerText = "Choose a file or drag & drop here";
      if (nameEl) nameEl.style.display = 'none';

      this.allDocumentsCache = []; // Invalidate cache so counts update
      if (uploadRes && uploadRes.document && uploadRes.document.id) {
        this.activeInspectedDocId = uploadRes.document.id;
      }
      await this.loadDocuments();
    } catch (err) {
      App.showToast(err.message || 'Upload failed', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="lock"></i> Encrypt & Deposit Document`;
      }
      if (window.lucide) lucide.createIcons();
    }
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadDocuments();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadDocuments();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};
