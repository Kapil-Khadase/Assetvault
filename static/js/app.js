// WCAG AA Compliant Modal Focus Trapping and Escape-to-Close
const ModalA11y = {
  activeModal: null,
  previousActiveElement: null,

  init() {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes) {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.classList?.contains('modal-overlay') || node.classList?.contains('modal-backdrop'))) {
              this.trap(node);
            }
          });
        }
        if (m.removedNodes) {
          m.removedNodes.forEach(node => {
            if (node === this.activeModal) {
              this.release();
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('keydown', (e) => {
      if (!this.activeModal) return;

      if (e.key === 'Escape') {
        const closeBtn = this.activeModal.querySelector('.modal-close-btn, .btn-secondary, [onclick*="remove()"], [onclick*="closeModal"]');
        if (closeBtn) closeBtn.click();
        else this.activeModal.remove();
        this.release();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(this.activeModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    });
  },

  trap(modalEl) {
    this.previousActiveElement = document.activeElement;
    this.activeModal = modalEl;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    setTimeout(() => {
      const focusables = modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);
  },

  release() {
    this.activeModal = null;
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      try { this.previousActiveElement.focus(); } catch (e) {}
      this.previousActiveElement = null;
    }
  }
};

// AssetVault Main Single Page App Orchestrator - Exact Reference Design
const App = {
  currentRoute: 'auth',

  fallbackIcons: {
    'plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    'plus-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
    'x': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    'trending-up': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    'trending-down': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>',
    'download': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    'upload': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
    'gem': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>',
    'pie-chart': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
    'activity': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    'target': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    'coins': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>',
    'sparkles': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    'scale': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
    'shield': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'shield-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    'shield-alert': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    'search': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    'user': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    'user-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
    'user-plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>',
    'mail': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    'lock': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    'eye': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    'eye-off': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
    'refresh-cw': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
    'alert-triangle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    'camera': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    'check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    'check-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'award': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    'zap': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'inbox': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    'wallet': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
    'layers': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5"/></svg>',
    'calendar': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    'clock': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'file-spreadsheet': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>',
    'file-text': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    'arrow-right': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    'arrow-down-up': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>',
    'more-horizontal': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    'rotate-ccw': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    'package-open': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-9"/><path d="M12 13 3.5 8.5"/><path d="M12 13l8.5-4.5"/><path d="M21 16.5V7.5L12 2 3 7.5v9l9 5.5Z"/></svg>',
    'indian-rupee': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>',
    'alert-octagon': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    'anchor': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" x2="12" y1="22" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
    'archive': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>',
    'arrow-up-down': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>',
    'badge-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>',
    'badge-dollar-sign': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>',
    'bell': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    'bell-plus': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.3 14.8C20.1 16.4 21 17 21 17H3s3-2 3-9a6 6 0 0 1 10.6-3.8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="15" x2="21" y1="8" y2="8"/><line x1="18" x2="18" y1="5" y2="11"/></svg>',
    'calculator': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
    'chevron-left': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    'chevron-right': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    'copy': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    'cpu': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>',
    'database': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
    'edit-3': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    'external-link': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    'file-check': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>',
    'file-question': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    'folder': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    'folder-open': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>',
    'globe': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    'hard-drive': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12.01" y1="18" y2="18"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 14V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/></svg>',
    'key': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>',
    'key-round': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    'layout-grid': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    'loader': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>',
    'loader-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    'log-in': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
    'log-out': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
    'package': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    'printer': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>',
    'qr-code': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>',
    'receipt': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>',
    'save': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
    'sliders': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>',
    'smartphone': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    'table': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
    'tag': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
    'trash-2': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    'unlock': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    'upload-cloud': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>',
    'wifi': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>'
  },

  renderIcons(root = document) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try {
        window.lucide.createIcons();
      } catch (e) {
        console.warn('Lucide icon error:', e);
      }
    }
    const container = root || document;
    const remaining = container.querySelectorAll('i[data-lucide]:not([data-rendered])');
    remaining.forEach(el => {
      const name = el.getAttribute('data-lucide');
      if (this.fallbackIcons[name]) {
        el.setAttribute('data-rendered', 'true');
        el.innerHTML = this.fallbackIcons[name];
        el.classList.add('lucide', `lucide-${name}`);
      }
    });
  },

  async init() {
    // Install universal icon adapter
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      const orig = window.lucide.createIcons.bind(window.lucide);
      window.lucide.createIcons = (opts) => {
        try { orig(opts); } catch (e) {}
        this.renderIcons(opts?.root);
      };
    } else {
      window.lucide = {
        createIcons: (opts) => this.renderIcons(opts?.root)
      };
    }

    ModalA11y.init();
    this.setupTheme();
    this.setupNavigation();
    this.setupSidebar();

    // Check hash for public verification route
    const checkHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#verify/') || hash.startsWith('#/verify/')) {
        const token = hash.replace(/^#\/?verify\//, '').trim();
        if (token) {
          this.renderPublicVerification(token);
          return true;
        }
      }
      return false;
    };

    window.addEventListener('hashchange', () => {
      checkHash();
    });

    if (checkHash()) {
      return;
    }

    // If user already has a valid token, navigate to Dashboard, else Auth
    if (API.getToken()) {
      this.updateUserDisplay();
      this.updateSidebarLiveRates();
      this.updateSyncTimestamp();
      this.navigate('dashboard');
    } else {
      if (typeof VaultCrypto !== 'undefined') {
        VaultCrypto.clearKey();
      }
      this.updateUserDisplay();
      this.navigate('auth');
    }

    this.renderIcons();

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMobileSidebar();
      }
      if (typeof ChartManager !== 'undefined' && ChartManager.instances) {
        Object.values(ChartManager.instances).forEach(chart => {
          try { chart.resize(); } catch (e) {}
        });
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        let resizeTimer = null;
        const ro = new ResizeObserver(() => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (typeof ChartManager !== 'undefined' && ChartManager.instances) {
              Object.values(ChartManager.instances).forEach(chart => {
                try { chart.resize(); } catch (e) {}
              });
            }
          }, 60);
        });
        ro.observe(mainContent);
      }
    }

    // Periodically update live ticker (every 30s) when signed in
    setInterval(() => {
      if (this.currentRoute !== 'auth' && this.currentRoute !== 'verify' && API.getToken()) {
        this.updateSidebarLiveRates();
        this.updateSyncTimestamp();
      }
    }, 30000);
  },

  setupTheme() {
    // Default to 'light' as shown in the primary reference screenshots, or restore user preference
    const savedTheme = localStorage.getItem('assetvault_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('assetvault_theme', next);
    this.updateThemeIcon(next);

    // Re-render current route to update Chart.js canvas themes
    this.navigate(this.currentRoute);
  },

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      if (theme === 'dark') {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
      } else {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      }
    }
  },

  setupSidebar() {
    if (window.innerWidth > 768 && localStorage.getItem('assetvault_sidebar_collapsed') === 'true') {
      const sidebar = document.getElementById('sidebar');
      const layout = document.querySelector('.app-layout');
      if (sidebar) sidebar.classList.add('collapsed');
      if (layout) layout.classList.add('sidebar-collapsed');
      this.updateToggleTooltips(true);
    }
  },

  handleLogoClick() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
      this.toggleSidebar();
    } else {
      this.navigate('dashboard');
    }
  },

  updateToggleTooltips(isCollapsed) {
    const topbarBtn = document.getElementById('btn-toggle-sidebar');
    const railBtn = document.querySelector('.sidebar-rail-toggle');
    const text = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
    if (topbarBtn) topbarBtn.setAttribute('title', text);
    if (railBtn) railBtn.setAttribute('title', text);
  },

  toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.getElementById('sidebar');
    const layout = document.querySelector('.app-layout');
    if (!sidebar) return;

    if (isMobile) {
      const willOpen = !sidebar.classList.contains('open');
      sidebar.classList.toggle('open', willOpen);

      let backdrop = document.getElementById('sidebar-backdrop');
      if (willOpen) {
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.id = 'sidebar-backdrop';
          backdrop.className = 'sidebar-backdrop';
          backdrop.onclick = () => App.closeMobileSidebar();
          document.body.appendChild(backdrop);
        }
        requestAnimationFrame(() => {
          if (backdrop) backdrop.classList.add('visible');
        });
      } else if (backdrop) {
        backdrop.classList.remove('visible');
      }
    } else {
      // Desktop: collapse/expand sidebar
      const isCollapsed = sidebar.classList.toggle('collapsed');
      if (layout) layout.classList.toggle('sidebar-collapsed', isCollapsed);
      localStorage.setItem('assetvault_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      this.updateToggleTooltips(isCollapsed);

      // Smoothly resize all active charts during and after sidebar animation
      const resizeAllCharts = () => {
        window.dispatchEvent(new Event('resize'));
        if (typeof ChartManager !== 'undefined' && ChartManager.instances) {
          Object.values(ChartManager.instances).forEach(chart => {
            try { chart.resize(); } catch (e) {}
          });
        }
      };
      resizeAllCharts();
      setTimeout(resizeAllCharts, 120);
      setTimeout(resizeAllCharts, 280);
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  },

  setupNavigation() {
    document.querySelectorAll('.nav-link, .bottom-nav-item[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-view');
        if (target) {
          this.navigate(target);
          this.closeMobileSidebar();
        }
      });
    });
  },

  navigate(route) {
    // Require authentication for all protected views
    if (route !== 'auth' && !API.getToken()) {
      route = 'auth';
    }

    this.currentRoute = route;

    // Toggle full-screen auth mode styling vs main application layout
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      if (route === 'auth') {
        appLayout.classList.add('auth-mode');
      } else {
        appLayout.classList.remove('auth-mode');
      }
    }

    // Update active nav styling in sidebar and mobile bottom nav
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(l => {
      if (l.getAttribute('data-view') === route) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    // Update topbar breadcrumb
    const breadcrumb = document.getElementById('topbar-breadcrumb');
    if (breadcrumb) {
      const titles = {
        dashboard: 'Portfolio Dashboard',
        assets: 'Asset Management & Holdings',
        valuation: 'Market Rates & Spot Valuations',
        transactions: 'Transactions & Trade Ledger',
        analytics: 'Analytics & Macro Simulator',
        simulator: 'Macroeconomic Shock Simulator',
        documents: 'Vault Documents & Appraisals',
        reports: 'Valuation Reports & Exports',
        alerts: 'Price & Milestone Alerts',
        profile: 'User Profile & Wealth Milestones',
        settings: 'Security Hardening & Vault Settings',
        auth: 'Security & Authentication Portal'
      };
      breadcrumb.innerText = titles[route] || 'Portfolio Dashboard';
    }

    // Render corresponding component
    switch (route) {
      case 'auth':
        AuthComponent.render();
        break;
      case 'dashboard':
        DashboardComponent.render();
        break;
      case 'assets':
        AssetsComponent.render();
        break;
      case 'valuation':
        ValuationComponent.render();
        break;
      case 'transactions':
        TransactionsComponent.render();
        break;
      case 'analytics':
      case 'simulator':
        AnalyticsComponent.render();
        break;
      case 'documents':
        DocumentsComponent.render();
        break;
      case 'reports':
        ReportsComponent.render();
        break;
      case 'alerts':
        AlertsComponent.render();
        break;
      case 'profile':
        ProfileComponent.render();
        break;
      case 'settings':
        SettingsComponent.render();
        break;
      default:
        DashboardComponent.render();
    }

    if (route !== 'auth') {
      this.updateSidebarVaultCard();
    }

    setTimeout(() => {
      this.renderIcons();
    }, 40);
  },

  async updateSidebarLiveRates() {
    // Kept for backward compatibility across components; updates vault widget and sync status
    await this.updateSidebarVaultCard();
    this.updateSyncTimestamp();
  },

  async updateSidebarVaultCard() {
    try {
      const token = API.getToken();
      if (!token) return;

      const [summaryRes, profileRes] = await Promise.all([
        API.getPortfolioSummary().catch(() => null),
        API.getProfile().catch(() => null)
      ]);

      const user = profileRes?.user;
      const targetVal = Number(user?.target_portfolio_value) || 1000000;
      const currentVal = Number(summaryRes?.total_current_market_value ?? summaryRes?.summary?.total_current_value) || 0;
      const curr = user?.currency || API.getCurrency() || 'INR';

      const pct = Math.min(100, Math.max(0, Number(((currentVal / targetVal) * 100).toFixed(1))));

      const barEl = document.getElementById('sidebar-milestone-bar');
      const pctEl = document.getElementById('sidebar-milestone-pct');
      const currEl = document.getElementById('sidebar-milestone-current');
      const targetEl = document.getElementById('sidebar-milestone-target');

      if (barEl) barEl.style.width = `${pct}%`;
      if (pctEl) {
        pctEl.innerText = `${pct}%`;
        pctEl.style.color = pct >= 100 ? 'var(--gain-green)' : 'var(--gold-accent)';
      }
      if (currEl) currEl.innerText = API.formatCurrency(currentVal, curr);
      if (targetEl) targetEl.innerText = `Goal: ${API.formatCurrency(targetVal, curr)}`;
    } catch (e) {
      console.warn('Sidebar vault widget update error:', e);
    }
  },

  updateSyncTimestamp() {
    const el = document.getElementById('sync-timestamp-text');
    if (!el) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    el.innerText = `Synced ${formatted}`;
  },

  loadUserInfo() {
    return this.updateUserDisplay();
  },

  async updateUserDisplay() {
    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');
    const avatarEl = document.getElementById('user-avatar-initials');

    const token = API.getToken();
    if (!token) {
      if (nameEl) nameEl.innerText = 'Not Signed In';
      if (emailEl) emailEl.innerText = 'Please sign in';
      if (avatarEl) avatarEl.innerText = '--';
      return;
    }

    try {
      const res = await API.getProfile();
      const u = res.user;
      if (u) {
        if (nameEl) nameEl.innerText = u.name;
        if (emailEl) emailEl.innerText = u.email;
        const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        if (avatarEl) avatarEl.innerText = initials || 'AV';
      } else {
        if (nameEl) nameEl.innerText = 'Not Signed In';
        if (emailEl) emailEl.innerText = 'Please sign in';
        if (avatarEl) avatarEl.innerText = '--';
      }
    } catch (e) {
      if (nameEl) nameEl.innerText = 'Not Signed In';
      if (emailEl) emailEl.innerText = 'Please sign in';
      if (avatarEl) avatarEl.innerText = '--';
    }
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
      <i data-lucide="${icon}" style="color: ${type === 'success' ? 'var(--gain-green)' : 'var(--loss-red)'}; width: 18px;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  async renderPublicVerification(token) {
    this.currentRoute = 'verify';
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) appLayout.classList.add('auth-mode');

    const container = document.getElementById('view-container');
    if (!container) return;

    container.innerHTML = `
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
        <div class="card" style="max-width: 640px; width: 100%; padding: 36px; border-radius: 16px; box-shadow: var(--shadow-modal);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--gain-green-bg); color: var(--gain-green); margin-bottom: 12px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-primary); margin-bottom: 6px;">Authentic Physical Asset Certificate</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Cryptographically verified depository provenance record</p>
          </div>
          <div id="verify-cert-content" style="text-align: center; padding: 20px; color: var(--text-muted);">
            Verifying certificate token with the vault registry...
          </div>
        </div>
      </div>
    `;

    try {
      const data = await API.getCertificateDetails(token);
      const cert = data.certificate;
      const contentEl = document.getElementById('verify-cert-content');
      if (!contentEl) return;

      const verifiedDate = cert.verified_at ? new Date(cert.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Official Record';

      contentEl.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; text-align: left;">
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--gain-green); letter-spacing: 0.05em;">Registry Status: Verified</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">Asset ID: <strong>AV-${String(cert.asset_id || 1).padStart(4, '0')}</strong> &bull; Verified: ${verifiedDate}</div>
          </div>
          <span style="background: var(--gain-green); color: #fff; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px;">GENUINE</span>
        </div>

        <div style="text-align: left; margin-bottom: 20px;">
          <h3 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--text-primary); margin-bottom: 4px;">${cert.asset_name || 'Precious Asset'}</h3>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${cert.metal || ''} &bull; ${cert.category || 'Bullion'} &bull; ${cert.purity || 'Fine'}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: left; margin-bottom: 20px;">
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Gross Weight</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${cert.gross_weight_g || cert.weight_g || 0} g</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Fine Metal Content</div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--gold-accent); margin-top: 2px;">${cert.fine_weight_g || cert.weight_g || 0} g</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Hallmark / HUID</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${cert.huid || 'BIS Certified'}</div>
          </div>
          <div style="background: var(--bg-hover); padding: 12px 14px; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Registered Owner</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-top: 2px;">${cert.masked_owner || 'Verified Custodian'}</div>
          </div>
        </div>

        ${cert.diamond_specs ? `
          <div style="background: var(--bg-hover); padding: 14px; border-radius: 8px; text-align: left; margin-bottom: 20px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Diamond Specifications</div>
            <div style="font-size: 0.88rem; color: var(--text-primary);">
              <strong>${cert.diamond_specs.carat || 0} Carats</strong> &bull; Cut: ${cert.diamond_specs.cut || 'Excellent'} &bull; Color: ${cert.diamond_specs.color || 'D-F'} &bull; Clarity: ${cert.diamond_specs.clarity || 'VVS'}
              ${cert.diamond_specs.cert_number ? `<br/><span style="font-size: 0.8rem; color: var(--text-muted);">Lab Certificate: ${cert.diamond_specs.cert_number}</span>` : ''}
            </div>
          </div>
        ` : ''}

        <div style="background: rgba(217, 119, 6, 0.08); border: 1px dashed rgba(217, 119, 6, 0.35); border-radius: 8px; padding: 12px 14px; margin-bottom: 24px; text-align: left;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--gold-accent); text-transform: uppercase; letter-spacing: 0.04em;">Financial Privacy Guarantee</div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 4px 0 0 0; line-height: 1.45;">
            Purchase acquisition price, current valuation, unrealized P&amp;L, and sensitive transaction records are strictly segregated under client-side encryption and are never disclosed on public certificates.
          </p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary" onclick="window.location.hash=''; App.navigate('auth');">
            Open AssetVault Portal
          </button>
        </div>
      `;
    } catch (e) {
      const contentEl = document.getElementById('verify-cert-content');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="padding: 24px 12px;">
            <div style="color: var(--loss-red); font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">Certificate Not Found or Revoked</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">The provided verification token is invalid, expired, or has been rotated by the asset owner.</p>
            <button class="btn btn-secondary" onclick="window.location.hash=''; App.navigate('auth');">
              Go to Login Portal
            </button>
          </div>
        `;
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
