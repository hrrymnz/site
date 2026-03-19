// ===== APP MODULE =====
// Mapa rapido deste arquivo:
// 1) Helpers de segurança/formatacao
// 2) Inicializacao geral da UI
// 3) Busca global
// 4) Modal de criacao de item
// 5) Renderizacao por era + filtros
// 6) Eventos dos cards + drag and drop
// 7) Highlights da pagina Debut
import { marked } from "marked";

const App = {
  currentEra: "debut",
  currentTagFilter: null,
  draggedId: null,
  showAllPinnedHighlights: false,
  showAllAccessedHighlights: false,
  redNotesQuery: "",
  redSelectedNoteId: "",
  redNoteDraft: null,
  redNoteSaveTimer: null,
  redNoteViewMode: "preview",
  redNotesViewMode: "list",
  redNotesFilter: "all",
  pendingDeleteNoteId: null,
  pendingDeleteContext: null,
  redChecklistSaveTimer: null,
  spotifyCoverPending: {},
  folkloreSelectedMarkdownId: "",
  folkloreMarkdownViewMode: "preview",
  folkloreMarkdownDraft: null,
  folkloreMarkdownSaveTimer: null,

  // ===== HELPERS =====
  // Funcoes utilitarias para escapar texto, normalizar dados e construir labels da interface.
  escapeHtml(str) {
    // Evita injecao de HTML ao renderizar texto vindo de input/storage.
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },

  sanitizeUrl(url) {
    // Garante protocolo seguro para links clicaveis na interface.
    if (!url) return "";
    try {
      const u = new URL(url);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "";
    } catch { return ""; }
  },

  formatHost(url) {
    try { return new URL(url).hostname; } catch { return url; }
  },

  stripMarkdownToText(value) {
    const raw = String(value || "");
    return raw
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^>\s+/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_~]/g, "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  renderMarkdownHtml(markdown) {
    const source = String(markdown || "");
    let html = "";
    try {
      html = marked.parse(source, { gfm: true, breaks: true });
    } catch {
      html = "<p>" + this.escapeHtml(source).replace(/\n/g, "<br>") + "</p>";
    }
    return this.sanitizeMarkdownHtml(html);
  },

  sanitizeMarkdownHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");

    const blockedTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const tagName = String(node.tagName || "").toLowerCase();
      if (blockedTags.has(tagName)) {
        toRemove.push(node);
        continue;
      }

      [...node.attributes].forEach((attr) => {
        const name = String(attr.name || "").toLowerCase();
        const value = String(attr.value || "");

        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
          return;
        }

        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
          return;
        }

        if (name === "style") {
          node.removeAttribute(attr.name);
        }
      });
    }

    toRemove.forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });

    return template.innerHTML;
  },

  renderRedNotePreview(markdown) {
    const preview = document.getElementById("red-note-preview");
    if (!preview) return;
    const source = String(markdown || "");
    const plain = source.trim();
    if (!plain) {
      preview.innerHTML = '<p class="red-note-preview-empty">Sem conteúdo.</p>';
      return;
    }

    const safe = this.escapeHtml(source).replace(/\r?\n/g, "<br>");
    preview.innerHTML = '<p class="red-note-preview-text">' + safe + "</p>";
  },

  setRedNoteViewMode(mode) {
    this.redNoteViewMode = mode === "split" ? "split" : "preview";
    const layout = document.getElementById("red-note-md-layout");
    const previewBtn = document.getElementById("red-note-mode-preview");
    const splitBtn = document.getElementById("red-note-mode-split");
    if (layout) {
      layout.classList.toggle("is-split", this.redNoteViewMode === "split");
      layout.classList.toggle("is-preview", this.redNoteViewMode !== "split");
    }
    if (previewBtn) previewBtn.classList.toggle("active", this.redNoteViewMode === "preview");
    if (splitBtn) splitBtn.classList.toggle("active", this.redNoteViewMode === "split");
  },

  renderRedChecklistProgress(progressEl, done, total) {
    if (!progressEl) return;
    const safeDone = Number(done) || 0;
    const safeTotal = Number(total) || 0;
    if (!safeTotal) {
      progressEl.style.display = "none";
      progressEl.innerHTML = "";
      return;
    }

    const percent = Math.max(0, Math.min(100, Math.round((safeDone / safeTotal) * 100)));
    progressEl.style.display = "grid";
    progressEl.innerHTML =
      '<span class="red-checklist-progress-label">' + safeDone + " de " + safeTotal + " concluídos</span>" +
      '<span class="red-checklist-progress-track"><span class="red-checklist-progress-fill" style="width:' + percent + '%"></span></span>';
  },

  getRedListPreview(item, maxLength = 88) {
    const source = String(item && item.content ? item.content : "");
    const compact = source.replace(/\s+/g, " ").trim();
    if (!compact) return "Sem conteúdo";
    return compact.slice(0, Math.max(0, Number(maxLength) || 88));
  },

  isRedItemEmpty(item, overrides = {}) {
    if (!item) return true;
    const type = String(item.type || "").toLowerCase();
    const title = String(overrides.title != null ? overrides.title : (item.title || "")).trim();
    const normalizedTitle = title.toLowerCase();

    if (type === "note") {
      const content = String(overrides.content != null ? overrides.content : (item.content || "")).trim();
      const hasCustomTitle = !!title && !["nova nota", "sem título", "sem titulo"].includes(normalizedTitle);
      return !hasCustomTitle && !content;
    }

    if (type === "checklist") {
      const checklistItems = Array.isArray(overrides.checklistItems)
        ? overrides.checklistItems
        : (Array.isArray(item.checklistItems) ? item.checklistItems : []);
      const hasChecklistContent = checklistItems.some((entry) => {
        const text = String(entry && entry.text ? entry.text : "").trim();
        return !!text;
      });
      const hasCustomTitle = !!title && !["nova checklist", "checklist"].includes(normalizedTitle);
      return !hasCustomTitle && !hasChecklistContent;
    }

    return false;
  },

  cleanupRedEmptyItems(exceptId = "") {
    const removable = Storage.getByCategory("red").filter((item) => {
      const type = String(item.type || "").toLowerCase();
      if (item.id === exceptId) return false;
      if (type !== "note" && type !== "checklist") return false;
      return this.isRedItemEmpty(item);
    });

    if (!removable.length) return false;

    removable.forEach((item) => Storage.deleteItem(item.id));

    if (removable.some((item) => item.id === this.redSelectedNoteId)) {
      this.redSelectedNoteId = "";
      this.redNoteDraft = null;
      clearTimeout(this.redNoteSaveTimer);
    }

    this.renderDebutHighlights();
    if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
    return true;
  },

  decorateMarkdownLinks(root) {
    if (!root) return;
    root.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  },

  normalizeEra(era) {
    const value = String(era || "").toLowerCase().trim();
    const map = {
      "speak now": "speak-now"
    };
    return map[value] || value || "debut";
  },

  formatEraLabel(era) {
    const labels = {
      debut: "Início",
      fearless: "Repositórios",
      "speak-now": "Música",
      red: "Notas",
      "1989": "Ferramentas",
      reputation: "Links",
      lover: "Vídeos",
      folklore: "Resumos e Anotações",
      evermore: "Perfil",
      settings: "Configurações"
    };
    const key = this.normalizeEra(era);
    return labels[key] || "Início";
  },

  renderEraBadge(era) {
    // Gera o botao de era usado em "Recentes", "Fixados" e "Mais acessados".
    const key = this.normalizeEra(era);
    return '<button type="button" class="era-badge-btn recent-era-inline highlight-era-inline era-' + this.escapeHtml(key) + '" data-era="' + this.escapeHtml(key) + '">' +
      '<span class="recent-era-dot"></span>' +
      '<span class="recent-era-text">' + this.escapeHtml(this.formatEraLabel(key)) + '</span>' +
    '</button>';
  },

  normalizeRepoSlug(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const fromUrl = raw.match(/^https?:\/\/github\.com\/[^/]+\/([^/?#]+)/i);
    if (fromUrl && fromUrl[1]) return fromUrl[1].toLowerCase();

    return raw.replace(/^\/+|\/+$/g, "").split("/").pop().toLowerCase();
  },

  getPinnedRepoMatchers() {
    if (typeof Storage === "undefined" || typeof Storage.getPinnedRepos !== "function") {
      return { titles: new Set(), slugs: new Set() };
    }

    const repos = Storage.getPinnedRepos();
    const titles = new Set();
    const slugs = new Set();

    const allItems = typeof Storage.getAll === "function" ? Storage.getAll() : [];
    const byId = new Map(allItems.map((item) => [item.id, item]));

    repos.forEach((repo) => {
      const source = repo?.sourceId ? byId.get(repo.sourceId) : null;
      const nome = String(source?.title || repo?.nome || "").trim().toLowerCase();
      const slug = this.normalizeRepoSlug(source?.url || repo?.slug || repo?.url || repo?.nome || "");
      if (nome) titles.add(nome);
      if (slug) slugs.add(slug);
    });

    return { titles, slugs };
  },

  isPinnedRepoMirroredInMyRepos(item, matchers) {
    if (!item || String(item.type || "").toLowerCase() !== "repo") return false;

    const title = String(item.title || "").trim().toLowerCase();
    const slugFromUrl = this.normalizeRepoSlug(item.url || "");

    if (title && matchers.titles.has(title)) return true;
    if (slugFromUrl && matchers.slugs.has(slugFromUrl)) return true;
    if (title && matchers.slugs.has(title)) return true;
    return false;
  },

  setupPinnedHighlightsToggle() {
    const toggleLink = document.getElementById("ver-mais-pinned");
    if (!toggleLink || toggleLink.dataset.boundClick === "1") return;

    toggleLink.dataset.boundClick = "1";
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (toggleLink.dataset.disabled === "1") return;
      this.showAllPinnedHighlights = !this.showAllPinnedHighlights;
      this.renderDebutHighlights();
    });
  },

  setupAccessedHighlightsToggle() {
    const toggleLink = document.getElementById("ver-mais-accessed");
    if (!toggleLink || toggleLink.dataset.boundClick === "1") return;

    toggleLink.dataset.boundClick = "1";
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (toggleLink.dataset.disabled === "1") return;
      this.showAllAccessedHighlights = !this.showAllAccessedHighlights;
      this.renderDebutHighlights();
    });
  },

  navigateToEra(era) {
    // Navegacao centralizada para reaproveitar o comportamento da sidebar.
    const key = this.normalizeEra(era);
    const link = document.querySelector('.era-link[data-target="' + CSS.escape(key) + '"]');
    if (link) link.click();
  },

  renderFearlessRepoCard(item, safeUrl) {
    const descricao = item.content
      ? this.escapeHtml(item.content.slice(0, 120)) + (item.content.length > 120 ? "..." : "")
      : (safeUrl ? this.escapeHtml(this.formatHost(item.url)) : "Sem descrição");

    return '<div class="item-card fearless-repo-card ' + (item.pinned ? "pinned" : "") + '" draggable="true" data-id="' + item.id + '">' +
      '<div class="fearless-repo-top">' +
        '<small class="fearless-repo-label">REPO</small>' +
        '<div class="item-card-actions">' +
          (item.pinned ? '<span class="pin-indicator"><i data-lucide="pin"></i></span>' : '') +
          '<button class="item-btn-pin" data-id="' + item.id + '" title="' + (item.pinned ? "Desafixar" : "Fixar") + '">' +
            '<i data-lucide="' + (item.pinned ? 'pin-off' : 'pin') + '"></i>' +
          '</button>' +
          '<button class="item-btn-delete" data-id="' + item.id + '" title="Excluir"><i data-lucide="trash-2"></i></button>' +
        '</div>' +
      '</div>' +
      '<strong class="item-title fearless-repo-title">' + this.escapeHtml(item.title) + '</strong>' +
      '<p class="fearless-repo-desc">' + descricao + '</p>' +
      (safeUrl ? '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="item-url fearless-repo-link" data-id="' + item.id + '">Abrir repositório</a>' : '') +
      (item.tags.length ? '<div class="item-tags">' + item.tags.map(t => '<span class="item-tag" data-tag="' + this.escapeHtml(t) + '">' + this.escapeHtml(t) + '</span>').join("") + '</div>' : '') +
      '<div class="item-meta"><span>' + (item.accessCount || 0) + ' acessos</span></div>' +
    '</div>';
  },

  renderFolkloreMarkdownCard(item) {
    const previewText = this.stripMarkdownToText(item.content).slice(0, 150);
    const preview = previewText ? this.escapeHtml(previewText) : "Sem conteudo";
    const updated = new Date(item.updatedAt || item.createdAt || Date.now());
    const updatedLabel = Number.isNaN(updated.getTime())
      ? ""
      : "Atualizado em " + updated.toLocaleDateString("pt-BR");

    return '<div class="item-card folklore-md-card ' + (item.pinned ? "pinned" : "") + '" draggable="false" data-id="' + item.id + '">' +
      '<div class="item-card-header">' +
        '<span class="item-type-icon">' + this.typeIcon(item.type) + '</span>' +
        '<div class="item-card-actions">' +
          (item.pinned ? '<span class="pin-indicator"><i data-lucide="pin"></i></span>' : '') +
          '<button class="item-btn-pin" data-id="' + item.id + '" title="' + (item.pinned ? "Desafixar" : "Fixar") + '">' +
            '<i data-lucide="' + (item.pinned ? 'pin-off' : 'pin') + '"></i>' +
          '</button>' +
          '<button class="item-btn-delete" data-id="' + item.id + '" title="Excluir"><i data-lucide="trash-2"></i></button>' +
        '</div>' +
      '</div>' +
      '<strong class="item-title">' + this.escapeHtml(item.title || "Documento Markdown") + '</strong>' +
      '<p class="item-content-preview">' + preview + (previewText.length === 150 ? "..." : "") + '</p>' +
      (item.tags.length ? '<div class="item-tags">' + item.tags.map(t => '<span class="item-tag" data-tag="' + this.escapeHtml(t) + '">' + this.escapeHtml(t) + '</span>').join("") + '</div>' : '') +
      '<div class="item-meta">' +
        '<span>' + this.escapeHtml(updatedLabel) + '</span>' +
        '<button type="button" class="folklore-open-md-btn" data-id="' + this.escapeHtml(item.id) + '">Abrir leitura</button>' +
      '</div>' +
    '</div>';
  },

  getSpotifyEmbedUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";

    const webMatch = value.match(/^https?:\/\/open\.spotify\.com\/(playlist|album|track|episode|show)\/([a-zA-Z0-9]+)(?:\?.*)?$/i);
    if (webMatch) {
      return "https://open.spotify.com/embed/" + webMatch[1].toLowerCase() + "/" + webMatch[2];
    }

    const uriMatch = value.match(/^spotify:(playlist|album|track|episode|show):([a-zA-Z0-9]+)$/i);
    if (uriMatch) {
      return "https://open.spotify.com/embed/" + uriMatch[1].toLowerCase() + "/" + uriMatch[2];
    }

    return "";
  },

  getSpotifyEntityUrl(url) {
    const embedUrl = this.getSpotifyEmbedUrl(url);
    if (!embedUrl) return "";
    return embedUrl.replace("/embed/", "/");
  },

  getSpotifyCoverCache() {
    if (this.spotifyCoverCache) return this.spotifyCoverCache;
    try {
      this.spotifyCoverCache = JSON.parse(localStorage.getItem("spotifySpeakNowCoverCacheV1") || "{}") || {};
    } catch {
      this.spotifyCoverCache = {};
    }
    return this.spotifyCoverCache;
  },

  saveSpotifyCoverCache(cache) {
    this.spotifyCoverCache = cache || {};
    try {
      localStorage.setItem("spotifySpeakNowCoverCacheV1", JSON.stringify(this.spotifyCoverCache));
    } catch {
      // Falha de quota/localStorage nao deve quebrar a UI.
    }
  },

  ensureSpotifyCover(url) {
    const entityUrl = this.getSpotifyEntityUrl(url);
    if (!entityUrl) return;

    const cache = this.getSpotifyCoverCache();
    if (cache[entityUrl]) return;
    if (this.spotifyCoverPending[entityUrl]) return;

    this.spotifyCoverPending[entityUrl] = true;

    fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(entityUrl))
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => {
        if (!data || !data.thumbnail_url) return;
        cache[entityUrl] = {
          thumbnail_url: String(data.thumbnail_url || ""),
          title: String(data.title || "")
        };
        this.saveSpotifyCoverCache(cache);
        this.renderEra("speak-now");
      })
      .catch(() => {
        // Sem capa remota: mantem fallback visual.
      })
      .finally(() => {
        delete this.spotifyCoverPending[entityUrl];
      });
  },

  renderSpeakNowPlaylistWidget(item, safeUrl) {
    const entityUrl = this.getSpotifyEntityUrl(item.url);
    if (!entityUrl) return "";

    this.ensureSpotifyCover(item.url);

    const cache = this.getSpotifyCoverCache();
    const coverData = cache[entityUrl] || null;
    const coverUrl = coverData && coverData.thumbnail_url ? this.escapeHtml(coverData.thumbnail_url) : "";

    const coverMarkup = coverUrl
      ? '<img class="speak-widget-cover" src="' + coverUrl + '" alt="Capa da playlist" loading="lazy" decoding="async" />'
      : '<div class="speak-widget-cover-fallback"><i data-lucide="music-2"></i></div>';

    return '<div class="item-card speak-widget-card ' + (item.pinned ? "pinned" : "") + '" draggable="true" data-id="' + item.id + '">' +
      '<div class="item-card-header">' +
        '<span class="item-type-icon">' + this.typeIcon(item.type) + '</span>' +
        '<div class="item-card-actions">' +
          (item.pinned ? '<span class="pin-indicator"><i data-lucide="pin"></i></span>' : '') +
          '<button class="item-btn-pin" data-id="' + item.id + '" title="' + (item.pinned ? "Desafixar" : "Fixar") + '"><i data-lucide="' + (item.pinned ? 'pin-off' : 'pin') + '"></i></button>' +
          '<button class="item-btn-delete" data-id="' + item.id + '" title="Excluir"><i data-lucide="trash-2"></i></button>' +
        '</div>' +
      '</div>' +
      '<a href="' + (safeUrl || '#') + '" target="_blank" rel="noopener noreferrer" class="speak-widget-cover-link" data-id="' + item.id + '">' +
        '<div class="speak-widget-cover-wrap">' + coverMarkup + '</div>' +
      '</a>' +
      '<strong class="item-title">' + this.escapeHtml(item.title) + '</strong>' +
      (item.tags.length ? '<div class="item-tags speak-widget-tags">' + item.tags.map(t => '<span class="item-tag" data-tag="' + this.escapeHtml(t) + '">' + this.escapeHtml(t) + '</span>').join("") + '</div>' : '') +
      '<div class="item-meta"><span>' + (item.accessCount || 0) + ' acessos</span></div>' +
    '</div>';
  },

  typeIcon(type) {
    const icons = {
      link: '<i data-lucide="link"></i>',
      note: '<i data-lucide="file-text"></i>',
      markdown: '<i data-lucide="file-code-2"></i>',
      checklist: '<i data-lucide="check-square"></i>',
      repo: '<i data-lucide="folder-git-2"></i>',
      playlist: '<i data-lucide="music"></i>'
    };
    return icons[type] || '<i data-lucide="file"></i>';
  },

  // ===== INIT =====
  // Ponto de entrada da aplicacao SPA.
  init() {
    this.setupSearch();
    this.setupModal();
    this.setupAddButtons();
    this.setupFolkloreMarkdownUpload();
    this.setupDeleteNoteModal();
    this.setupRedNotes();

    const prefs = Storage.getUiPrefs ? Storage.getUiPrefs() : {};
    this.quickFilter = prefs.quickFilter || "all";
    this.topbarTagFilter = prefs.tag || "__all__";

    this.setupQuickFilters();
    this.setupPinnedHighlightsToggle();
    this.setupAccessedHighlightsToggle();
    Storage.ensureFearlessDefaults();
    this.renderAllEras();
    this.renderDebutHighlights();
    this.renderQuickFiltersState();
  },


  updateQuickFilterTags() {
    const tagSelect = document.getElementById("topbar-tag-filter");
    if (!tagSelect) return;

    const tags = new Set();
    Storage.getAll().forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
    const options = ['<option value="__all__">Todas as tags</option>'];
    [...tags].sort().forEach((tag) => {
      options.push('<option value="' + this.escapeHtml(tag) + '">' + this.escapeHtml(tag) + '</option>');
    });
    tagSelect.innerHTML = options.join('');
  },

  setupQuickFilters() {
    const container = document.getElementById("topbar-filters");
    const tagSelect = document.getElementById("topbar-tag-filter");
    if (!container || !tagSelect) return;

    this.updateQuickFilterTags();

    if (container.dataset.boundQuickFilters === "1") {
      this.renderQuickFiltersState();
      return;
    }
    container.dataset.boundQuickFilters = "1";

    container.querySelectorAll('.quick-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.quickFilter = btn.dataset.filter || 'all';
        Storage.saveUiPrefs({ quickFilter: this.quickFilter });
        this.renderAllEras();
        this.renderDebutHighlights();
        this.renderQuickFiltersState();
      });
    });

    tagSelect.addEventListener('change', () => {
      this.topbarTagFilter = tagSelect.value || '__all__';
      Storage.saveUiPrefs({ tag: this.topbarTagFilter });
      this.renderAllEras();
      this.renderDebutHighlights();
      this.renderQuickFiltersState();
    });
  },
  renderQuickFiltersState() {
    document.querySelectorAll('.quick-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === this.quickFilter);
    });
    const tagSelect = document.getElementById('topbar-tag-filter');
    if (tagSelect) {
      tagSelect.value = this.topbarTagFilter || '__all__';
    }
  },

  applyQuickFilters(items) {
    let result = [...items];

    if (this.topbarTagFilter && this.topbarTagFilter !== '__all__') {
      result = result.filter((item) => (item.tags || []).includes(this.topbarTagFilter));
    }

    if (this.quickFilter === 'pinned') {
      result = result.filter((item) => !!item.pinned);
    }

    if (this.quickFilter === 'recent') {
      result = result
        .filter((item) => !!item.lastAccessed)
        .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    }

    if (this.quickFilter === 'most-accessed') {
      result = result.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
    }

    return result;
  },
  // ===== SEARCH =====
  // Controle da busca global no topo e renderizacao dos resultados.
  // Busca em: paginas da SPA + itens do Storage.
  pages: [
    { id: "__page-debut", title: "Início", era: "debut", keywords: ["inicio", "home", "principal", "dashboard"] },
    { id: "__page-fearless", title: "Repositórios", era: "fearless", keywords: ["repositorios", "repos"] },
    { id: "__page-speak-now", title: "Música", era: "speak-now", keywords: ["musica", "música", "music"] },
    { id: "__page-red", title: "Notas", era: "red", keywords: [] },
    { id: "__page-1989", title: "Ferramentas", era: "1989", keywords: [] },
    { id: "__page-reputation", title: "Links", era: "reputation", keywords: [] },
    { id: "__page-lover", title: "Vídeos", era: "lover", keywords: ["videos"] },
    { id: "__page-folklore", title: "Resumos e Anotações", era: "folklore", keywords: ["resumos", "anotacoes" ] },
    { id: "__page-evermore", title: "Perfil", era: "evermore", keywords: ["perfil", "profile", "usuario", "conta"] },
    { id: "__page-settings", title: "Configurações", era: "settings", keywords: ["configuracoes", "preferencias", "perfil", "profile", "backup", "exportar", "importar", "seguranca", "settings"] }
  ],

  searchPages(query) {
    const q = query.toLowerCase();
    return this.pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    );
  },

  setupSearch() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    if (!input || !results) return;

    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const query = input.value.trim();
        if (query.length < 2) {
          results.classList.remove("visible");
          results.innerHTML = "";
          return;
        }

        const pageResults = this.searchPages(query);
        const items = Storage.search(query);

        if (pageResults.length === 0 && items.length === 0) {
          results.innerHTML = '<div class="search-empty">Nenhum resultado para "' + this.escapeHtml(query) + '"</div>';
        } else {
          let html = "";

          if (pageResults.length) {
            html += '<div class="search-section-label">Páginas</div>';
            html += pageResults.map(p =>
              '<a href="#" class="search-result-item search-result-page" data-era="' + p.era + '">' +
                '<span class="search-result-type"><i data-lucide="layout-dashboard"></i></span>' +
                '<div class="search-result-info">' +
                  '<strong>' + this.highlightText(this.escapeHtml(p.title), query) + '</strong>' +
                  '<small>Página</small>' +
                '</div>' +
              '</a>'
            ).join("");
          }

          if (items.length) {
            if (pageResults.length) html += '<div class="search-section-label">Itens</div>';
            html += items.map(item => {
              const safeUrl = this.sanitizeUrl(item.url);
              const href = safeUrl || "#";
              const target = safeUrl ? ' target="_blank" rel="noopener noreferrer"' : '';
              return '<a href="' + href + '" class="search-result-item" data-id="' + item.id + '"' + target + '>' +
                '<span class="search-result-type">' + this.typeIcon(item.type) + '</span>' +
                '<div class="search-result-info">' +
                  '<strong>' + this.highlightText(this.escapeHtml(item.title), query) + '</strong>' +
                  '<small>' + this.escapeHtml(item.category) + (item.tags.length ? ' &middot; ' + this.escapeHtml(item.tags.join(", ")) : '') + '</small>' +
                '</div>' +
              '</a>';
            }).join("");
          }

          results.innerHTML = html;
        }
        results.classList.add("visible");
        if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      }, 200);
    });

    results.addEventListener("click", (e) => {
      const pageLink = e.target.closest(".search-result-page");
      if (pageLink) {
        e.preventDefault();
        this.navigateToEra(pageLink.dataset.era);
        results.classList.remove("visible");
        input.value = "";
        return;
      }

      const item = e.target.closest(".search-result-item");
      if (item && item.dataset.id) {
        const currentItem = Storage.getAll().find((entry) => entry.id === item.dataset.id);
        if (currentItem && currentItem.category === "folklore" && currentItem.type === "markdown") {
          e.preventDefault();
          this.navigateToEra("folklore");
          this.folkloreSelectedMarkdownId = currentItem.id;
          this.folkloreMarkdownViewMode = "preview";
          this.renderEra("folklore");
        }
        Storage.trackAccess(item.dataset.id);
        results.classList.remove("visible");
        input.value = "";
        this.renderDebutHighlights();
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search")) {
        results.classList.remove("visible");
      }
    });
  },

  highlightText(escaped, query) {
    if (!query) return escaped;
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>");
  },

  getAddItemTypeOptions(category) {
    // Folklore compartilha o modal global, mas expõe dois formatos de texto.
    const normalizedCategory = this.normalizeEra(category);
    if (normalizedCategory === "folklore") {
      return [
        { value: "note", label: "Nota" },
        { value: "markdown", label: "Markdown" }
      ];
    }

    return [
      { value: "link", label: "Link" },
      { value: "repo", label: "Repositorio" },
      { value: "playlist", label: "Playlist" },
      { value: "note", label: "Nota" }
    ];
  },

  syncAddItemTypeSelect(form, category, preferredType = "") {
    const typeField = form ? form.querySelector("#item-type") : null;
    if (!typeField) return "link";

    const options = this.getAddItemTypeOptions(category);
    const normalizedCategory = this.normalizeEra(category);
    const preferred = String(preferredType || "").trim().toLowerCase();
    const fallbackType = normalizedCategory === "folklore" ? "markdown" : "link";
    const nextType = options.some((option) => option.value === preferred) ? preferred : fallbackType;

    typeField.innerHTML = options
      .map((option) => '<option value="' + this.escapeHtml(option.value) + '">' + this.escapeHtml(option.label) + '</option>')
      .join("");
    typeField.value = nextType;
    return nextType;
  },

  updateAddItemTypeVisibility(form, typeValue) {
    if (!form) return;
    const nextType = String(typeValue || "").trim().toLowerCase();
    const textMode = nextType === "note" || nextType === "markdown";
    const urlGroup = form.querySelector(".field-url");
    const contentGroup = form.querySelector(".field-content");
    if (urlGroup) urlGroup.style.display = textMode ? "none" : "block";
    if (contentGroup) contentGroup.style.display = textMode ? "block" : "none";
  },

  // ===== MODAL =====
  // Fluxo de criacao de item: abrir modal, alternar campos e salvar no Storage.
  setupModal() {
    const modal = document.getElementById("modal-add-item");
    const form = document.getElementById("form-add-item");
    if (!modal || !form) return;

    modal.querySelector(".modal-close").addEventListener("click", () => {
      modal.classList.remove("visible");
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("visible");
    });

    const typeField = form.querySelector("#item-type");
    const categoryField = form.querySelector("#item-category");
    const syncTypeForCategory = (preferredType = "") => {
      const nextType = this.syncAddItemTypeSelect(form, categoryField ? categoryField.value : "", preferredType);
      this.updateAddItemTypeVisibility(form, nextType);
      return nextType;
    };

    if (typeField) {
      typeField.addEventListener("change", (e) => {
        this.updateAddItemTypeVisibility(form, e.target.value);
      });
    }

    if (categoryField) {
      categoryField.addEventListener("change", () => {
        syncTypeForCategory(typeField ? typeField.value : "");
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const category = form.querySelector("#item-category").value;
      const type = this.syncAddItemTypeSelect(form, category, form.querySelector("#item-type").value);
      const title = form.querySelector("#item-title").value.trim();
      const url = form.querySelector("#item-url").value.trim();
      const content = form.querySelector("#item-content").value.trim();
      const tagsRaw = form.querySelector("#item-tags").value.trim();
      const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];
      const pinned = form.querySelector("#item-pinned").checked;

      if (!title) return;

      // Red usa fluxo dedicado (nota/checklist), sem criacao generica via modal global.
      if (category === "red") return;

      Storage.addItem({ type, title, url, content, tags, pinned, category });
      form.reset();
      modal.classList.remove("visible");
      this.renderEra(category);
      this.renderDebutHighlights();
    });
  },

  openModal(era) {
    this.openPrefilledModal(era);
  },

  openPrefilledModal(era, preset = {}) {
    const targetEra = era || this.currentEra;
    if (targetEra === "red") {
      this.openCreateRedModal();
      return;
    }
    const modal = document.getElementById("modal-add-item");
    if (!modal) return;
    const select = modal.querySelector("#item-category");
    const form = document.getElementById("form-add-item");
    if (!form) return;
    const modalTitleEl = modal.querySelector(".modal-header h3");
    form.reset();
    if (select) select.value = targetEra;

    const typeField = form.querySelector("#item-type");
    const typeFieldGroup = typeField ? typeField.closest(".form-group") : null;
    const titleField = form.querySelector("#item-title");
    const urlField = form.querySelector("#item-url");
    const contentField = form.querySelector("#item-content");
    const tagsField = form.querySelector("#item-tags");
    // Cada era entra no modal com um tipo padrao coerente com seu fluxo principal.
    const defaultType = targetEra === "folklore" ? "markdown" : "link";
    const nextType = String(preset.type || defaultType).toLowerCase();
    const lockType = !!preset.lockType;
    const modalTitle = String(preset.modalTitle || (preset.title ? ("Adicionar " + preset.title) : "Novo Item"));

    if (modalTitleEl) modalTitleEl.textContent = modalTitle;
    if (typeField) {
      const resolvedType = this.syncAddItemTypeSelect(form, targetEra, nextType);
      typeField.value = resolvedType;
      typeField.disabled = lockType;
    }
    if (typeFieldGroup) {
      typeFieldGroup.style.display = lockType ? "none" : "block";
    }
    if (titleField) titleField.value = preset.title || "";
    if (urlField) urlField.value = preset.url || "";
    if (contentField) contentField.value = preset.content || "";
    if (tagsField) tagsField.value = Array.isArray(preset.tags) ? preset.tags.join(", ") : "";

    this.updateAddItemTypeVisibility(form, typeField ? typeField.value : nextType);
    modal.classList.add("visible");
  },

  setupAddButtons() {
    document.querySelectorAll(".btn-add-item").forEach(btn => {
      if (btn.id === "btn-upload-folklore-md") return;
      btn.addEventListener("click", () => this.openModal(btn.dataset.era));
    });
  },

  setupFolkloreMarkdownUpload() {
    const trigger = document.getElementById("btn-upload-folklore-md");
    const input = document.getElementById("input-upload-folklore-md");
    if (!trigger || !input) return;

    if (trigger.dataset.boundClick !== "1") {
      trigger.dataset.boundClick = "1";
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.click();
      });
    }

    if (input.dataset.boundChange !== "1") {
      input.dataset.boundChange = "1";
      input.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        this.importFolkloreMarkdownFile(file);
        event.target.value = "";
      });
    }
  },

  importFolkloreMarkdownFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String((ev.target && ev.target.result) || "");
      const inferredTitle = String(file.name || "Anotacao Markdown")
        .replace(/\.[^.]+$/, "")
        .trim();
      const created = Storage.addItem({
        type: "markdown",
        title: inferredTitle || "Anotacao Markdown",
        content: text,
        tags: ["markdown"],
        category: "folklore",
        pinned: false
      });
      this.folkloreSelectedMarkdownId = created.id;
      this.folkloreMarkdownViewMode = "split";
      this.folkloreMarkdownDraft = null;
      this.renderEra("folklore");
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
    };
    reader.readAsText(file, "utf-8");
  },

  openFolkloreMarkdownDocument(itemId) {
    if (!itemId) return;
    const item = Storage.getByCategory("folklore").find((entry) => entry.id === itemId && entry.type === "markdown");
    if (!item) return;
    this.folkloreSelectedMarkdownId = itemId;
    // Abrir um markdown tambem registra acesso para alimentar Debut e listas recentes.
    this.folkloreMarkdownViewMode = "preview";
    Storage.trackAccess(itemId);
    this.renderEra("folklore");
    this.renderDebutHighlights();
    if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
  },

  isFolkloreMarkdownEmpty(item, overrides = {}) {
    if (!item || String(item.type || "").toLowerCase() !== "markdown") return false;
    const title = String(overrides.title != null ? overrides.title : (item.title || "")).trim();
    const content = String(overrides.content != null ? overrides.content : (item.content || "")).trim();
    const normalizedTitle = title.toLowerCase();
    const hasCustomTitle = !!title && !["anotacao markdown", "anotacao", "documento markdown", "sem titulo"].includes(normalizedTitle);
    return !hasCustomTitle && !content;
  },

  cleanupFolkloreEmptyMarkdown(exceptId = "") {
    const removable = Storage.getByCategory("folklore").filter((item) => {
      if (item.id === exceptId) return false;
      return String(item.type || "").toLowerCase() === "markdown" && this.isFolkloreMarkdownEmpty(item);
    });

    if (!removable.length) return false;

    removable.forEach((item) => Storage.deleteItem(item.id));

    if (removable.some((item) => item.id === this.folkloreSelectedMarkdownId)) {
      this.folkloreSelectedMarkdownId = "";
      this.folkloreMarkdownDraft = null;
      clearTimeout(this.folkloreMarkdownSaveTimer);
    }

    this.renderDebutHighlights();
    if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
    return true;
  },

  getFolkloreMarkdownEditorState(itemId) {
    const selected = Storage.getAll().find((item) => item.id === itemId && item.type === "markdown");
    if (!selected) return null;

    const container = document.getElementById("items-folklore");
    const titleInput = this.folkloreSelectedMarkdownId === itemId && container
      ? container.querySelector(".folklore-md-title-input")
      : null;
    const editor = this.folkloreSelectedMarkdownId === itemId && container
      ? container.querySelector(".folklore-md-editor")
      : null;

    return {
      selected,
      rawTitle: titleInput ? String(titleInput.value || "").trim() : String(selected.title || "").trim(),
      content: editor ? String(editor.value || "") : String(selected.content || "")
    };
  },

  commitFolkloreMarkdownDocument(itemId, options = {}) {
    if (!itemId) return false;
    const state = this.getFolkloreMarkdownEditorState(itemId);
    if (!state) return false;

    const closeAfter = !!options.closeAfter;
    const { selected, rawTitle, content } = state;

    this.folkloreMarkdownDraft = null;
    clearTimeout(this.folkloreMarkdownSaveTimer);

    // Markdown vazio volta a ser descartavel para evitar rascunhos sem conteudo.
    if (this.isFolkloreMarkdownEmpty(selected, { title: rawTitle, content })) {
      Storage.deleteItem(itemId);
      if (this.folkloreSelectedMarkdownId === itemId) {
        this.folkloreSelectedMarkdownId = "";
      }
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
      this.renderEra("folklore");
      return false;
    }

    const nextTitle = rawTitle || "Sem titulo";
    const currentTitle = String(selected.title || "");
    const currentContent = String(selected.content || "");
    const hasChanges = nextTitle !== currentTitle || content !== currentContent;

    if (hasChanges) {
      Storage.updateItem(itemId, {
        title: nextTitle,
        content,
        updatedAt: new Date().toISOString()
      });
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
    }

    if (closeAfter && this.folkloreSelectedMarkdownId === itemId) {
      this.folkloreSelectedMarkdownId = "";
    }

    this.renderEra("folklore");
    return true;
  },

  closeFolkloreMarkdownDocument() {
    const itemId = this.folkloreSelectedMarkdownId;
    if (itemId) {
      this.commitFolkloreMarkdownDocument(itemId, { closeAfter: true });
      return;
    }
    this.folkloreMarkdownDraft = null;
    clearTimeout(this.folkloreMarkdownSaveTimer);
    this.renderEra("folklore");
  },

  persistFolkloreMarkdownDraft(itemId, updates) {
    const selected = Storage.getAll().find((item) => item.id === itemId);
    if (!selected || selected.type !== "markdown") return;

    const nextTitle = String(updates && updates.title ? updates.title : "").trim() || "Sem titulo";
    const nextContent = String(updates && updates.content ? updates.content : "");
    const currentTitle = String(selected.title || "");
    const currentContent = String(selected.content || "");

    if (nextTitle === currentTitle && nextContent === currentContent) {
      this.folkloreMarkdownDraft = null;
      clearTimeout(this.folkloreMarkdownSaveTimer);
      return;
    }

    this.folkloreMarkdownDraft = { id: itemId, title: nextTitle, content: nextContent };
    clearTimeout(this.folkloreMarkdownSaveTimer);
    this.folkloreMarkdownSaveTimer = setTimeout(() => {
      if (!this.folkloreMarkdownDraft || this.folkloreMarkdownDraft.id !== itemId) return;

      const latest = Storage.getAll().find((item) => item.id === itemId);
      if (!latest || latest.type !== "markdown") return;
      const latestTitle = String(latest.title || "");
      const latestContent = String(latest.content || "");
      if (this.folkloreMarkdownDraft.title === latestTitle && this.folkloreMarkdownDraft.content === latestContent) {
        this.folkloreMarkdownDraft = null;
        return;
      }

      Storage.updateItem(itemId, {
        title: this.folkloreMarkdownDraft.title,
        content: this.folkloreMarkdownDraft.content,
        updatedAt: new Date().toISOString()
      });
      const meta = document.querySelector("#items-folklore .folklore-md-meta");
      if (meta && this.folkloreSelectedMarkdownId === itemId) {
        const stamp = new Date();
        meta.textContent = "Atualizado em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
      this.folkloreMarkdownDraft = null;
    }, 350);
  },

  renderFolkloreMarkdownEditor(container, item) {
    const safeTitle = this.escapeHtml(String(item.title || "Documento Markdown"));
    const contentValue = String(item.content || "");
    const safeContent = this.escapeHtml(contentValue);
    const stamp = new Date(item.updatedAt || item.createdAt || Date.now());
    const dateLabel = Number.isNaN(stamp.getTime())
      ? ""
      : "Atualizado em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    container.innerHTML =
      '<section class="folklore-md-shell">' +
        '<header class="folklore-md-topbar">' +
          '<button type="button" class="folklore-md-back-btn"><i data-lucide="arrow-left"></i> Voltar</button>' +
          '<input type="text" class="folklore-md-title-input" value="' + safeTitle + '" maxlength="120" />' +
          '<div class="folklore-md-toolbar-actions">' +
            '<button type="button" class="folklore-md-mode-btn ' + (this.folkloreMarkdownViewMode === "preview" ? "active" : "") + '" data-mode="preview">Preview</button>' +
            '<button type="button" class="folklore-md-mode-btn ' + (this.folkloreMarkdownViewMode === "split" ? "active" : "") + '" data-mode="split">Editar</button>' +
            '<button type="button" class="folklore-md-upload-btn"><i data-lucide="upload"></i> Upload .md</button>' +
            '<button type="button" class="folklore-md-save-btn"><i data-lucide="save"></i> Salvar</button>' +
            '<button type="button" class="folklore-md-delete-btn"><i data-lucide="trash-2"></i></button>' +
          '</div>' +
        '</header>' +
        '<small class="folklore-md-meta">' + this.escapeHtml(dateLabel) + '</small>' +
        '<input type="file" class="folklore-md-file-input" accept=".md,.txt,text/markdown,text/plain" />' +
        '<div class="folklore-md-layout ' + (this.folkloreMarkdownViewMode === "split" ? "is-split" : "is-preview") + '">' +
          '<textarea class="folklore-md-editor" spellcheck="false">' + safeContent + '</textarea>' +
          '<article class="folklore-markdown-body markdown-body"></article>' +
        '</div>' +
      '</section>';

    const backBtn = container.querySelector(".folklore-md-back-btn");
    const modeButtons = container.querySelectorAll(".folklore-md-mode-btn");
    const uploadBtn = container.querySelector(".folklore-md-upload-btn");
    const saveBtn = container.querySelector(".folklore-md-save-btn");
    const deleteBtn = container.querySelector(".folklore-md-delete-btn");
    const fileInput = container.querySelector(".folklore-md-file-input");
    const titleInput = container.querySelector(".folklore-md-title-input");
    const editor = container.querySelector(".folklore-md-editor");
    const preview = container.querySelector(".folklore-markdown-body");
    const layout = container.querySelector(".folklore-md-layout");

    if (!titleInput || !editor || !preview || !layout || !fileInput) return;

    const renderPreview = () => {
      preview.innerHTML = this.renderMarkdownHtml(editor.value);
      this.decorateMarkdownLinks(preview);
    };

    const setMode = (mode) => {
      this.folkloreMarkdownViewMode = mode === "split" ? "split" : "preview";
      layout.classList.toggle("is-split", this.folkloreMarkdownViewMode === "split");
      layout.classList.toggle("is-preview", this.folkloreMarkdownViewMode !== "split");
      modeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === this.folkloreMarkdownViewMode));
    };

    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setMode(btn.dataset.mode || "preview");
      });
    });

    titleInput.addEventListener("input", () => {
      this.persistFolkloreMarkdownDraft(item.id, {
        title: String(titleInput.value || "").trim() || "Sem titulo",
        content: String(editor.value || "")
      });
    });

    editor.addEventListener("input", () => {
      renderPreview();
      this.persistFolkloreMarkdownDraft(item.id, {
        title: String(titleInput.value || "").trim() || "Sem titulo",
        content: String(editor.value || "")
      });
    });

    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String((ev.target && ev.target.result) || "");
        if (!String(titleInput.value || "").trim()) {
          titleInput.value = String(file.name || "Anotacao").replace(/\.[^.]+$/, "");
        }
        editor.value = text;
        renderPreview();
        setMode("split");
      };
      reader.readAsText(file, "utf-8");
      event.target.value = "";
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this.commitFolkloreMarkdownDocument(item.id);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.openDeleteNoteModal(item.id, { era: "folklore", clearRedSelection: false });
      });
    }
    if (backBtn) backBtn.addEventListener("click", () => this.closeFolkloreMarkdownDocument());

    renderPreview();
    setMode(this.folkloreMarkdownViewMode);
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  // ===== RENDER ERA PAGES =====
  // Renderizacao dos conteudos por era, incluindo tags e estados vazios.
  renderAllEras() {
    this.updateQuickFilterTags();
    ["fearless", "speak-now", "red", "1989", "reputation", "lover", "folklore"].forEach(era => this.renderEra(era));
  },

  renderEra(era) {
    const container = document.getElementById("items-" + era);
    const tagsContainer = document.getElementById("tags-" + era);
    if (!container) return;

    // A era Fearless possui um layout de card diferente (estilo repositorio principal).
    container.classList.toggle("fearless-layout", era === "fearless");

    let items = this.applyQuickFilters(Storage.getByCategory(era));

    if (era === "red") {
      this.ensureRedFilterTabs(tagsContainer);
      const redItems = Storage.getByCategory("red").filter((item) => item.type === "note" || item.type === "checklist");
      this.renderRedNotes(redItems);
      items = items.filter((item) => item.type !== "note" && item.type !== "checklist");
    }

    if (era === "folklore") {
      this.cleanupFolkloreEmptyMarkdown(this.folkloreSelectedMarkdownId);
      items = this.applyQuickFilters(Storage.getByCategory(era));
    }

    // Quando um markdown esta aberto, o container vira um reader/editor dedicado.
    if (era === "folklore" && this.folkloreSelectedMarkdownId) {
      const selectedMarkdown = Storage.getByCategory("folklore")
        .find((item) => item.id === this.folkloreSelectedMarkdownId && item.type === "markdown");
      if (selectedMarkdown) {
        this.renderFolkloreMarkdownEditor(container, selectedMarkdown);
        return;
      }
      this.folkloreSelectedMarkdownId = "";
    }

    if (era === "fearless" && items.length === 0) {
      Storage.ensureFearlessDefaults();
      items = this.applyQuickFilters(Storage.getByCategory(era));
    }

    const allEraItems = [...items];
    const eraTags = [...new Set(allEraItems.flatMap((item) => item.tags || []))].sort();

    if (this.currentTagFilter && !eraTags.includes(this.currentTagFilter)) {
      this.currentTagFilter = null;
    }

    // Filtro de tags aplicado apenas quando ha uma tag ativa.
    if (this.currentTagFilter && tagsContainer) {
      items = items.filter(i => i.tags.includes(this.currentTagFilter));
    }

    // Mantem itens fixados no topo da lista.
    items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    // Renderiza barra de tags (com contagem especial na era Fearless).
    if (tagsContainer && era !== "red") {
      if (era === "fearless") {
        const contagemPorTag = {};
        allEraItems.forEach(item => {
          (item.tags || []).forEach(tag => {
            contagemPorTag[tag] = (contagemPorTag[tag] || 0) + 1;
          });
        });
        const buttons = ['<button class="tag-btn ' + (!this.currentTagFilter ? "active" : "") + '" data-tag="__all__">Todos</button>'];
        eraTags.forEach(tag => {
          const count = contagemPorTag[tag] || 0;
          buttons.push('<button class="tag-btn ' + (this.currentTagFilter === tag ? "active" : "") + '" data-tag="' + this.escapeHtml(tag) + '">' + this.escapeHtml(tag) + ' <small>(' + count + ')</small></button>');
        });
        tagsContainer.innerHTML = buttons.join("");
      } else {
        const buttons = ['<button class="tag-btn ' + (!this.currentTagFilter ? "active" : "") + '" data-tag="__all__">Todos</button>'];
        eraTags.forEach(tag => {
          buttons.push('<button class="tag-btn ' + (this.currentTagFilter === tag ? "active" : "") + '" data-tag="' + this.escapeHtml(tag) + '">' + this.escapeHtml(tag) + '</button>');
        });
        tagsContainer.innerHTML = buttons.join("");
      }
      tagsContainer.querySelectorAll(".tag-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          if (btn.dataset.tag === "__all__") {
            this.currentTagFilter = null;
          } else if (era === "fearless") {
            this.currentTagFilter = btn.dataset.tag;
          } else {
            this.currentTagFilter = this.currentTagFilter === btn.dataset.tag ? null : btn.dataset.tag;
          }
          this.renderEra(era);
        });
      });
    }

    // Render final dos cards da era (com fallback de estado vazio).
    if (items.length === 0) {
      if (era === "red") {
        container.innerHTML = "";
        return;
      }

      const emptyStateByEra = {
        fearless: {
          icon: "folder-git-2",
          title: "Seus repositorios favoritos ficam aqui",
          subtitle: "Projetos fixos, referencias de codigo e coisas que voce quer abrir rapido",
          cta: "+ Adicionar repositorio",
          suggestions: [
            { label: "GitHub", type: "repo", title: "GitHub Repo", url: "https://github.com/", tags: ["codigo"], modalTitle: "Adicionar repositório", lockType: true },
            { label: "GitLab", type: "repo", title: "GitLab Repo", url: "https://gitlab.com/", tags: ["codigo"], modalTitle: "Adicionar repositório", lockType: true },
            { label: "Bitbucket", type: "repo", title: "Bitbucket Repo", url: "https://bitbucket.org/", tags: ["codigo"], modalTitle: "Adicionar repositório", lockType: true }
          ]
        },
        "speak-now": {
          icon: "music-4",
          title: "Suas musicas e playlists entram aqui",
          subtitle: "Spotify, Apple Music, YouTube Music e links que merecem replay",
          cta: "+ Adicionar playlist",
          suggestions: [
            { label: "Spotify", type: "playlist", title: "Spotify", url: "https://open.spotify.com/", tags: ["playlist"], modalTitle: "Adicionar Spotify", lockType: true },
            { label: "Apple Music", type: "playlist", title: "Apple Music", url: "https://music.apple.com/", tags: ["playlist"], modalTitle: "Adicionar Apple Music", lockType: true },
            { label: "YouTube Music", type: "playlist", title: "YouTube Music", url: "https://music.youtube.com/", tags: ["playlist"], modalTitle: "Adicionar YouTube Music", lockType: true }
          ]
        },
        "1989": {
          icon: "briefcase",
          title: "Suas ferramentas ficam aqui",
          subtitle: "Figma, Notion, Linear, VS Code web...",
          cta: "+ Adicionar ferramenta",
          suggestions: [
            { label: "Figma", title: "Figma", url: "https://www.figma.com/", tags: ["design"], modalTitle: "Adicionar Figma", lockType: true },
            { label: "Notion", title: "Notion", url: "https://www.notion.so/", tags: ["gestao"], modalTitle: "Adicionar Notion", lockType: true },
            { label: "Linear", title: "Linear", url: "https://linear.app/", tags: ["dev"], modalTitle: "Adicionar Linear", lockType: true }
          ]
        },
        lover: {
          icon: "heart",
          title: "Seus cantos favoritos da internet",
          subtitle: "Os sites que voce abre so pra relaxar",
          cta: "+ Adicionar favorito",
          suggestions: [
            { label: "Netflix", title: "Netflix", url: "https://www.netflix.com/", tags: ["streaming"], modalTitle: "Adicionar Netflix", lockType: true },
            { label: "YouTube", title: "YouTube", url: "https://www.youtube.com/", tags: ["video"], modalTitle: "Adicionar YouTube", lockType: true },
            { label: "Twitter/X", title: "Twitter/X", url: "https://x.com/", tags: ["social"], modalTitle: "Adicionar Twitter/X", lockType: true }
          ]
        },
        folklore: {
          icon: "book-open",
          title: "Leituras para quando tiver tempo",
          subtitle: "Artigos, docs, threads, referencias",
          cta: "+ Salvar leitura",
          suggestions: [
            { label: "dev.to", title: "dev.to", url: "https://dev.to/", tags: ["leitura"], modalTitle: "Salvar dev.to", lockType: true },
            { label: "Medium", title: "Medium", url: "https://medium.com/", tags: ["leitura"], modalTitle: "Salvar Medium", lockType: true },
            { label: "MDN", title: "MDN", url: "https://developer.mozilla.org/", tags: ["docs"], modalTitle: "Salvar MDN", lockType: true }
          ]
        },
        reputation: {
          icon: "link-2",
          title: "Seus links essenciais ficam aqui",
          subtitle: "Portfolios, redes, docs e atalhos que voce abre o tempo todo",
          cta: "+ Adicionar link",
          suggestions: [
            { label: "GitHub", type: "link", title: "GitHub", url: "https://github.com/", tags: ["perfil"], modalTitle: "Adicionar GitHub", lockType: true },
            { label: "LinkedIn", type: "link", title: "LinkedIn", url: "https://www.linkedin.com/", tags: ["social"], modalTitle: "Adicionar LinkedIn", lockType: true },
            { label: "Portfólio", type: "link", title: "Portfólio", url: "https://", tags: ["portfolio"], modalTitle: "Adicionar Portfólio", lockType: true }
          ]
        }
      };

      const emptyCfg = emptyStateByEra[era] || {
        icon: "inbox",
        title: "Nenhum item nessa era ainda.",
        subtitle: 'Clique em "+ Novo Item" para adicionar.',
        cta: "+ Novo Item"
      };
      const eraKey = this.normalizeEra(era);
      const chipsMarkup = Array.isArray(emptyCfg.suggestions) && emptyCfg.suggestions.length
        ? '<div class="era-empty-chips">' + emptyCfg.suggestions.map((chip) =>
            '<button type="button" class="era-empty-chip" data-type="' + this.escapeHtml(chip.type || "link") + '" data-title="' + this.escapeHtml(chip.title || chip.label || "") + '" data-url="' + this.escapeHtml(chip.url || "") + '" data-tags="' + this.escapeHtml((chip.tags || []).join(",")) + '" data-modal-title="' + this.escapeHtml(chip.modalTitle || "") + '" data-lock-type="' + (chip.lockType ? "1" : "0") + '">' + this.escapeHtml(chip.label || "") + '</button>'
          ).join("") + '</div>'
        : "";

      container.innerHTML =
        '<div class="era-empty era-empty--' + this.escapeHtml(eraKey) + '">' +
          '<div class="era-empty-icon"><i data-lucide="' + emptyCfg.icon + '"></i></div>' +
          '<p>' + this.escapeHtml(emptyCfg.title) + '</p>' +
          '<small>' + this.escapeHtml(emptyCfg.subtitle) + '</small>' +
          chipsMarkup +
          '<button type="button" class="btn-add-item era-empty-cta" data-era="' + this.escapeHtml(era) + '">' + this.escapeHtml(emptyCfg.cta) + '</button>' +
        '</div>';

      const emptyCta = container.querySelector(".era-empty-cta");
      if (emptyCta) {
        emptyCta.addEventListener("click", () => {
          const safeEra = (window.CSS && typeof window.CSS.escape === "function") ? window.CSS.escape(era) : era;
          const addBtn = document.querySelector('#page-' + safeEra + ' .btn-add-item[data-era="' + safeEra + '"]');
          if (addBtn) {
            addBtn.click();
          } else {
            this.openModal(era);
          }
        });
      }

      container.querySelectorAll(".era-empty-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const tags = String(chip.dataset.tags || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          this.openPrefilledModal(era, {
            type: String(chip.dataset.type || "link").trim().toLowerCase() || "link",
            title: String(chip.dataset.title || "").trim(),
            url: String(chip.dataset.url || "").trim(),
            tags,
            modalTitle: String(chip.dataset.modalTitle || "").trim(),
            lockType: chip.dataset.lockType === "1"
          });
        });
      });

      if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      return;
    }

    const draggableAttr = era === "folklore" ? "false" : "true";
    container.innerHTML = items.map(item => {
      const safeUrl = this.sanitizeUrl(item.url);
      const isFearlessRepoItem = String(item.type || "").toLowerCase() === "repo"
        || /^https?:\/\/github\.com\//i.test(String(item.url || ""));
      if (era === "fearless" && isFearlessRepoItem) {
        return this.renderFearlessRepoCard(item, safeUrl);
      }
      if (era === "folklore" && item.type === "markdown") {
        return this.renderFolkloreMarkdownCard(item);
      }
      if (era === "speak-now" && /(?:open\.spotify\.com|^spotify:)/i.test(String(item.url || ""))) {
        const widget = this.renderSpeakNowPlaylistWidget(item, safeUrl);
        if (widget) return widget;
      }
      return '<div class="item-card ' + (item.pinned ? "pinned" : "") + '" draggable="' + draggableAttr + '" data-id="' + item.id + '">' +
        '<div class="item-card-header">' +
          '<span class="item-type-icon">' + this.typeIcon(item.type) + '</span>' +
          '<div class="item-card-actions">' +
            (item.pinned ? '<span class="pin-indicator"><i data-lucide="pin"></i></span>' : '') +
            '<button class="item-btn-pin" data-id="' + item.id + '" title="' + (item.pinned ? "Desafixar" : "Fixar") + '">' +
              '<i data-lucide="' + (item.pinned ? 'pin-off' : 'pin') + '"></i>' +
            '</button>' +
            '<button class="item-btn-delete" data-id="' + item.id + '" title="Excluir"><i data-lucide="trash-2"></i></button>' +
          '</div>' +
        '</div>' +
        '<strong class="item-title">' + this.escapeHtml(item.title) + '</strong>' +
        (safeUrl ? '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="item-url" data-id="' + item.id + '">' + this.escapeHtml(this.formatHost(item.url)) + '</a>' : '') +
        (item.content ? '<p class="item-content-preview">' + this.escapeHtml(item.content.slice(0, 100)) + (item.content.length > 100 ? "..." : "") + '</p>' : '') +
        (item.tags.length ? '<div class="item-tags">' + item.tags.map(t => '<span class="item-tag" data-tag="' + this.escapeHtml(t) + '">' + this.escapeHtml(t) + '</span>').join("") + '</div>' : '') +
        '<div class="item-meta"><span>' + (item.accessCount || 0) + ' acessos</span></div>' +
      '</div>';
    }).join("");

    this.setupItemEvents(container, era);
    this.setupDragDrop(container, era);
    if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
  },

  ensureRedFilterTabs(tagsContainer) {
    if (!tagsContainer) return;

    const expectedMarkup = [
      '<button type="button" class="tag-btn" id="red-notes-filter-all" data-filter="all">Todos</button>',
      '<button type="button" class="tag-btn" id="red-notes-filter-notes" data-filter="notes">Notas</button>',
      '<button type="button" class="tag-btn" id="red-notes-filter-checklists" data-filter="checklists">Checklist</button>'
    ].join("");

    const hasAll = !!tagsContainer.querySelector("#red-notes-filter-all");
    const hasNotes = !!tagsContainer.querySelector("#red-notes-filter-notes");
    const hasChecklists = !!tagsContainer.querySelector("#red-notes-filter-checklists");

    if (!hasAll || !hasNotes || !hasChecklists) {
      tagsContainer.innerHTML = expectedMarkup;
    }

    const activeFilter = this.redNotesFilter || "all";
    tagsContainer.querySelectorAll(".tag-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === activeFilter);
    });
  },
  setupRedNotes() {
    const searchInput = document.getElementById("red-notes-search");
    const newBtn = document.getElementById("red-notes-new-btn");
    const list = document.getElementById("red-notes-list");
    const titleInput = document.getElementById("red-note-title");
    const contentInput = document.getElementById("red-note-content");
    const saveBtn = document.getElementById("red-note-save-btn");
    const deleteBtn = document.getElementById("red-note-delete-btn");
    const checklistSaveBtn = document.getElementById("red-checklist-save-btn");
    const noteBackBtn = document.getElementById("red-note-back-btn");
    const checklistBackBtn = document.getElementById("red-checklist-back-btn");
    const previewModeBtn = document.getElementById("red-note-mode-preview");
    const splitModeBtn = document.getElementById("red-note-mode-split");

    if (!searchInput || !newBtn || !list || !titleInput || !contentInput || !saveBtn || !deleteBtn || !checklistSaveBtn) return;
    if (list.dataset.boundRedNotes === "1") return;
    list.dataset.boundRedNotes = "1";

    searchInput.addEventListener("input", () => {
      this.redNotesQuery = String(searchInput.value || "").trim().toLowerCase();
      this.renderRedNotes();
    });

    newBtn.addEventListener("click", () => this.openCreateRedModal());

    const viewListBtn = document.getElementById("red-notes-view-list");
    const viewGridBtn = document.getElementById("red-notes-view-grid");
    const viewGrid3x3Btn = document.getElementById("red-notes-view-grid-3x3");
    const updateViewMode = (mode) => {
      this.redNotesViewMode = mode;
      this.renderRedNotes();
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    };
    if (viewListBtn) {
      viewListBtn.addEventListener("click", () => updateViewMode("list"));
    }
    if (viewGridBtn) {
      viewGridBtn.addEventListener("click", () => updateViewMode("grid"));
    }
    if (viewGrid3x3Btn) {
      viewGrid3x3Btn.addEventListener("click", () => updateViewMode("grid-3x3"));
    }

    const tagsContainer = document.getElementById("tags-red");
    this.ensureRedFilterTabs(tagsContainer);
    if (tagsContainer && tagsContainer.dataset.boundRedFilters !== "1") {
      tagsContainer.dataset.boundRedFilters = "1";
      tagsContainer.addEventListener("click", (event) => {
        const btn = event.target.closest(".tag-btn[data-filter]");
        if (!btn) return;
        this.redNotesFilter = btn.dataset.filter || "all";
        this.ensureRedFilterTabs(tagsContainer);
        this.renderRedNotes();
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      });
    }

    list.addEventListener("click", (event) => {
      const pinBtn = event.target.closest(".red-note-pin-btn");
      if (pinBtn && pinBtn.dataset.id) {
        event.preventDefault();
        event.stopPropagation();
        const current = Storage.getAll().find((entry) => entry.id === pinBtn.dataset.id);
        if (!current) return;
        Storage.updateItem(pinBtn.dataset.id, {
          pinned: !current.pinned,
          pinnedAt: !current.pinned ? new Date().toISOString() : ""
        });
        this.renderRedNotes();
        this.renderDebutHighlights();
        if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
        return;
      }

      const item = event.target.closest(".red-note-list-item");
      if (!item || !item.dataset.id) return;
      this.redSelectedNoteId = item.dataset.id;
      Storage.trackAccess(this.redSelectedNoteId);
      this.renderRedNotes();
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
    });

    saveBtn.addEventListener("click", () => {
      this.saveRedSelectedNote();
    });

    checklistSaveBtn.addEventListener("click", () => {
      this.saveRedSelectedChecklist();
    });

    const scheduleRedAutosave = () => {
      const noteId = this.redSelectedNoteId;
      if (!noteId) return;
      const selected = Storage.getAll().find((item) => item.id === noteId);
      if (!selected || selected.type !== "note") return;
      this.persistRedNoteDraft(noteId, {
        title: String(titleInput.value || "").trim() || "Sem título",
        content: String(contentInput.value || "")
      });
    };

    if (previewModeBtn && splitModeBtn) {
      previewModeBtn.addEventListener("click", () => this.setRedNoteViewMode("preview"));
      splitModeBtn.addEventListener("click", () => this.setRedNoteViewMode("split"));
    }

    titleInput.addEventListener("input", scheduleRedAutosave);
    contentInput.addEventListener("input", () => {
      this.renderRedNotePreview(String(contentInput.value || ""));
      scheduleRedAutosave();
    });

    deleteBtn.addEventListener("click", () => {
      if (!this.redSelectedNoteId) return;
      this.openDeleteNoteModal(this.redSelectedNoteId);
    });

    if (noteBackBtn) {
      noteBackBtn.addEventListener("click", () => {
        this.redSelectedNoteId = "";
        this.redNoteDraft = null;
        clearTimeout(this.redNoteSaveTimer);
        this.renderRedNotes();
      });
    }

    if (checklistBackBtn) {
      checklistBackBtn.addEventListener("click", () => {
        this.redSelectedNoteId = "";
        this.renderRedNotes();
      });
    }

    this.setRedNoteViewMode(this.redNoteViewMode);
    this.renderRedNotePreview(String(contentInput.value || ""));
    this.setupCreateRedModal();
  },

  setupDeleteNoteModal() {
    if (document.body.dataset.boundDeleteNoteModal === "1") return;
    document.body.dataset.boundDeleteNoteModal = "1";

    document.body.addEventListener("click", (e) => {
      const modal = document.getElementById("modal-delete-note");
      if (!modal || !modal.classList.contains("visible")) return;

      const target = e.target;
      const isClose = target.id === "modal-delete-note-close" || target.closest("#modal-delete-note-close");
      const isCancel = target.id === "modal-delete-note-cancel" || target.closest("#modal-delete-note-cancel");
      const isConfirm = target.id === "modal-delete-note-confirm" || target.closest("#modal-delete-note-confirm");
      const isOverlay = target === modal;

      if (isClose || isCancel || isOverlay) {
        e.preventDefault();
        App.pendingDeleteNoteId = null;
        App.pendingDeleteContext = null;
        modal.classList.remove("visible");
        return;
      }

      if (isConfirm) {
        e.preventDefault();
        const fallbackId = App.pendingDeleteNoteId;
        const ctx = App.pendingDeleteContext || (fallbackId ? { itemId: fallbackId, era: "red", clearRedSelection: true } : null);

        if (ctx && ctx.itemId) {
          Storage.deleteItem(ctx.itemId);

          if (ctx.era === "red" || ctx.clearRedSelection) {
            App.redSelectedNoteId = "";
            App.redNoteDraft = null;
            App.renderRedNotes();
            App.renderEra("red");
          } else if (ctx.era === "folklore") {
            App.folkloreSelectedMarkdownId = "";
            App.folkloreMarkdownDraft = null;
            App.renderEra("folklore");
          } else if (ctx.era) {
            App.renderEra(ctx.era);
          }

          if (typeof App.renderAllEras === "function") {
            App.renderAllEras();
          }
          App.renderDebutHighlights();
          if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
        }

        App.pendingDeleteNoteId = null;
        App.pendingDeleteContext = null;
        modal.classList.remove("visible");
      }
    });
  },

  openDeleteNoteModal(noteId, options = {}) {
    if (!noteId) return;

    const fromItem = (typeof Storage !== "undefined" && typeof Storage.getAll === "function")
      ? Storage.getAll().find((entry) => entry.id === noteId)
      : null;
    const era = options.era || this.normalizeEra((fromItem && fromItem.category) || this.currentEra || "debut");

    App.pendingDeleteNoteId = noteId;
    App.pendingDeleteContext = {
      itemId: noteId,
      era,
      clearRedSelection: !!options.clearRedSelection
    };

    const modal = document.getElementById("modal-delete-note");
    if (modal) {
      modal.classList.add("visible");
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  setupCreateRedModal() {
    if (document.body.dataset.boundCreateRedModal === "1") return;
    document.body.dataset.boundCreateRedModal = "1";

    document.body.addEventListener("click", (e) => {
      const modal = document.getElementById("modal-create-red");
      if (!modal || !modal.classList.contains("visible")) return;

      const target = e.target;
      const isClose = target.id === "modal-create-red-close" || target.closest("#modal-create-red-close");
      const isOverlay = target === modal;
      const isNoteCard = target.id === "modal-create-red-note" || target.closest("#modal-create-red-note");
      const isChecklistCard = target.id === "modal-create-red-checklist" || target.closest("#modal-create-red-checklist");

      if (isClose || isOverlay) {
        modal.classList.remove("visible");
        return;
      }
      if (isNoteCard) {
        e.preventDefault();
        modal.classList.remove("visible");
        App.createRedNote();
        setTimeout(() => {
          const el = document.getElementById("red-note-title");
          if (el) el.focus();
        }, 100);
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        return;
      }
      if (isChecklistCard) {
        e.preventDefault();
        modal.classList.remove("visible");
        App.createRedChecklist();
        setTimeout(() => {
          const el = document.getElementById("red-checklist-title");
          if (el) el.focus();
        }, 100);
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      }
    });
  },

  openCreateRedModal() {
    const modal = document.getElementById("modal-create-red");
    if (modal) {
      modal.classList.add("visible");
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  persistRedNoteDraft(noteId, updates) {
    const selected = Storage.getAll().find((item) => item.id === noteId);
    if (!selected || selected.type !== "note") return;

    const nextTitle = String(updates && updates.title ? updates.title : "").trim() || "Sem título";
    const nextContent = String(updates && updates.content ? updates.content : "");
    const currentTitle = String(selected.title || "");
    const currentContent = String(selected.content || "");

    if (nextTitle === currentTitle && nextContent === currentContent) {
      this.redNoteDraft = null;
      clearTimeout(this.redNoteSaveTimer);
      return;
    }

    this.redNoteDraft = { id: noteId, title: nextTitle, content: nextContent };
    clearTimeout(this.redNoteSaveTimer);
    this.redNoteSaveTimer = setTimeout(() => {
      if (!this.redNoteDraft || this.redNoteDraft.id !== noteId) return;

      const latest = Storage.getAll().find((item) => item.id === noteId);
      if (!latest || latest.type !== "note") return;
      const latestTitle = String(latest.title || "");
      const latestContent = String(latest.content || "");
      if (this.redNoteDraft.title === latestTitle && this.redNoteDraft.content === latestContent) {
        this.redNoteDraft = null;
        return;
      }

      Storage.updateItem(noteId, {
        title: this.redNoteDraft.title,
        content: this.redNoteDraft.content,
        updatedAt: new Date().toISOString()
      });
      const meta = document.getElementById("red-note-meta");
      if (meta) {
        const stamp = new Date();
        meta.textContent = "Atualizada em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
      this.redNoteDraft = null;
    }, 350);
  },

  saveRedSelectedNote() {
    const noteId = this.redSelectedNoteId;
    if (!noteId) return;
    this.redNoteDraft = null;
    clearTimeout(this.redNoteSaveTimer);
    const selected = Storage.getAll().find((item) => item.id === noteId);
    if (!selected || selected.type !== "note") return;

    const titleInput = document.getElementById("red-note-title");
    const contentInput = document.getElementById("red-note-content");
    if (!titleInput || !contentInput) return;

    const nextTitle = String(titleInput.value || "").trim();
    const nextContent = String(contentInput.value || "");

    if (this.isRedItemEmpty(selected, { title: nextTitle, content: nextContent })) {
      Storage.deleteItem(noteId);
      this.redSelectedNoteId = "";
      this.renderRedNotes();
      this.renderEra("red");
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
      return;
    }

    Storage.updateItem(noteId, {
      title: nextTitle || "Sem título",
      content: nextContent,
      updatedAt: new Date().toISOString()
    });
    this.renderRedNotes();
    this.renderDebutHighlights();
    if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
  },

  saveRedSelectedChecklist() {
    const noteId = this.redSelectedNoteId;
    if (!noteId) return;
    const selected = Storage.getAll().find((item) => item.id === noteId);
    if (!selected || selected.type !== "checklist") return;

    const titleInput = document.getElementById("red-checklist-title");
    const container = document.getElementById("red-checklist-items");
    if (!titleInput || !container) return;

    const items = [];
    container.querySelectorAll(".red-checklist-item").forEach((row, idx) => {
      const check = row.querySelector(".red-checklist-item-check");
      const text = row.querySelector(".red-checklist-item-text");
      items.push({
        id: "i-" + idx,
        text: text && text.value ? String(text.value) : "",
        completed: !!(check && check.checked)
      });
    });

    const nextTitle = String(titleInput.value || "").trim();
    if (this.isRedItemEmpty(selected, { title: nextTitle, checklistItems: items })) {
      Storage.deleteItem(noteId);
      this.redSelectedNoteId = "";
      this.renderRedNotes();
      this.renderEra("red");
      this.renderDebutHighlights();
      if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
      return;
    }

    Storage.updateItem(noteId, {
      title: nextTitle || "Checklist",
      checklistItems: items,
      updatedAt: new Date().toISOString()
    });
    this.renderRedNotes();
    this.renderDebutHighlights();
    if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
  },

  createRedNote() {
    const created = Storage.addItem({
      type: "note",
      title: "Nova nota",
      content: "",
      tags: ["nota"],
      category: "red",
      pinned: false
    });
    this.redSelectedNoteId = created.id;
    this.redNoteDraft = null;
    this.renderRedNotes();
    this.renderEra("red");
    this.renderDebutHighlights();
    return created;
  },

  createRedChecklist() {
    const created = Storage.addItem({
      type: "checklist",
      title: "Nova checklist",
      checklistItems: [],
      tags: ["checklist"],
      category: "red",
      pinned: false
    });
    this.redSelectedNoteId = created.id;
    this.redNoteDraft = null;
    this.renderRedNotes();
    this.renderEra("red");
    this.renderDebutHighlights();
    return created;
  },

  renderRedNotes(notesArg = null) {
    const list = document.getElementById("red-notes-list");
    const emptyState = document.getElementById("red-note-empty");
    const form = document.getElementById("red-note-form");
    const checklistForm = document.getElementById("red-checklist-form");
    const titleInput = document.getElementById("red-note-title");
    const contentInput = document.getElementById("red-note-content");
    const meta = document.getElementById("red-note-meta");

    if (!list || !emptyState || !form || !titleInput || !contentInput || !meta) return;

    if (!Array.isArray(notesArg)) {
      this.cleanupRedEmptyItems(this.redSelectedNoteId);
    }

    const source = Array.isArray(notesArg)
      ? notesArg
      : Storage.getByCategory("red").filter((item) => item.type === "note" || item.type === "checklist");

    const ordered = [...source].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const query = (this.redNotesQuery || "").trim().toLowerCase();
    const filter = this.redNotesFilter || "all";
    let visible = ordered;
    if (filter === "notes") visible = visible.filter((item) => item.type === "note");
    else if (filter === "checklists") visible = visible.filter((item) => item.type === "checklist");
    if (query) {
      visible = visible.filter((item) => {
        const haystack = `${item.title || ""} ${(item.content || "")} ${(item.checklistItems || []).map((i) => i.text).join(" ")}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    if (this.redSelectedNoteId && !ordered.some((item) => item.id === this.redSelectedNoteId)) {
      this.redSelectedNoteId = "";
    }

    list.innerHTML = visible.length
      ? visible.map((item) => {
          const isActive = item.id === this.redSelectedNoteId;
          const isChecklist = item.type === "checklist";
          const isLargeGrid = this.redNotesViewMode === "grid-3x3";
          const items = item.checklistItems || [];
          const done = items.filter((i) => i.completed).length;
          const total = items.length;
          const progressPercent = total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
          const progressLabel = total ? (done + " de " + total + " concluidos") : "Nenhum item";
          const preview = isChecklist
            ? progressLabel
            : this.getRedListPreview(item, isLargeGrid ? 580: 88);
          const title = this.escapeHtml(String(item.title || (isChecklist ? "Checklist" : "Sem título")));
          const timestamp = new Date(item.updatedAt || item.createdAt || Date.now());
          const dateLabel = Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleDateString("pt-BR");
          const icon = isChecklist ? "check-square" : "file-text";
          const pinIcon = item.pinned ? "pin-off" : "pin";
          const pinTitle = item.pinned ? "Desafixar" : "Fixar";
          return '<li class="red-note-list-item ' + (isActive ? "active " : "") + (item.pinned ? "pinned" : "") + '" data-id="' + this.escapeHtml(item.id) + '" data-type="' + this.escapeHtml(item.type) + '">' +
            '<span class="red-note-list-icon"><i data-lucide="' + icon + '"></i></span>' +
            '<div class="red-note-list-body">' +
              '<div class="red-note-list-head">' +
                '<strong class="red-note-list-title">' + title + '</strong>' +
                '<div class="item-card-actions red-note-card-actions">' +
                  (item.pinned ? '<span class="pin-indicator red-note-pin-indicator" title="Fixado"><i data-lucide="pin"></i></span>' : '') +
                  '<button type="button" class="item-btn-pin red-note-pin-btn" data-id="' + this.escapeHtml(item.id) + '" title="' + pinTitle + '"><i data-lucide="' + pinIcon + '"></i></button>' +
                '</div>' +
              '</div>' +
              (isChecklist
                ? '<div class="red-note-list-progress ' + (total > 0 && done === total ? "is-complete" : "") + '">' +
                    '<span class="red-note-list-progress-track"><span class="red-note-list-progress-fill" style="width:' + progressPercent + '%"></span></span>' +
                    '<span class="red-note-list-progress-label">' + this.escapeHtml(progressLabel) + '</span>' +
                  '</div>'
                : '<p class="red-note-list-preview">' + this.escapeHtml(preview) + '</p>') +
              '<small class="red-note-list-date">' + this.escapeHtml(dateLabel) + '</small>' +
            '</div>' +
          '</li>';
        }).join("")
      : '<li class="red-note-list-empty">Nenhum item encontrado.</li>';

    list.classList.toggle("red-notes-list--grid", this.redNotesViewMode === "grid");
    list.classList.toggle("red-notes-list--grid-3x3", this.redNotesViewMode === "grid-3x3");

    const viewListBtn = document.getElementById("red-notes-view-list");
    const viewGridBtn = document.getElementById("red-notes-view-grid");
    const viewGrid3x3Btn = document.getElementById("red-notes-view-grid-3x3");
    if (viewListBtn) viewListBtn.classList.toggle("active", this.redNotesViewMode === "list");
    if (viewGridBtn) viewGridBtn.classList.toggle("active", this.redNotesViewMode === "grid");
    if (viewGrid3x3Btn) viewGrid3x3Btn.classList.toggle("active", this.redNotesViewMode === "grid-3x3");

    const shell = document.getElementById("red-notes-shell");

    const selected = ordered.find((item) => item.id === this.redSelectedNoteId);

    if (!selected) {
      if (shell) shell.classList.add("red-notes-shell--list-only");
      if (shell) shell.classList.remove("red-notes-shell--editor-only");
      // So mostra o placeholder se nao houver nenhum item
      if (ordered.length === 0) {
        emptyState.style.display = "grid";
        const emptyText = document.getElementById("red-note-empty-text");
        if (emptyText) emptyText.textContent = "Clique em + para criar uma nota ou checklist.";
      } else {
        emptyState.style.display = "none";
      }
      form.style.display = "none";
      if (checklistForm) checklistForm.style.display = "none";
      this.renderRedNotePreview("");
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      return;
    }

    if (shell) shell.classList.remove("red-notes-shell--list-only");
    if (shell) shell.classList.add("red-notes-shell--editor-only");

    emptyState.style.display = "none";
    const isChecklist = selected.type === "checklist";
    form.style.display = isChecklist ? "none" : "grid";
    if (checklistForm) checklistForm.style.display = isChecklist ? "grid" : "none";

    if (isChecklist) {
      this.renderRedChecklistEditor(selected);
    } else {
      if (document.activeElement !== titleInput) titleInput.value = selected.title || "";
      if (document.activeElement !== contentInput) contentInput.value = selected.content || "";
      this.renderRedNotePreview(String(contentInput.value || ""));
      this.setRedNoteViewMode(this.redNoteViewMode);
      const stamp = new Date(selected.updatedAt || selected.createdAt || Date.now());
      meta.textContent = Number.isNaN(stamp.getTime()) ? "" : "Atualizada em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  renderRedChecklistEditor(item) {
    const titleInput = document.getElementById("red-checklist-title");
    const progressEl = document.getElementById("red-checklist-progress");
    const itemsList = document.getElementById("red-checklist-items");
    const meta = document.getElementById("red-checklist-meta");
    if (!titleInput || !progressEl || !itemsList || !meta) return;
    if (document.activeElement !== titleInput) titleInput.value = item.title || "";
    const items = item.checklistItems || [];
    const done = items.filter((i) => i.completed).length;
    const total = items.length;
    this.renderRedChecklistProgress(progressEl, done, total);
    itemsList.innerHTML = items.map((entry, idx) => {
      const raw = String(entry.text || "").trim();
      const safe = this.escapeHtml(raw || "Item");
      const checked = entry.completed ? " checked" : "";
      return '<li class="red-checklist-item" data-idx="' + idx + '">' +
        '<input type="checkbox" class="red-checklist-item-check" ' + checked + ' aria-label="Concluído" />' +
        '<input type="text" class="red-checklist-item-text" value="' + safe + '" placeholder="Item" />' +
        '<button type="button" class="red-checklist-item-remove" aria-label="Remover"><i data-lucide="x"></i></button>' +
      '</li>';
    }).join("");
    itemsList.classList.toggle("is-empty", total === 0);
    const stamp = new Date(item.updatedAt || item.createdAt || Date.now());
    meta.textContent = Number.isNaN(stamp.getTime()) ? "" : "Atualizada em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    this.setupRedChecklistItemEvents();
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  setupRedChecklistItemEvents() {
    const container = document.getElementById("red-checklist-items");
    const addBtn = document.getElementById("red-checklist-add-btn");
    const deleteBtn = document.getElementById("red-checklist-delete-btn");
    const progressEl = document.getElementById("red-checklist-progress");
    if (!container || !addBtn || !deleteBtn) return;
    const noteId = this.redSelectedNoteId;
    if (!noteId) return;

    const updateProgress = () => {
      const checks = [...container.querySelectorAll(".red-checklist-item-check")];
      const total = checks.length;
      const done = checks.filter((entry) => entry.checked).length;
      container.classList.toggle("is-empty", total === 0);
      this.renderRedChecklistProgress(progressEl, done, total);
    };

    container.querySelectorAll(".red-checklist-item-check").forEach((check) => {
      check.addEventListener("change", updateProgress);
    });
    container.querySelectorAll(".red-checklist-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".red-checklist-item");
        if (row) row.remove();
        updateProgress();
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      });
    });

    const appendChecklistItem = () => {
      const idx = container.querySelectorAll(".red-checklist-item").length;
      const li = document.createElement("li");
      li.className = "red-checklist-item";
      li.dataset.idx = String(idx);
      li.innerHTML = '<input type="checkbox" class="red-checklist-item-check" aria-label="Concluído" />' +
        '<input type="text" class="red-checklist-item-text" value="" placeholder="Item" />' +
        '<button type="button" class="red-checklist-item-remove" aria-label="Remover"><i data-lucide="x"></i></button>';
      container.appendChild(li);
      const check = li.querySelector(".red-checklist-item-check");
      if (check) check.addEventListener("change", updateProgress);
      const removeBtn = li.querySelector(".red-checklist-item-remove");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          li.remove();
          updateProgress();
          if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
        });
      }
      updateProgress();
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      const textInput = li.querySelector(".red-checklist-item-text");
      if (textInput) textInput.focus();
    };

    addBtn.replaceWith(addBtn.cloneNode(true));
    const activeAddBtn = document.getElementById("red-checklist-add-btn");
    if (activeAddBtn) {
      activeAddBtn.addEventListener("click", () => appendChecklistItem());
    }

    if (container._redChecklistEmptyClickHandler) {
      container.removeEventListener("click", container._redChecklistEmptyClickHandler);
    }
    container._redChecklistEmptyClickHandler = (event) => {
      if (event.target !== container) return;
      appendChecklistItem();
    };
    container.addEventListener("click", container._redChecklistEmptyClickHandler);

    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    document.getElementById("red-checklist-delete-btn").addEventListener("click", () => this.openDeleteNoteModal(noteId));
    updateProgress();
  },
  setupItemEvents(container, era) {
    // Track access on URL click
    container.querySelectorAll(".item-url").forEach(link => {
      link.addEventListener("click", () => {
        Storage.trackAccess(link.dataset.id);
        setTimeout(() => {
          this.renderEra(era);
          this.renderDebutHighlights();
          if (typeof renderizarRecentes === "function") renderizarRecentes();
        }, 100);
      });
    });
    container.querySelectorAll(".speak-widget-cover-link").forEach(link => {
      link.addEventListener("click", () => {
        Storage.trackAccess(link.dataset.id);
        setTimeout(() => {
          this.renderEra(era);
          this.renderDebutHighlights();
          if (typeof renderizarRecentes === "function") renderizarRecentes();
        }, 100);
      });
    });
    container.querySelectorAll(".folklore-open-md-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openFolkloreMarkdownDocument(btn.dataset.id);
      });
    });

    container.querySelectorAll(".folklore-md-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".item-btn-pin, .item-btn-delete, .item-tag, .folklore-open-md-btn")) return;
        this.openFolkloreMarkdownDocument(card.dataset.id);
      });
    });

    // Pin/unpin
    container.querySelectorAll(".item-btn-pin").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const item = Storage.getAll().find(i => i.id === btn.dataset.id);
        if (item) {
          Storage.updateItem(btn.dataset.id, { pinned: !item.pinned, pinnedAt: !item.pinned ? new Date().toISOString() : "" });
          this.renderEra(era);
          this.renderDebutHighlights();
        }
      });
    });

    // Delete
    container.querySelectorAll(".item-btn-delete").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openDeleteNoteModal(btn.dataset.id, { era });
      });
    });

    // Tag click
    container.querySelectorAll(".item-tag").forEach(tag => {
      tag.addEventListener("click", () => {
        if (era === "fearless") {
          this.currentTagFilter = tag.dataset.tag;
        } else {
          this.currentTagFilter = this.currentTagFilter === tag.dataset.tag ? null : tag.dataset.tag;
        }
        this.renderEra(era);
      });
    });
  },

  // ===== DRAG & DROP =====
  // Ordenacao manual de cards dentro da mesma era e persistencia da ordem.
  setupDragDrop(container, era) {
    if (era === "folklore") return;
    const cards = container.querySelectorAll(".item-card");

    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        this.draggedId = card.dataset.id;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        this.draggedId = null;
        container.querySelectorAll(".item-card").forEach(c => c.classList.remove("drag-over"));
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (card.dataset.id !== this.draggedId) {
          card.classList.add("drag-over");
        }
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (!this.draggedId || card.dataset.id === this.draggedId) return;

        const allCards = [...container.querySelectorAll(".item-card")];
        const ids = allCards.map(c => c.dataset.id);
        const fromIdx = ids.indexOf(this.draggedId);
        const toIdx = ids.indexOf(card.dataset.id);

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, this.draggedId);

        Storage.saveOrder(era, ids);
        this.renderEra(era);
      });
    });
  },

  // ===== DEBUT HIGHLIGHTS =====
  // Blocos da pagina inicial: Itens Fixados e Mais Acessados.
  renderDebutHighlights() {
    const pinnedContainer = document.getElementById("debut-pinned");
    const accessedContainer = document.getElementById("debut-accessed");

    // BLOCO 1: Itens fixados mais relevantes (exclui repositórios ja fixados em "Meus repositórios").
    if (pinnedContainer) {
      const repoMatchers = this.getPinnedRepoMatchers();
      const allPinned = Storage.getPinned().filter((item) => !this.isPinnedRepoMirroredInMyRepos(item, repoMatchers));
      const visiblePinned = this.showAllPinnedHighlights ? allPinned : allPinned.slice(0, 3);
      const togglePinnedLink = document.getElementById("ver-mais-pinned");

      if (togglePinnedLink) {
        togglePinnedLink.style.display = "inline";
        if (allPinned.length > 3) {
          togglePinnedLink.textContent = this.showAllPinnedHighlights ? "Ver menos" : "Ver mais";
          togglePinnedLink.dataset.disabled = "0";
          togglePinnedLink.classList.remove("is-disabled");
        } else {
          togglePinnedLink.textContent = "Ver mais";
          togglePinnedLink.dataset.disabled = "1";
          togglePinnedLink.classList.add("is-disabled");
          this.showAllPinnedHighlights = false;
        }
      }

      if (visiblePinned.length) {
        pinnedContainer.innerHTML = visiblePinned.map(item => {
          const safeUrl = this.sanitizeUrl(item.url);
          const eraBadge = this.renderEraBadge(item.category);
          const eraKey = this.normalizeEra(item.category);

          if (safeUrl) {
            return '<li class="highlight-row era-' + this.escapeHtml(eraKey) + '">' +
              '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="highlight-link-main" data-id="' + item.id + '">' +
                '<span>' + this.typeIcon(item.type) + '</span>' +
                '<b class="plus">' + this.escapeHtml(item.title) + '</b>' +
              '</a>' +
              eraBadge +
            '</li>';
          }

          return '<li class="highlight-row era-' + this.escapeHtml(eraKey) + '">' +
            '<div class="highlight-link-main" data-id="' + this.escapeHtml(item.id) + '">' +
              '<span>' + this.typeIcon(item.type) + '</span>' +
              '<b class="plus">' + this.escapeHtml(item.title) + '</b>' +
            '</div>' +
            eraBadge +
          '</li>';
        }).join("");

        pinnedContainer.querySelectorAll(".highlight-link-main").forEach(link => {
          link.addEventListener("click", (event) => {
            const itemId = link.dataset.id;
            if (!itemId) return;
            Storage.trackAccess(itemId);
            const currentItem = Storage.getAll().find((entry) => entry.id === itemId);
            if (currentItem && currentItem.category === "red" && (currentItem.type === "note" || currentItem.type === "checklist")) {
              event.preventDefault();
              this.navigateToEra("red");
              setTimeout(() => {
                this.redSelectedNoteId = itemId;
                this.renderRedNotes();
              }, 0);
            }
            if (currentItem && currentItem.category === "folklore" && currentItem.type === "markdown") {
              event.preventDefault();
              this.navigateToEra("folklore");
              setTimeout(() => {
                this.folkloreSelectedMarkdownId = itemId;
                this.folkloreMarkdownViewMode = "preview";
                this.renderEra("folklore");
              }, 0);
            }
            if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
          });
        });

        pinnedContainer.querySelectorAll(".era-badge-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigateToEra(btn.dataset.era);
          });
        });

        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }
      } else {
        pinnedContainer.innerHTML = '<li><span><i data-lucide="pin"></i></span><b class="plus">Fixe itens nas eras</b></li>';
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }
      }
    }

    // BLOCO 2: Itens mais acessados com URL valida.
    if (accessedContainer) {
      const allAccessed = Storage.getMostAccessed(20)
        .filter(item => this.sanitizeUrl(item.url));
      const visibleAccessed = this.showAllAccessedHighlights ? allAccessed : allAccessed.slice(0, 3);
      const toggleAccessedLink = document.getElementById("ver-mais-accessed");

      if (toggleAccessedLink) {
        toggleAccessedLink.style.display = "inline";
        if (allAccessed.length > 3) {
          toggleAccessedLink.textContent = this.showAllAccessedHighlights ? "Ver menos" : "Ver mais";
          toggleAccessedLink.dataset.disabled = "0";
          toggleAccessedLink.classList.remove("is-disabled");
        } else {
          toggleAccessedLink.textContent = "Ver mais";
          toggleAccessedLink.dataset.disabled = "1";
          toggleAccessedLink.classList.add("is-disabled");
          this.showAllAccessedHighlights = false;
        }
      }

      if (visibleAccessed.length) {
        accessedContainer.innerHTML = visibleAccessed.map(item => {
          const eraKey = this.normalizeEra(item.category);
          return '<li class="highlight-row era-' + this.escapeHtml(eraKey) + '">' +
              '<a href="' + this.sanitizeUrl(item.url) + '" target="_blank" rel="noopener noreferrer" class="highlight-link-main" data-id="' + item.id + '">' +
                '<span>' + this.typeIcon(item.type) + '</span>' +
                '<b class="plus">' + this.escapeHtml(item.title) + '</b>' +
                '<small class="highlight-access-count">' + (item.accessCount || 0) + 'x</small>' +
              '</a>' +
              this.renderEraBadge(item.category) +
            '</li>';
        }).join("");

        accessedContainer.querySelectorAll(".highlight-link-main").forEach(link => {
          link.addEventListener("click", () => {
            if (link.dataset.id) Storage.trackAccess(link.dataset.id);
            if (typeof renderizarRecentes === "function") setTimeout(() => renderizarRecentes(), 100);
          });
        });

        accessedContainer.querySelectorAll(".era-badge-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.navigateToEra(btn.dataset.era);
          });
        });
        if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      } else {
        accessedContainer.innerHTML = '<li><span><i data-lucide="bar-chart-3"></i></span><b class="plus">Acesse itens para ver aqui</b></li>';
        if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      }
    }
  }
};

function initLegacyApp() {
  App.init();
}

window.App = App;
window.initLegacyApp = initLegacyApp;

export { App, initLegacyApp };




















