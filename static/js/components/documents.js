// Documents & Media Management Component
const DocumentsComponent = {
  assetsList: [],

  async render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="documents-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800;">Digital Document & Certificate Vault</h2>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Secure digital repository for purchase invoices, GIA/IGI diamond certificates, and hallmark records.</p>
          </div>
          <button class="btn btn-primary" onclick="DocumentsComponent.openUploadModal()">
            <i data-lucide="upload-cloud"></i> Upload Document
          </button>
        </div>

        <!-- Document Grid List -->
        <div class="glass-card" style="padding: 0; overflow: hidden;">
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File Name</th>
                  <th>Asset Name</th>
                  <th>Owner / Holder</th>
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
        </div>
      </div>

      <!-- Document Upload Modal -->
      <div class="modal-backdrop" id="upload-doc-modal">
        <div class="modal-card" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title">Upload Asset Certificate / Invoice</h3>
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
                <label class="form-label">Document Type</label>
                <select class="form-control" id="upload-doc-type">
                  <option value="Certificate">Assay / Authenticity Certificate</option>
                  <option value="Diamond Certificate">Diamond Grading Report (GIA / IGI)</option>
                  <option value="Invoice">Purchase Bill / Tax Invoice</option>
                  <option value="Hallmark Record">BIS Hallmark / HUID Record</option>
                  <option value="Photograph">Asset Photograph</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Choose File (PDF, PNG, JPG, WEBP) *</label>
                <input type="file" class="form-control" id="upload-file-input" required accept=".pdf,.png,.jpg,.jpeg,.webp" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="DocumentsComponent.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="upload"></i> Upload to Vault</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Document Preview Modal -->
      <div class="modal-backdrop" id="preview-doc-modal">
        <div class="modal-card" style="max-width: 800px;">
          <div class="modal-header">
            <h3 class="modal-title" id="preview-doc-title">Document Preview</h3>
            <button class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreview()">&times;</button>
          </div>
          <div class="modal-body" id="preview-doc-body" style="text-align: center; max-height: 70vh; overflow: auto;">
          </div>
          <div class="modal-footer">
            <a id="preview-doc-download-btn" href="#" target="_blank" download class="btn btn-primary btn-sm">
              <i data-lucide="download"></i> Download File
            </a>
            <button type="button" class="btn btn-secondary btn-sm" onclick="DocumentsComponent.closePreview()">Close</button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadDocuments();
  },

  async loadDocuments() {
    try {
      const res = await API.getDocuments();
      const docs = res.documents || [];
      const tbody = document.getElementById('documents-tbody');

      if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">No documents or certificates uploaded yet. Click 'Upload Document' to add proof files.</td></tr>`;
        return;
      }

      tbody.innerHTML = docs.map(d => {
        const sizeKb = (d.file_size / 1024).toFixed(1);
        const safeName = (d.file_name || 'document').replace(/'/g, "\\'");
        return `
          <tr>
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
            <td>
              <span class="owner-pill">
                <i data-lucide="user"></i>
                ${d.owner_name || 'Self'}
              </span>
            </td>
            <td>${(d.uploaded_at || '').split(' ')[0]}</td>
            <td>${sizeKb} KB</td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" title="View Document" onclick="DocumentsComponent.viewDoc(${d.id}, '${safeName}')">
                  <i data-lucide="eye" style="width: 14px;"></i>
                </button>
                <a href="${API.getDocumentDownloadUrl(d.id)}" class="btn btn-secondary btn-sm" title="Download Document" target="_blank" download>
                  <i data-lucide="download" style="width: 14px;"></i>
                </a>
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

  viewDoc(id, fileName) {
    const viewUrl = API.getDocumentViewUrl(id);
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      window.open(viewUrl, '_blank');
    } else {
      const titleEl = document.getElementById('preview-doc-title');
      const bodyEl = document.getElementById('preview-doc-body');
      const dlBtn = document.getElementById('preview-doc-download-btn');
      if (titleEl) titleEl.innerText = fileName;
      if (bodyEl) {
        bodyEl.innerHTML = `<img src="${viewUrl}" alt="${fileName}" style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);" />`;
      }
      if (dlBtn) {
        dlBtn.href = API.getDocumentDownloadUrl(id);
      }
      const modal = document.getElementById('preview-doc-modal');
      if (modal) modal.classList.add('active');
      if (window.lucide) lucide.createIcons();
    }
  },

  closePreview() {
    const modal = document.getElementById('preview-doc-modal');
    if (modal) modal.classList.remove('active');
  },

  async deleteDoc(id) {
    if (!confirm('Are you sure you want to delete this document from the vault?')) return;
    try {
      await API.deleteDocument(id);
      App.showToast('Document deleted successfully', 'success');
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

    if (!fileInput.files || fileInput.files.length === 0) {
      App.showToast('Please select a file to upload', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('asset_id', assetId);
    formData.append('document_type', docType);
    formData.append('file', fileInput.files[0]);

    try {
      await API.uploadDocument(formData);
      App.showToast('Document securely uploaded and verified!', 'success');
      this.closeModal();
      await this.loadDocuments();
    } catch (err) {
      App.showToast(err.message || 'Upload failed', 'error');
    }
  }
};
