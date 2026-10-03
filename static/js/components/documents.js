// Documents & Media Management Component - Luxury Vault Design System
const DocumentsComponent = {
  assetsList: [],
  currentPage: 1,
  limit: 12,
  totalPages: 1,
  totalCount: 0,
  activePreviewUrl: null,
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

            <button class="btn btn-gold" onclick="DocumentsComponent.openUploadModal()" title="Upload & Encrypt Proof Document">
              <i data-lucide="upload-cloud"></i>
              <span>Upload Document</span>
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

        <!-- Document Views Container -->
        <div id="doc-views-root">
          <!-- Populated dynamically: Gallery Cards or Table -->
          <div style="text-align: center; padding: 48px; color: var(--text-muted);">
            <i data-lucide="loader" class="spin" style="width: 24px; height: 24px; margin: 0 auto 10px;"></i>
            <div>Accessing client-encrypted vault repository...</div>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div id="doc-pagination-container" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.84rem; margin-top: 20px; box-shadow: var(--shadow-card);">
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
      </div>

      <!-- Enhanced Document Upload Modal -->
      <div class="modal-backdrop" id="upload-doc-modal">
        <div class="modal-card" style="max-width: 560px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); color: var(--gold-button); display: flex; align-items: center; justify-content: center;">
                <i data-lucide="file-plus" style="width: 20px; height: 20px;"></i>
              </div>
              <div>
                <h3 class="modal-title" style="margin: 0; font-size: 1.15rem;">Encrypt & Deposit Vault Document</h3>
                <div style="font-size: 0.75rem; color: var(--text-muted);">End-to-End Encrypted Physical Asset Repository</div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="DocumentsComponent.closeModal()" title="Close">&times;</button>
          </div>

          <form onsubmit="DocumentsComponent.handleUpload(event)">
            <div class="modal-body" style="padding: 20px 24px;">
              <!-- Drag and Drop Zone -->
              <div class="doc-dropzone" id="doc-dropzone" onclick="document.getElementById('upload-file-input').click()">
                <div class="doc-dropzone-icon">
                  <i data-lucide="upload-cloud" style="width: 22px; height: 22px;"></i>
                </div>
                <div style="font-size: 0.90rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;" id="dropzone-text">
                  Choose a file or drag & drop here
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  PDF, PNG, JPG, JPEG, WEBP (Max: 25 MB)
                </div>
                <div id="dropzone-file-name" style="margin-top: 8px; font-weight: 700; color: var(--gold-button); font-size: 0.82rem; display: none;"></div>
                <input type="file" id="upload-file-input" style="display: none;" required accept=".pdf,.png,.jpg,.jpeg,.webp" onchange="DocumentsComponent.handleFileSelected(this)" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px;">
                <div class="form-group">
                  <label class="form-label" style="font-weight: 700; font-size: 0.80rem;">Document Type *</label>
                  <select class="form-control" id="upload-doc-type" required>
                    <option value="Certificate">Assay / Authenticity Certificate</option>
                    <option value="Diamond Certificate">Diamond Grading Report (GIA/IGI)</option>
                    <option value="Invoice">Purchase Bill / Tax Invoice</option>
                    <option value="Hallmark Record">BIS Hallmark / HUID Record</option>
                    <option value="Depository Deed">Depository / Vault Deed</option>
                    <option value="Photograph">Asset Photograph</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 700; font-size: 0.80rem;">Linked Physical Asset *</label>
                  <select class="form-control" id="upload-asset-id" required>
                    <option value="">Select Asset...</option>
                  </select>
                </div>
              </div>

              <div style="margin-top: 16px; background: rgba(6, 78, 59, 0.08); border: 1px dashed rgba(6, 78, 59, 0.25); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
                <i data-lucide="lock" style="color: #059669; min-width: 18px;"></i>
                <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.35;">
                  <strong>Client-Side Encryption Pipeline:</strong> Document payload will be encrypted in your browser using <strong>AES-256-GCM</strong> with unique 96-bit IV before network transit.
                </div>
              </div>
            </div>

            <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="DocumentsComponent.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-gold" id="upload-submit-btn">
                <i data-lucide="lock"></i>
                <span>Encrypt & Deposit Document</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Enhanced Document Preview Modal -->
      <div class="modal-backdrop" id="preview-doc-modal">
        <div class="modal-card" style="max-width: 900px; width: 95%;">
          <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <div class="doc-format-icon" id="preview-format-icon">PDF</div>
              <div style="min-width: 0;">
                <h3 class="modal-title" id="preview-doc-title" style="margin: 0; font-size: 1.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Document Preview</h3>
                <div id="preview-doc-subtitle" style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Decrypted in memory</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <a id="preview-doc-newtab-btn" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Open in Full Screen Tab">
                <i data-lucide="external-link"></i>
                <span class="hide-mobile">Full View</span>
              </a>
              <a id="preview-doc-download-btn" href="#" download class="btn btn-primary btn-sm" title="Download Decrypted File">
                <i data-lucide="download"></i>
                <span class="hide-mobile">Download</span>
              </a>
              <button type="button" class="btn btn-secondary btn-sm btn-icon-only" onclick="DocumentsComponent.closePreview()">&times;</button>
            </div>
          </div>

          <div class="modal-body" id="preview-doc-body" style="padding: 16px; min-height: 380px; max-height: 72vh; overflow: auto; display: flex; align-items: center; justify-content: center; background: var(--bg-primary);">
            <div id="preview-doc-loading" style="color: var(--text-muted); text-align: center;">
              <i data-lucide="loader" class="spin" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
              <div>Decrypting document in memory...</div>
            </div>
          </div>

          <div class="modal-footer" style="padding: 10px 20px; font-size: 0.74rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color);">
            <div id="preview-doc-meta-info">Document verified with AssetVault Relational Ledger</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreview()">Close</button>
          </div>
        </div>
      </div>
    `;

    this.setupDropzone();
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

  handleFileSelected(input) {
    const textEl = document.getElementById('dropzone-text');
    const nameEl = document.getElementById('dropzone-file-name');
    if (input.files && input.files[0]) {
      const f = input.files[0];
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      if (textEl) textEl.innerText = "File Selected:";
      if (nameEl) {
        nameEl.innerText = `${f.name} (${sizeMb} MB)`;
        nameEl.style.display = 'block';
      }
    }
  },

  async loadAssetsDropdown() {
    try {
      const summary = await API.getPortfolioSummary().catch(() => ({ assets: [] }));
      const assets = summary.assets || [];
      this.assetsList = assets;

      // Populate filter dropdown
      const filterSelect = document.getElementById('doc-filter-asset');
      if (filterSelect) {
        filterSelect.innerHTML = `<option value="">All Physical Assets (${assets.length})</option>` + assets.map(a => `
          <option value="${a.id}">${a.asset_name} (${a.metal || ''} ${a.purity || ''})</option>
        `).join('');
      }

      // Populate upload dropdown
      const uploadSelect = document.getElementById('upload-asset-id');
      if (uploadSelect) {
        uploadSelect.innerHTML = `<option value="0">General Vault / Portfolio Policy</option>` + assets.map(a => `
          <option value="${a.id}">${a.asset_name} (${a.metal || ''} ${a.purity || ''})</option>
        `).join('');
      }
    } catch (e) {
      console.warn("Could not load assets dropdown", e);
    }
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

  setCategory(cat) {
    this.activeCategory = cat;
    const pills = document.querySelectorAll('#doc-category-pills .doc-pill');
    pills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-category') === cat);
    });
    this.currentPage = 1;
    this.loadDocuments();
  },

  searchTimeout: null,
  handleSearch(e) {
    const val = (e.target.value || '').trim();
    const clearBtn = document.getElementById('doc-search-clear-btn');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadDocuments();
    }, 250);
  },

  clearSearch() {
    const search = document.getElementById('doc-search-input');
    const clearBtn = document.getElementById('doc-search-clear-btn');
    if (search) search.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    this.currentPage = 1;
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
    const search = document.getElementById('doc-search-input');
    const clearBtn = document.getElementById('doc-search-clear-btn');
    const assetSelect = document.getElementById('doc-filter-asset');
    const sortSelect = document.getElementById('doc-sort-select');

    if (search) search.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (assetSelect) assetSelect.value = '';
    if (sortSelect) sortSelect.value = 'date-desc';

    this.activeCategory = '';
    const pills = document.querySelectorAll('#doc-category-pills .doc-pill');
    pills.forEach(p => p.classList.toggle('active', p.getAttribute('data-category') === ''));

    this.currentPage = 1;
    this.loadDocuments();
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadDocuments();
    }
  },

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadDocuments();
    }
  },

  currentDocsList: [],

  async loadDocuments() {
    try {
      const search = (document.getElementById('doc-search-input')?.value || '').trim();
      const assetId = (document.getElementById('doc-filter-asset')?.value || '').trim();

      const res = await API.getDocuments({
        page: this.currentPage,
        limit: this.limit,
        search,
        document_type: this.activeCategory,
        asset_id: assetId
      });

      const docs = res.documents || [];
      this.currentDocsList = docs;
      this.totalCount = res.total || docs.length;
      this.totalPages = res.total_pages || Math.ceil(this.totalCount / this.limit) || 1;

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
            <button class="btn btn-gold btn-sm" onclick="DocumentsComponent.openUploadModal()">
              <i data-lucide="upload-cloud"></i> Upload New Document
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

    // Issuer extraction or formatting
    let cleanTitle = d.file_name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

    return `
      <div class="doc-card" id="doc-card-${d.id}">
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
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.viewDoc(${d.id}, '${safeName}', ${isEncrypted})" title="Preview Document">
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
      <tr>
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

  async viewDoc(id, fileName, isEncrypted) {
    const modal = document.getElementById('preview-doc-modal');
    const titleEl = document.getElementById('preview-doc-title');
    const subEl = document.getElementById('preview-doc-subtitle');
    const bodyEl = document.getElementById('preview-doc-body');
    const dlBtn = document.getElementById('preview-doc-download-btn');
    const newtabBtn = document.getElementById('preview-doc-newtab-btn');
    const formatIcon = document.getElementById('preview-format-icon');
    const metaInfo = document.getElementById('preview-doc-meta-info');

    const ext = (fileName || '').split('.').pop().toUpperCase() || 'PDF';

    if (modal) modal.classList.add('active');
    if (formatIcon) formatIcon.innerText = ext;
    if (titleEl) titleEl.innerText = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    if (subEl) subEl.innerText = `${fileName} • ${isEncrypted ? 'Client-Side Decrypted (AES-256-GCM)' : 'Verified Vault Deposit'}`;
    if (bodyEl) bodyEl.innerHTML = `
      <div style="color: var(--gold-button); text-align: center; padding: 40px;">
        <i data-lucide="loader" class="spin" style="width: 28px; height: 28px; margin: 0 auto 10px;"></i>
        <div style="font-weight: 600;">Accessing document in memory...</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      if (this.activePreviewUrl) {
        URL.revokeObjectURL(this.activePreviewUrl);
        this.activePreviewUrl = null;
      }

      const { blob, url } = await API.fetchDecryptedDocument(id, fileName);
      this.activePreviewUrl = url;

      if (dlBtn) {
        dlBtn.href = url;
        dlBtn.download = fileName;
      }
      if (newtabBtn) {
        newtabBtn.href = url;
      }
      if (metaInfo) {
        metaInfo.innerText = `File: ${fileName} • Size: ${(blob.size / 1024).toFixed(1)} KB • Integrity: Authentic Verified`;
      }

      const lowerExt = ext.toLowerCase();
      if (lowerExt === 'pdf') {
        bodyEl.innerHTML = `<iframe src="${url}" style="width: 100%; height: 70vh; border: none; border-radius: 8px; background: #FFFFFF;" title="${fileName}"></iframe>`;
      } else {
        bodyEl.innerHTML = `<img src="${url}" alt="${fileName}" style="max-width: 100%; max-height: 65vh; border-radius: 8px; box-shadow: var(--shadow-md); object-fit: contain;" />`;
      }
    } catch (err) {
      console.error("Failed to preview document", err);
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="color: var(--loss-red); text-align: center; padding: 30px;">
            <i data-lucide="alert-circle" style="width: 28px; height: 28px; margin: 0 auto 8px;"></i>
            <div style="font-weight: 700;">Could not display document preview</div>
            <div style="font-size: 0.80rem; margin-top: 4px; color: var(--text-muted);">${err.message || 'Key mismatch or format error'}</div>
          </div>
        `;
      }
      if (window.lucide) lucide.createIcons();
    }
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

  closePreview() {
    const modal = document.getElementById('preview-doc-modal');
    if (modal) modal.classList.remove('active');
    if (this.activePreviewUrl) {
      URL.revokeObjectURL(this.activePreviewUrl);
      this.activePreviewUrl = null;
    }
  },

  async deleteDoc(id) {
    if (!confirm('Are you sure you want to delete this document from the vault? This action is permanent.')) return;
    try {
      await API.deleteDocument(id);
      App.showToast('Document removed from vault register', 'success');
      this.allDocumentsCache = []; // invalidate cache
      await this.loadDocuments();
    } catch (e) {
      App.showToast('Failed to delete document', 'error');
    }
  },

  async openUploadModal() {
    await this.loadAssetsDropdown();
    const modal = document.getElementById('upload-doc-modal');
    if (modal) modal.classList.add('active');
    if (window.lucide) lucide.createIcons();
  },

  closeModal() {
    const modal = document.getElementById('upload-doc-modal');
    if (modal) modal.classList.remove('active');
    const textEl = document.getElementById('dropzone-text');
    const nameEl = document.getElementById('dropzone-file-name');
    const fileInput = document.getElementById('upload-file-input');
    if (textEl) textEl.innerText = "Choose a file or drag & drop here";
    if (nameEl) nameEl.style.display = 'none';
    if (fileInput) fileInput.value = '';
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

      await API.uploadDocumentEncrypted(file, assetId, docType);
      App.showToast('Document encrypted client-side and saved securely!', 'success');
      this.closeModal();
      this.allDocumentsCache = []; // Invalidate cache so counts update
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
  }
};
