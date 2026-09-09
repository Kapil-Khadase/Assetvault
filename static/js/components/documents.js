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
                  <th>Associated Asset</th>
                  <th>Upload Date</th>
                  <th>File Size</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="documents-tbody">
                <tr><td colspan="6" style="text-align: center; padding: 24px;">Loading document repository...</td></tr>
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
                <label class="form-label">Choose File (PDF, PNG, JPG) *</label>
                <input type="file" class="form-control" id="upload-file-input" required accept=".pdf,.png,.jpg,.jpeg" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="DocumentsComponent.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i data-lucide="upload"></i> Upload to Vault</button>
            </div>
          </form>
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">No documents or certificates uploaded yet. Click 'Upload Document' to add proof files.</td></tr>`;
        return;
      }

      tbody.innerHTML = docs.map(d => {
        const sizeKb = (d.file_size / 1024).toFixed(1);
        return `
          <tr>
            <td>
              <span class="ticker-item" style="font-size: 0.75rem; color: var(--gold-light);">
                <i data-lucide="file-text" style="width: 12px;"></i> ${d.document_type}
              </span>
            </td>
            <td style="font-weight: 600;">${d.file_name}</td>
            <td>
              <div style="font-weight: 600;">${d.asset_name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${d.metal} ${d.purity || ''}</div>
            </td>
            <td>${d.uploaded_at.split(' ')[0]}</td>
            <td>${sizeKb} KB</td>
            <td style="text-align: right;">
              <span class="btn btn-secondary btn-sm" style="cursor: default; font-size: 0.75rem;">
                <i data-lucide="shield-check" style="width: 14px; color: var(--emerald-gain);"></i> Stored
              </span>
            </td>
          </tr>
        `;
      }).join('');

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      console.error("Failed to load documents", e);
    }
  },

  async openUploadModal() {
    try {
      const summary = await API.getPortfolioSummary();
      const select = document.getElementById('upload-asset-id');
      select.innerHTML = `<option value="">Select Asset...</option>` + summary.assets.map(a => `
        <option value="${a.id}">${a.asset_name} (${a.metal} ${a.purity || ''})</option>
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
      App.showToast('Document securely uploaded to vault!', 'success');
      this.closeModal();
      await this.loadDocuments();
    } catch (err) {
      App.showToast('Upload failed', 'error');
    }
  }
};
