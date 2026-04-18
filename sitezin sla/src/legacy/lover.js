import { getPublicMediaUrl, uploadMedia } from '../lib/media.js';

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_LOVER_UPLOAD_MAX_MB || 200);
const ACCEPTED_MEDIA_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const LOVER_EMPTY_STATE = {
  icon: 'heart',
  title: 'Seus cantos favoritos da internet',
  subtitle: 'Os sites que voce abre so pra relaxar',
  subtitleSecondary: 'Adicione um link ou envie um video para liberar pastas, filtros e organizacao.'
};

const LoverMedia = {
  selectedFolderId: '__all__',
  selectedType: 'all',
  searchQuery: '',
  viewerItemId: '',
  initRetries: 0,

  get Storage() {
    return window.Storage;
  },

  get App() {
    return window.App;
  },

  getDuplicateSignature(item) {
    const mediaType = item.mediaType || this.inferMediaType(item.url);
    return [
      'lover',
      String(mediaType || '').trim().toLowerCase(),
      String(item.folderId || '').trim().toLowerCase(),
      String(item.title || '').trim().toLowerCase(),
      String(item.url || '').trim().toLowerCase()
    ].join('::');
  },

  cleanupDuplicateItems() {
    if (!this.Storage || typeof this.Storage.getAll !== 'function' || typeof this.Storage.save !== 'function') {
      return false;
    }

    const allItems = this.Storage.getAll();
    const seen = new Set();
    const nextItems = [];
    let removedCount = 0;

    allItems.forEach((item) => {
      if (item.category !== 'lover') {
        nextItems.push(item);
        return;
      }

      const signature = this.getDuplicateSignature(item);
      if (!signature || !item.url) {
        nextItems.push(item);
        return;
      }

      if (seen.has(signature)) {
        removedCount += 1;
        return;
      }

      seen.add(signature);
      nextItems.push(item);
    });

    if (!removedCount) return false;

    this.Storage.save(nextItems, 'lover-dedupe');
    return true;
  },

  init() {
    if (!this.Storage || !this.App) {
      if (this.initRetries < 20) {
        this.initRetries += 1;
        window.setTimeout(() => this.init(), 120);
      }
      return;
    }
    this.bindUi();
    this.cleanupDuplicateItems();
    this.ensureDefaultFolderSelection();
    this.render();
    this.initRetries = 0;
  },

  patchLegacyRenderer() {
    if (!this.App || this.App.__loverPatched) return;
    const originalRenderEra = this.App.renderEra.bind(this.App);
    this.App.renderEra = (era) => {
      if (era === 'lover') {
        this.init();
        return;
      }
      originalRenderEra(era);
    };
    this.App.__loverPatched = true;
  },

  bindUi() {
    const addFolderBtn = document.getElementById('lover-add-folder-btn');
    const addLinkBtn = document.getElementById('lover-add-link-btn');
    const uploadBtn = document.getElementById('lover-upload-btn');
    const uploadInput = document.getElementById('lover-upload-input');
    const searchInput = document.getElementById('lover-search-input');
    const grid = document.getElementById('lover-media-grid');

    if (addFolderBtn && addFolderBtn.dataset.bound !== '1') {
      addFolderBtn.dataset.bound = '1';
      addFolderBtn.addEventListener('click', () => this.createFolder());
    }
    if (addLinkBtn && addLinkBtn.dataset.bound !== '1') {
      addLinkBtn.dataset.bound = '1';
      addLinkBtn.addEventListener('click', () => this.createLinkItem());
    }
    if (uploadBtn && uploadBtn.dataset.bound !== '1') {
      uploadBtn.dataset.bound = '1';
      uploadBtn.addEventListener('click', () => uploadInput && uploadInput.click());
    }
    if (uploadInput && uploadInput.dataset.bound !== '1') {
      uploadInput.dataset.bound = '1';
      uploadInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) this.uploadFile(file);
        event.target.value = '';
      });
    }
    if (searchInput && searchInput.dataset.bound !== '1') {
      searchInput.dataset.bound = '1';
      searchInput.addEventListener('input', () => {
        this.searchQuery = String(searchInput.value || '').trim().toLowerCase();
        this.renderGrid();
      });
    }
    if (grid && grid.dataset.bound !== '1') {
      grid.dataset.bound = '1';
      grid.addEventListener('click', (event) => {
        const target = event.target instanceof Element
          ? event.target
          : (event.target && event.target.parentElement ? event.target.parentElement : null);
        if (!target) return;

        const actionButton = target.closest('[data-action]');
        if (!actionButton) return;

        const card = actionButton.closest('.lover-media-card');
        const itemId = card ? card.getAttribute('data-id') : '';
        const itemIdentity = card ? (card.getAttribute('data-identity') || '') : '';
        const action = actionButton.getAttribute('data-action') || '';
        if (!itemId) return;

        event.preventDefault();
        event.stopPropagation();

        if (action === 'open') {
          this.openViewer(itemId);
          return;
        }
        if (action === 'move') {
          this.moveItem(itemId);
          return;
        }
        if (action === 'delete') {
          this.deleteItem(itemId, itemIdentity);
        }
      });
    }
  },

  ensureDefaultFolderSelection() {
    const folders = this.Storage.getFolders('lover');
    if (!folders.length) {
      this.selectedFolderId = '__all__';
      return;
    }
    if (this.selectedFolderId === '__all__') return;
    const exists = folders.some((folder) => folder.id === this.selectedFolderId);
    if (!exists) this.selectedFolderId = '__all__';
  },

  inferMediaType(url = '') {
    const lower = String(url || '').toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(lower)) return 'embed';
    return 'link';
  },

  getEmbedUrl(url = '') {
    const value = String(url || '').trim();
    if (!value) return '';
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./i, '');
      if (host.includes('youtube.com')) {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
      }
      if (host.includes('youtu.be')) {
        const id = parsed.pathname.replace('/', '').trim();
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
      }
      if (host.includes('vimeo.com')) {
        const id = parsed.pathname.split('/').filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : '';
      }
    } catch {
      return '';
    }
    return '';
  },

  buildCard(item) {
    const thumb = item.thumbnail || '';
    const mediaType = item.mediaType || this.inferMediaType(item.url);
    const badge = mediaType === 'upload' ? 'Upload' : (mediaType === 'embed' ? 'Embed' : 'Link');
    const identity = this.getDuplicateSignature(item);
    return (
      `<article class="lover-media-card" data-id="${this.App.escapeHtml(item.id)}" data-identity="${this.App.escapeHtml(identity)}">` +
        `<button type="button" class="lover-card-preview" data-action="open">` +
          (thumb
            ? `<img src="${this.App.escapeHtml(thumb)}" alt="" loading="lazy" decoding="async" />`
            : `<span class="lover-card-fallback"><i data-lucide="film"></i></span>`) +
          `<span class="lover-card-play"><i data-lucide="play"></i></span>` +
        `</button>` +
        `<div class="lover-card-body">` +
          `<strong>${this.App.escapeHtml(item.title || 'Sem titulo')}</strong>` +
          `<small>${this.App.escapeHtml(badge)}</small>` +
        `</div>` +
        `<div class="lover-card-actions">` +
          `<button type="button" data-action="move">Mover</button>` +
          `<button type="button" data-action="delete">Excluir</button>` +
        `</div>` +
      `</article>`
    );
  },

  getFilteredItems() {
    const folderFilter = this.selectedFolderId;
    return this.Storage.getByCategory('lover')
      .filter((item) => {
        const resolvedMediaType = item.mediaType && item.mediaType !== 'link'
          ? item.mediaType
          : this.inferMediaType(item.url);
        if (folderFilter !== '__all__') {
          const itemFolder = String(item.folderId || '').trim();
          if (folderFilter === '__none__' && itemFolder) return false;
          if (folderFilter !== '__none__' && itemFolder !== folderFilter) return false;
        }
        if (this.selectedType !== 'all' && resolvedMediaType !== this.selectedType) return false;
        if (this.searchQuery) {
          const haystack = `${item.title || ''} ${(item.tags || []).join(' ')} ${item.url || ''}`.toLowerCase();
          if (!haystack.includes(this.searchQuery)) return false;
        }
        return true;
      });
  },

  openAddItemModal(preset = {}) {
    if (!this.App || typeof this.App.openPrefilledModal !== 'function') return;
    this.App.openPrefilledModal('lover', {
      type: 'link',
      modalTitle: 'Adicionar vídeo/link',
      lockType: true,
      title: String(preset.title || preset.label || '').trim(),
      url: String(preset.url || '').trim(),
      tags: Array.isArray(preset.tags) ? preset.tags : []
    });
  },

  renderFolders() {
    const container = document.getElementById('lover-folders-list');
    if (!container) return;
    const folders = this.Storage.getFolders('lover');
    const rows = [
      { id: '__all__', name: 'Todas', color: '#e891b7' },
      { id: '__none__', name: 'Sem pasta', color: '#b5b5b5' },
      ...folders
    ];

    container.innerHTML = rows.map((folder) => (
      `<div class="lover-folder-row ${this.selectedFolderId === folder.id ? 'active' : ''}" data-id="${this.App.escapeHtml(folder.id)}">` +
        `<button type="button" class="lover-folder-select">` +
          `<span class="lover-folder-dot" style="background:${this.App.escapeHtml(folder.color || '#e891b7')}"></span>` +
          `<span>${this.App.escapeHtml(folder.name)}</span>` +
        `</button>` +
        (folder.id.startsWith('__')
          ? ''
          : `<div class="lover-folder-actions">
              <button type="button" data-action="rename" title="Renomear"><i data-lucide="pencil"></i></button>
              <button type="button" data-action="delete" title="Excluir"><i data-lucide="trash-2"></i></button>
            </div>`) +
      `</div>`
    )).join('');

    container.querySelectorAll('.lover-folder-row').forEach((row) => {
      const folderId = row.getAttribute('data-id') || '__all__';
      const selectBtn = row.querySelector('.lover-folder-select');
      if (selectBtn) {
        selectBtn.addEventListener('click', () => {
          this.selectedFolderId = folderId;
          this.render();
        });
      }
      row.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          const action = btn.getAttribute('data-action');
          if (action === 'rename') this.renameFolder(folderId);
          if (action === 'delete') this.removeFolder(folderId);
        });
      });
    });
  },

  renderFilters() {
    const container = document.getElementById('lover-media-filters');
    if (!container) return;
    const options = [
      { id: 'all', label: 'Todos' },
      { id: 'upload', label: 'Uploads' },
      { id: 'link', label: 'Links' },
      { id: 'embed', label: 'Embeds' }
    ];
    container.innerHTML = options
      .map((option) => `<button type="button" class="tag-btn ${this.selectedType === option.id ? 'active' : ''}" data-type="${option.id}">${option.label}</button>`)
      .join('');
    container.querySelectorAll('[data-type]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedType = button.getAttribute('data-type') || 'all';
        this.renderGrid();
        this.renderFilters();
      });
    });
  },

  renderGrid() {
    const container = document.getElementById('lover-media-grid');
    if (!container) return;
    const allItems = this.Storage.getByCategory('lover');
    const items = this.getFilteredItems();
    const hasItems = allItems.length > 0;

    if (!hasItems) {
      container.innerHTML =
        `<section class="era-empty era-empty--lover lover-onboarding-empty">` +
          `<div class="era-empty-icon"><i data-lucide="${this.App.escapeHtml(LOVER_EMPTY_STATE.icon)}"></i></div>` +
          `<p>${this.App.escapeHtml(LOVER_EMPTY_STATE.title)}</p>` +
          `<small>${this.App.escapeHtml(LOVER_EMPTY_STATE.subtitle)}</small>` +
          `<div class="lover-empty-actions">` +
            `<button type="button" class="btn-add-item era-empty-cta lover-empty-primary" id="lover-empty-primary">+ Adicionar link</button>` +
            `<button type="button" class="era-empty-chip lover-empty-upload-btn" id="lover-empty-upload">Upload</button>` +
          `</div>` +
        `</section>`;

      const primaryBtn = container.querySelector('#lover-empty-primary');
      const uploadBtn = container.querySelector('#lover-empty-upload');
      const uploadInput = document.getElementById('lover-upload-input');
      if (primaryBtn) primaryBtn.addEventListener('click', () => this.createLinkItem());
      if (uploadBtn) uploadBtn.addEventListener('click', () => {
        if (uploadInput) uploadInput.click();
      });
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      return;
    }

    if (!items.length) {
      container.innerHTML = '<div class="lover-empty-grid">Nenhuma midia encontrada com os filtros atuais.</div>';
      return;
    }
    container.innerHTML = items.map((item) => this.buildCard(item)).join('');
    container.querySelectorAll('.lover-media-card').forEach((card) => {
      const itemId = card.getAttribute('data-id') || '';
      const itemIdentity = card.getAttribute('data-identity') || '';
      if (!itemId) return;

      const previewButton = card.querySelector('.lover-card-preview');
      const moveButton = card.querySelector('[data-action="move"]');
      const deleteButton = card.querySelector('[data-action="delete"]');

      if (previewButton && previewButton.dataset.bound !== '1') {
        previewButton.dataset.bound = '1';
        previewButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openViewer(itemId);
        });
      }

      if (moveButton && moveButton.dataset.bound !== '1') {
        moveButton.dataset.bound = '1';
        moveButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.moveItem(itemId);
        });
      }

      if (deleteButton && deleteButton.dataset.bound !== '1') {
        deleteButton.dataset.bound = '1';
        deleteButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.deleteItem(itemId, itemIdentity);
        });
      }
    });
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  },

  render() {
    const shell = document.getElementById('lover-media-shell');
    const searchInput = document.getElementById('lover-search-input');
    const hasItems = this.Storage.getByCategory('lover').length > 0;

    if (!hasItems) {
      this.selectedFolderId = '__all__';
      this.selectedType = 'all';
      this.searchQuery = '';
      if (searchInput) searchInput.value = '';
    }

    if (shell) {
      shell.classList.toggle('is-onboarding', !hasItems);
    }

    this.renderFolders();
    this.renderFilters();
    this.renderGrid();
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  },

  createFolder() {
    const name = window.prompt('Nome da nova pasta:');
    if (!name) return;
    this.Storage.addFolder('lover', { name, color: '#e891b7' });
    this.render();
  },

  renameFolder(folderId) {
    const folders = this.Storage.getFolders('lover');
    const folder = folders.find((entry) => entry.id === folderId);
    if (!folder) return;
    const nextName = window.prompt('Novo nome da pasta:', folder.name || '');
    if (!nextName) return;
    const nextFolders = folders.map((entry) => (entry.id === folderId ? { ...entry, name: nextName } : entry));
    this.Storage.saveFolders('lover', nextFolders);
    this.render();
  },

  removeFolder(folderId) {
    if (!window.confirm('Excluir esta pasta? Os videos ficam em "Sem pasta".')) return;
    this.Storage.deleteFolder('lover', folderId);
    if (this.selectedFolderId === folderId) this.selectedFolderId = '__none__';
    this.render();
  },

  createLinkItem() {
    this.openAddItemModal();
  },

  async captureVideoThumbnail(url) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      const done = (value) => {
        resolve(value || '');
      };
      video.addEventListener('loadeddata', () => {
        try {
          video.currentTime = Math.min(1, Number(video.duration || 1));
        } catch {
          done('');
        }
      });
      video.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 180;
          const ctx = canvas.getContext('2d');
          if (!ctx) return done('');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          done(canvas.toDataURL('image/jpeg', 0.75));
        } catch {
          done('');
        }
      });
      video.addEventListener('error', () => done(''));
    });
  },

  async uploadFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      window.alert(`Arquivo excede ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    if (file.type && !ACCEPTED_MEDIA_TYPES.includes(file.type)) {
      // Extensao ainda pode ser valida; seguiremos em frente.
    }

    const tempId = this.Storage.generateId();
    const uploadingItem = this.Storage.addItem({
      id: tempId,
      type: 'link',
      title: file.name,
      category: 'lover',
      mediaType: 'upload',
      folderId: this.selectedFolderId.startsWith('__') ? '' : this.selectedFolderId,
      url: '',
      thumbnail: '',
      tags: ['upload'],
      content: 'Enviando arquivo...'
    });
    this.render();

    try {
      const userId = String(this.Storage.currentUserId || 'anonymous');
      const folderId = uploadingItem.folderId || 'sem-pasta';
      const extension = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const path = `${userId}/${folderId}/${this.Storage.generateId()}.${extension}`;
      await uploadMedia(file, path);
      const publicUrl = getPublicMediaUrl(path);
      const thumbnail = await this.captureVideoThumbnail(publicUrl);
      this.Storage.updateItem(uploadingItem.id, {
        storagePath: path,
        url: publicUrl,
        content: '',
        thumbnail,
        mediaType: 'upload'
      });
    } catch (error) {
      this.Storage.updateItem(uploadingItem.id, {
        content: 'Falha no upload'
      });
      window.alert(String(error?.message || 'Erro no upload.'));
    }
    this.render();
  },

  deleteItem(itemId, fallbackIdentity = '') {
    const allItems = this.Storage.getAll();
    const currentItem = allItems.find((entry) => entry.id === itemId);
    const currentIdentity = currentItem
      ? this.getDuplicateSignature(currentItem)
      : String(fallbackIdentity || '').trim();

    if (!currentIdentity && !currentItem) return;

    const duplicateIds = currentIdentity
      ? this.Storage.getByCategory('lover')
          .filter((entry) => entry.id !== itemId && this.getDuplicateSignature(entry) === currentIdentity)
          .map((entry) => entry.id)
      : [];

    const hasDuplicates = duplicateIds.length > 0;
    const confirmMessage = hasDuplicates
      ? 'Excluir esta midia? As duplicatas identicas dela tambem serao removidas.'
      : 'Excluir esta midia?';
    if (!window.confirm(confirmMessage)) return;

    if (typeof this.Storage.save === 'function' && currentIdentity) {
      const idsToRemove = new Set([itemId, ...duplicateIds].filter(Boolean));
      const remainingItems = this.Storage.getAll().filter((entry) => {
        if (idsToRemove.has(entry.id)) return false;
        if (entry.category === 'lover' && this.getDuplicateSignature(entry) === currentIdentity) return false;
        return true;
      });
      this.Storage.save(remainingItems, 'lover-delete-duplicates');
    } else {
      this.Storage.deleteItem(itemId);
    }
    this.render();
    if (this.viewerItemId === itemId) this.closeViewer();
  },

  moveItem(itemId) {
    const folders = this.Storage.getFolders('lover');
    const options = ['Sem pasta', ...folders.map((folder) => folder.name)];
    const chosen = window.prompt(`Mover para qual pasta?\n${options.map((label, idx) => `${idx}: ${label}`).join('\n')}`, '0');
    if (chosen == null) return;
    const index = Number(chosen);
    if (!Number.isFinite(index) || index < 0 || index > folders.length) return;
    const folderId = index === 0 ? '' : folders[index - 1].id;
    this.Storage.updateItem(itemId, { folderId });
    this.render();
  },

  ensureViewerModal() {
    let modal = document.getElementById('lover-viewer-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'lover-viewer-modal';
    modal.className = 'lover-viewer-modal';
    modal.innerHTML =
      '<div class="lover-viewer-backdrop" data-action="close"></div>' +
      '<div class="lover-viewer-dialog">' +
        '<button type="button" class="lover-viewer-close" data-action="close"><i data-lucide="x"></i></button>' +
        '<div class="lover-viewer-media" id="lover-viewer-media"></div>' +
        '<div class="lover-viewer-footer" id="lover-viewer-footer"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-action="close"]').forEach((button) => {
      button.addEventListener('click', () => this.closeViewer());
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.viewerItemId) this.closeViewer();
      if (event.key === 'ArrowRight' && this.viewerItemId) this.navigateViewer(1);
      if (event.key === 'ArrowLeft' && this.viewerItemId) this.navigateViewer(-1);
    });
    return modal;
  },

  openViewer(itemId) {
    this.viewerItemId = itemId;
    const modal = this.ensureViewerModal();
    const item = this.Storage.getAll().find((entry) => entry.id === itemId);
    if (!item) return;
    const media = modal.querySelector('#lover-viewer-media');
    const footer = modal.querySelector('#lover-viewer-footer');
    if (!media || !footer) return;
    const mediaType = item.mediaType || this.inferMediaType(item.url);
    const embedUrl = this.getEmbedUrl(item.url);

    if (mediaType === 'upload') {
      media.innerHTML = `<video src="${this.App.escapeHtml(item.url || '')}" controls autoplay playsinline></video>`;
    } else if (mediaType === 'embed' && embedUrl) {
      media.innerHTML = `<iframe src="${this.App.escapeHtml(embedUrl)}" title="${this.App.escapeHtml(item.title || 'video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      media.innerHTML = `<a href="${this.App.escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" class="lover-open-external">Abrir externamente</a>`;
    }

    const folder = this.Storage.getFolders('lover').find((entry) => entry.id === item.folderId);
    footer.innerHTML =
      `<div class="lover-viewer-meta">` +
        `<input type="text" id="lover-viewer-title" value="${this.App.escapeHtml(item.title || '')}" />` +
        `<small>${this.App.escapeHtml(folder ? folder.name : 'Sem pasta')}</small>` +
      `</div>` +
      `<div class="lover-viewer-actions">` +
        '<button type="button" id="lover-viewer-prev">←</button>' +
        '<button type="button" id="lover-viewer-next">→</button>' +
        '<button type="button" id="lover-viewer-move">Mover pasta</button>' +
        '<button type="button" id="lover-viewer-copy">Copiar link</button>' +
        '<button type="button" id="lover-viewer-delete">Excluir</button>' +
      '</div>';

    const titleInput = footer.querySelector('#lover-viewer-title');
    if (titleInput) {
      titleInput.addEventListener('change', () => {
        this.Storage.updateItem(item.id, { title: String(titleInput.value || '').trim() || item.title });
        this.renderGrid();
      });
    }
    const prevBtn = footer.querySelector('#lover-viewer-prev');
    const nextBtn = footer.querySelector('#lover-viewer-next');
    const moveBtn = footer.querySelector('#lover-viewer-move');
    const copyBtn = footer.querySelector('#lover-viewer-copy');
    const delBtn = footer.querySelector('#lover-viewer-delete');
    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateViewer(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateViewer(1));
    if (moveBtn) moveBtn.addEventListener('click', () => this.moveItem(item.id));
    if (copyBtn) copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(String(item.url || '')); } catch {}
    });
    if (delBtn) delBtn.addEventListener('click', () => this.deleteItem(item.id));

    modal.classList.add('visible');
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  },

  navigateViewer(step) {
    const list = this.getFilteredItems();
    const index = list.findIndex((entry) => entry.id === this.viewerItemId);
    if (index < 0) return;
    const next = list[index + step];
    if (next) this.openViewer(next.id);
  },

  closeViewer() {
    this.viewerItemId = '';
    const modal = document.getElementById('lover-viewer-modal');
    if (modal) modal.classList.remove('visible');
  }
};

export function initLoverMedia() {
  LoverMedia.init();
}

window.LoverMedia = LoverMedia;
window.initLoverMedia = initLoverMedia;
