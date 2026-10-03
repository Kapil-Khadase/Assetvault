// Documents & Media Management Component with Client-Side AES-256-GCM Encryption
const DocumentsComponent = {
  assetsList: [],
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  activePreviewUrl: null,

  async render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="documents-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <i data-lucide="shield-check" style="color: var(--gold-light);"></i>
              Digital Document & Certificate Vault
            </h2>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Client-side AES-256-GCM encrypted repository for purchase invoices, GIA/IGI certificates, and hallmark records.</p>
          </div>
          <button class="btn btn-primary" onclick="DocumentsComponent.openUploadModal()">
            <i data-lucide="upload-cloud"></i> Upload Document
          </button>
        </div>

        <!-- Encryption Password Loss Warning Banner (Zero Backdoor Disclosure) -->
        <div class="glass-card" style="margin-bottom: 20px; border-left: 4px solid var(--gold-primary); background: rgba(212, 175, 55, 0.08); padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px;">
          <i data-lucide="alert-triangle" style="color: var(--gold-light); min-width: 20px; margin-top: 2px;"></i>
          <div style="font-size: 0.85rem; line-height: 1.45; color: var(--text-secondary);">
            <strong style="color: var(--text-primary);">Client-Side Encrypted Cryptographic Notice:</strong>
            AssetVault uses a client-side encrypted vault architecture. If you lose your password, encrypted documents cannot be recovered by AssetVault or server administrators. No master key or backdoor exists.
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="glass-card" style="margin-bottom: 20px; padding: 16px;">
          <div class="doc-filters-grid" style="display: grid; gap: 14px; align-items: center;">
            <div style="position: relative;">
              <input type="text" id="doc-search-input" class="form-control" placeholder="Search documents by file or asset name..." oninput="DocumentsComponent.handleSearch(event)" />
            </div>
            <div>
              <select id="doc-filter-type" class="form-control" onchange="DocumentsComponent.handleFilterChange()">
                <option value="">All Document Types</option>
                <option value="Certificate">Assay / Authenticity Certificate</option>
                <option value="Diamond Certificate">Diamond Certificate (GIA/IGI)</option>
                <option value="Invoice">Tax Invoice / Bill</option>
                <option value="Hallmark Record">BIS Hallmark / HUID Record</option>
                <option value="Photograph">Asset Photograph</option>
              </select>
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.resetFilters()">
                <i data-lucide="rotate-ccw"></i> Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Document Grid List -->
        <div class="glass-card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Security</th>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Associated Asset</th>
                  <th>Upload Date</th>
                  <th>File Size</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="documents-tbody">
                <tr><td colspan="7" style="text-align: center; padding: 24px;">Loading document repository...</td></tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination Bar -->
          <div id="doc-pagination-container" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid var(--border-light); font-size: 0.85rem;">
            <span id="doc-pagination-info" style="color: var(--text-muted);">Page 1 of 1</span>
            <div style="display: flex; gap: 8px;">
              <button id="doc-prev-btn" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.prevPage()" disabled>Previous</button>
              <button id="doc-next-btn" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.nextPage()" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Document Upload Modal -->
      <div class="modal-backdrop" id="upload-doc-modal">
        <div class="modal-card" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">Client-Side Encrypt & Upload Document</h3>
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closeModal()">&times;</button>
          </div>
          <form onsubmit="DocumentsComponent.handleUpload(event)">
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label">Associated Physical Asset *</label>
                <select class="form-control" id="upload-asset-id" required>
                  <option value="">Select Asset...</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label">Document Type *</label>
                <select class="form-control" id="upload-doc-type" required>
                  <option value="Certificate">Assay / Authenticity Certificate</option>
                  <option value="Diamond Certificate">Diamond Grading Report (GIA / IGI)</option>
                  <option value="Invoice">Purchase Bill / Tax Invoice</option>
                  <option value="Hallmark Record">BIS Hallmark / HUID Record</option>
                  <option value="Photograph">Asset Photograph</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label">Choose File (PDF, PNG, JPG, JPEG, WEBP) *</label>
                <input type="file" class="form-control" id="upload-file-input" required accept=".pdf,.png,.jpg,.jpeg,.webp" />
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px dashed var(--border-light); border-radius: 8px; padding: 12px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                <i data-lucide="lock" style="color: var(--gold-light); width: 16px;"></i>
                <span>File is encrypted locally using <strong>AES-256-GCM</strong> with a unique IV before transit. Only ciphertext is sent to the depository.</span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="DocumentsComponent.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="upload-submit-btn">
                <i data-lucide="lock"></i> Encrypt & Upload
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Document Preview Modal -->
      <div class="modal-backdrop" id="preview-doc-modal">
        <div class="modal-card" style="max-width: 850px; width: 95%;">
          <div class="modal-header">
            <h3 class="modal-title" id="preview-doc-title">Document Preview</h3>
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreview()">&times;</button>
          </div>
          <div class="modal-body" id="preview-doc-body" style="text-align: center; min-height: 300px; max-height: 75vh; overflow: auto; display: flex; align-items: center; justify-content: center;">
            <div id="preview-doc-loading" style="color: var(--text-muted);">Decrypting document in memory...</div>
          </div>
          <div class="modal-footer">
            <a id="preview-doc-download-btn" href="#" download class="btn btn-primary btn-sm">
              <i data-lucide="download"></i> Download Decrypted File
            </a>
            <button type="button" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreview()">Close</button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadDocuments();
  },

  searchTimeout: null,
  handleSearch(e) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadDocuments();
    }, 300);
  },

  handleFilterChange() {
    this.currentPage = 1;
    this.loadDocuments();
  },

  resetFilters() {
    const search = document.getElementById('doc-search-input');
    const filter = document.getElementById('doc-filter-type');
    if (search) search.value = '';
    if (filter) filter.value = '';
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

  async loadDocuments() {
    try {
      const search = (document.getElementById('doc-search-input')?.value || '').trim();
      const docType = (document.getElementById('doc-filter-type')?.value || '').trim();

      const res = await API.getDocuments({
        page: this.currentPage,
        limit: this.limit,
        search,
        document_type: docType
      });

      const docs = res.documents || [];
      const total = res.total || docs.length;
      this.totalPages = res.total_pages || Math.ceil(total / this.limit) || 1;

      const pageInfo = document.getElementById('doc-pagination-info');
      if (pageInfo) pageInfo.innerText = `Showing ${docs.length} of ${total} documents (Page ${this.currentPage} of ${this.totalPages})`;

      const prevBtn = document.getElementById('doc-prev-btn');
      const nextBtn = document.getElementById('doc-next-btn');
      if (prevBtn) prevBtn.disabled = (this.currentPage <= 1);
      if (nextBtn) nextBtn.disabled = (this.currentPage >= this.totalPages);

      const tbody = document.getElementById('documents-tbody');
      if (!tbody) return;

      if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">No documents match your criteria. Click 'Upload Document' to add proof files.</td></tr>`;
        return;
      }

      tbody.innerHTML = docs.map(d => {
        const sizeKb = (d.file_size / 1024).toFixed(1);
        const safeName = (d.file_name || 'document').replace(/'/g, "\\'");
        const isEncrypted = Boolean(d.is_encrypted);

        return `
          <tr>
            <td>
              <span class="badge ${isEncrypted ? 'badge-active' : 'badge-warning'}" style="font-size: 0.72rem; padding: 3px 8px;">
                <i data-lucide="${isEncrypted ? 'lock' : 'unlock'}" style="width: 11px;"></i>
                ${isEncrypted ? 'AES-GCM' : 'Standard'}
              </span>
            </td>
            <td>
              <span class="ticker-item" style="font-size: 0.75rem; color: var(--gold-light);">
                <i data-lucide="file-text" style="width: 12px;"></i> ${d.document_type}
              </span>
            </td>
            <td style="font-weight: 600;">${d.file_name}</td>
            <td>
              <div style="font-weight: 600;">${d.asset_name || 'General Portfolio'}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${d.metal ? `${d.metal} ${d.purity || ''}` : ''}</div>
            </td>
            <td>${(d.uploaded_at || '').split(' ')[0]}</td>
            <td>${sizeKb} KB</td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" title="View Document" onclick="DocumentsComponent.viewDoc(${d.id}, '${safeName}', ${isEncrypted})">
                  <i data-lucide="eye" style="width: 14px;"></i>
                </button>
                <button class="btn btn-secondary btn-sm" title="Download Document" onclick="DocumentsComponent.downloadDoc(${d.id}, '${safeName}', ${isEncrypted})">
                  <i data-lucide="download" style="width: 14px;"></i>
                </button>
                <button class="btn btn-secondary btn-sm" style="color: var(--loss-red);" title="Delete Document" onclick="DocumentsComponent.deleteDoc(${d.id})">
                  <i data-lucide="trash-2" style="width: 14px;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error("Failed to load documents", e);
    }
  },

  async viewDoc(id, fileName, isEncrypted) {
    const modal = document.getElementById('preview-doc-modal');
    const titleEl = document.getElementById('preview-doc-title');
    const bodyEl = document.getElementById('preview-doc-body');
    const dlBtn = document.getElementById('preview-doc-download-btn');

    if (modal) modal.classList.add('active');
    if (titleEl) titleEl.innerText = `${fileName} ${isEncrypted ? '(Client-Side Decrypted)' : ''}`;
    if (bodyEl) bodyEl.innerHTML = `<div style="color: var(--gold-light);"><i data-lucide="loader" class="spin"></i> Decrypting ciphertext locally in browser RAM...</div>`;
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

      const ext = (fileName || '').split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        bodyEl.innerHTML = `<iframe src="${url}" style="width: 100%; height: 65vh; border: none; border-radius: 8px;"></iframe>`;
      } else {
        bodyEl.innerHTML = `<img src="${url}" alt="${fileName}" style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);" />`;
      }
    } catch (err) {
      console.error("Failed to preview document", err);
      if (bodyEl) {
        bodyEl.innerHTML = `<div style="color: var(--loss-red);"><i data-lucide="alert-circle"></i> Decryption failed: ${err.message || 'Key mismatch or corrupted payload.'}</div>`;
      }
      if (window.lucide) lucide.createIcons();
    }
  },

  async downloadDoc(id, fileName, isEncrypted) {
    try {
      App.showToast('Preparing document download...', 'info');
      const { url } = await API.fetchDecryptedDocument(id, fileName);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      App.showToast('Document downloaded successfully', 'success');
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
    if (!confirm('Are you sure you want to delete this document from the vault? This action is permanent and cannot be undone.')) return;
    try {
      await API.deleteDocument(id);
      App.showToast('Document deleted permanently from vault', 'success');
      await this.loadDocuments();
    } catch (e) {
      App.showToast('Failed to delete document', 'error');
    }
  },

  async openUploadModal() {
    try {
      const summary = await API.getPortfolioSummary();
      const select = document.getElementById('upload-asset-id');
      select.innerHTML = `<option value="">Select Asset...</option>` + (summary.assets || []).map(a => `
        <option value="${a.id}">${a.asset_name} (${a.metal || ''} ${a.purity || ''})</option>
      `).join('');
      document.getElementById('upload-doc-modal').classList.add('active');
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      App.showToast('Could not load assets list', 'error');
    }
  },

  closeModal() {
    document.getElementById('upload-doc-modal').classList.remove('active');
  },

  async handleUpload(e) {
    e.preventDefault();
    const assetId = document.getElementById('upload-asset-id').value;
    const docType = document.getElementById('upload-doc-type').value;
    const fileInput = document.getElementById('upload-file-input');
    const submitBtn = document.getElementById('upload-submit-btn');

    if (!fileInput.files || fileInput.files.length === 0) {
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
      await this.loadDocuments();
    } catch (err) {
      App.showToast(err.message || 'Upload failed', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="lock"></i> Encrypt & Upload`;
      }
      if (window.lucide) lucide.createIcons();
    }
  }
};
