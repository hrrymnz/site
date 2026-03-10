// ===== APP MODULE =====
// Mapa rapido deste arquivo:
// 1) Helpers de segurança/formatacao
// 2) Inicializacao geral da UI
// 3) Busca global
// 4) Modal de criacao de item
// 5) Renderizacao por era + filtros
// 6) Eventos dos cards + drag and drop
// 7) Highlights da pagina Debut
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
  redNotesViewMode: "list",
  redNotesFilter: "all",
  pendingDeleteNoteId: null,
  pendingDeleteContext: null,
  redChecklistSaveTimer: null,
  spotifyCoverPending: {},

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

  normalizeEra(era) {
    const value = String(era || "").toLowerCase().trim();
    const map = {
      "speak now": "speak-now"
    };
    return map[value] || value || "debut";
  },

  formatEraLabel(era) {
    const labels = {
      debut: "Debut",
      fearless: "Fearless",
      "speak-now": "Speak Now",
      red: "Red",
      "1989": "1989",
      reputation: "Reputation",
      lover: "Lover",
      folklore: "Folklore",
      evermore: "Evermore",
      settings: "Configuracoes"
    };
    const key = this.normalizeEra(era);
    return labels[key] || "Debut";
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
    { id: "__page-debut", title: "Debut", era: "debut", keywords: ["inicio", "home", "principal", "dashboard"] },
    { id: "__page-fearless", title: "Fearless", era: "fearless", keywords: ["repositórios", "repos"] },
    { id: "__page-speak-now", title: "Speak Now", era: "speak-now", keywords: [] },
    { id: "__page-red", title: "Red", era: "red", keywords: [] },
    { id: "__page-1989", title: "1989", era: "1989", keywords: [] },
    { id: "__page-reputation", title: "Reputation", era: "reputation", keywords: [] },
    { id: "__page-lover", title: "Lover", era: "lover", keywords: [] },
    { id: "__page-folklore", title: "Folklore", era: "folklore", keywords: [] },
    { id: "__page-evermore", title: "Evermore", era: "evermore", keywords: ["perfil", "profile", "usuario", "conta"] },
    { id: "__page-settings", title: "Configuracoes", era: "settings", keywords: ["configuracoes", "preferencias", "perfil", "profile", "backup", "exportar", "importar", "seguranca", "settings"] }
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

    form.querySelector("#item-type").addEventListener("change", (e) => {
      const isNote = e.target.value === "note";
      form.querySelector(".field-url").style.display = isNote ? "none" : "block";
      form.querySelector(".field-content").style.display = isNote ? "block" : "none";
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = form.querySelector("#item-type").value;
      const title = form.querySelector("#item-title").value.trim();
      const url = form.querySelector("#item-url").value.trim();
      const content = form.querySelector("#item-content").value.trim();
      const tagsRaw = form.querySelector("#item-tags").value.trim();
      const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];
      const pinned = form.querySelector("#item-pinned").checked;
      const category = form.querySelector("#item-category").value;

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
    form.reset();
    if (select) select.value = targetEra;

    const typeField = form.querySelector("#item-type");
    const titleField = form.querySelector("#item-title");
    const urlField = form.querySelector("#item-url");
    const contentField = form.querySelector("#item-content");
    const tagsField = form.querySelector("#item-tags");
    const isNote = (preset.type || "").toLowerCase() === "note";

    if (typeField) typeField.value = preset.type || "link";
    if (titleField) titleField.value = preset.title || "";
    if (urlField) urlField.value = preset.url || "";
    if (contentField) contentField.value = preset.content || "";
    if (tagsField) tagsField.value = Array.isArray(preset.tags) ? preset.tags.join(", ") : "";

    form.querySelector(".field-url").style.display = isNote ? "none" : "block";
    form.querySelector(".field-content").style.display = isNote ? "block" : "none";
    modal.classList.add("visible");
  },

  setupAddButtons() {
    document.querySelectorAll(".btn-add-item").forEach(btn => {
      btn.addEventListener("click", () => this.openModal(btn.dataset.era));
    });
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
        "1989": {
          icon: "briefcase",
          title: "Suas ferramentas ficam aqui",
          subtitle: "Figma, Notion, Linear, VS Code web...",
          cta: "+ Adicionar ferramenta",
          suggestions: [
            { label: "Figma", title: "Figma", url: "https://www.figma.com/" },
            { label: "Notion", title: "Notion", url: "https://www.notion.so/" },
            { label: "Linear", title: "Linear", url: "https://linear.app/" }
          ]
        },
        lover: {
          icon: "heart",
          title: "Seus cantos favoritos da internet",
          subtitle: "Os sites que voce abre so pra relaxar",
          cta: "+ Adicionar favorito"
        },
        folklore: {
          icon: "book-open",
          title: "Leituras para quando tiver tempo",
          subtitle: "Artigos, docs, threads, referencias",
          cta: "+ Salvar leitura"
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
            '<button type="button" class="era-empty-chip" data-title="' + this.escapeHtml(chip.title || chip.label || "") + '" data-url="' + this.escapeHtml(chip.url || "") + '">' + this.escapeHtml(chip.label || "") + '</button>'
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
          this.openPrefilledModal(era, {
            type: "link",
            title: String(chip.dataset.title || "").trim(),
            url: String(chip.dataset.url || "").trim()
          });
        });
      });

      if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      return;
    }

    container.innerHTML = items.map(item => {
      const safeUrl = this.sanitizeUrl(item.url);
      if (era === "fearless") {
        return this.renderFearlessRepoCard(item, safeUrl);
      }
      if (era === "speak-now" && /(?:open\.spotify\.com|^spotify:)/i.test(String(item.url || ""))) {
        const widget = this.renderSpeakNowPlaylistWidget(item, safeUrl);
        if (widget) return widget;
      }
      return '<div class="item-card ' + (item.pinned ? "pinned" : "") + '" draggable="true" data-id="' + item.id + '">' +
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
    const deleteBtn = document.getElementById("red-note-delete-btn");

    if (!searchInput || !newBtn || !list || !titleInput || !contentInput || !deleteBtn) return;
    if (list.dataset.boundRedNotes === "1") return;
    list.dataset.boundRedNotes = "1";

    searchInput.addEventListener("input", () => {
      this.redNotesQuery = String(searchInput.value || "").trim().toLowerCase();
      this.renderRedNotes();
    });

    newBtn.addEventListener("click", () => this.openCreateRedModal());

    const viewListBtn = document.getElementById("red-notes-view-list");
    const viewGridBtn = document.getElementById("red-notes-view-grid");
    if (viewListBtn && viewGridBtn) {
      viewListBtn.addEventListener("click", () => {
        this.redNotesViewMode = "list";
        viewListBtn.classList.add("active");
        viewGridBtn.classList.remove("active");
        this.renderRedNotes();
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      });
      viewGridBtn.addEventListener("click", () => {
        this.redNotesViewMode = "grid";
        viewGridBtn.classList.add("active");
        viewListBtn.classList.remove("active");
        this.renderRedNotes();
        if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      });
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

    const saveDraft = () => {
      const noteId = this.redSelectedNoteId;
      if (!noteId) return;
      this.persistRedNoteDraft(noteId, {
        title: String(titleInput.value || "").trim() || "Sem título",
        content: String(contentInput.value || "")
      });
    };

    titleInput.addEventListener("input", saveDraft);
    contentInput.addEventListener("input", saveDraft);

    deleteBtn.addEventListener("click", () => {
      if (!this.redSelectedNoteId) return;
      this.openDeleteNoteModal(this.redSelectedNoteId);
    });

    this.setupDeleteNoteModal();
    this.setupCreateRedModal();
    this.setupRedEditorModal();
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
          } else if (ctx.era) {
            App.renderEra(ctx.era);
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
    const shouldCloseRedEditor = options.closeRedEditor !== false;

    App.pendingDeleteNoteId = noteId;
    App.pendingDeleteContext = {
      itemId: noteId,
      era,
      clearRedSelection: !!options.clearRedSelection
    };

    if (shouldCloseRedEditor) {
      const editorModal = document.getElementById("red-editor-modal");
      if (editorModal) editorModal.classList.remove("visible");
    }

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

  setupRedEditorModal() {
    const modal = document.getElementById("red-editor-modal");
    const closeBtn = document.getElementById("red-editor-modal-close");
    const body = document.getElementById("red-editor-modal-body");
    const wrap = document.getElementById("red-note-editor-wrap");
    const editor = document.getElementById("red-note-editor");
    if (!modal || !closeBtn || !body || !wrap || !editor) return;
    if (modal.dataset.bound === "1") return;
    modal.dataset.bound = "1";

    const close = () => {
      if (editor.parentNode === body) wrap.appendChild(editor);
      modal.classList.remove("visible");
      App.redSelectedNoteId = "";
      App.renderRedNotes();
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    };

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  },

  persistRedNoteDraft(noteId, updates) {
    this.redNoteDraft = { id: noteId, ...updates };
    clearTimeout(this.redNoteSaveTimer);
    this.redNoteSaveTimer = setTimeout(() => {
      if (!this.redNoteDraft || this.redNoteDraft.id !== noteId) return;
      Storage.updateItem(noteId, {
        title: this.redNoteDraft.title,
        content: this.redNoteDraft.content,
        updatedAt: new Date().toISOString()
      });
      this.renderRedNotes();
      this.renderDebutHighlights();
      this.redNoteDraft = null;
    }, 180);
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
          const items = item.checklistItems || [];
          const done = items.filter((i) => i.completed).length;
          const total = items.length;
          const preview = isChecklist
            ? (total ? done + " de " + total + " concluídos" : "Nenhum item")
            : (String(item.content || "").replace(/\s+/g, " ").trim().slice(0, 88) || "Sem conteúdo");
          const title = this.escapeHtml(String(item.title || (isChecklist ? "Checklist" : "Sem título")));
          const timestamp = new Date(item.updatedAt || item.createdAt || Date.now());
          const dateLabel = Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleDateString("pt-BR");
          const icon = isChecklist ? "check-square" : "file-text";
          const pinIcon = item.pinned ? "pin-off" : "pin";
          const pinTitle = item.pinned ? "Desafixar" : "Fixar";
          return '<li class="red-note-list-item ' + (isActive ? "active " : "") + (item.pinned ? "pinned" : "") + '" data-id="' + this.escapeHtml(item.id) + '" data-type="' + this.escapeHtml(item.type) + '">' +
            '<div class="red-note-card-top">' +
              '<span class="red-note-list-icon"><i data-lucide="' + icon + '"></i></span>' +
              '<div class="item-card-actions red-note-card-actions">' +
                (item.pinned ? '<span class="pin-indicator"><i data-lucide="pin"></i></span>' : '') +
                '<button type="button" class="item-btn-pin red-note-pin-btn" data-id="' + this.escapeHtml(item.id) + '" title="' + pinTitle + '"><i data-lucide="' + pinIcon + '"></i></button>' +
              '</div>' +
            '</div>' +
            '<strong>' + title + '</strong>' +
            '<p>' + this.escapeHtml(preview) + '</p>' +
            '<small>' + this.escapeHtml(dateLabel) + '</small>' +
          '</li>';
        }).join("")
      : '<li class="red-note-list-empty">Nenhum item encontrado.</li>';

    list.classList.toggle("red-notes-list--grid", this.redNotesViewMode === "grid");

    const shell = document.getElementById("red-notes-shell");
    const editorModal = document.getElementById("red-editor-modal");
    const editorModalBody = document.getElementById("red-editor-modal-body");
    const editorWrap = document.getElementById("red-note-editor-wrap");
    const editorEl = document.getElementById("red-note-editor");

    const selected = ordered.find((item) => item.id === this.redSelectedNoteId);

    if (!selected) {
      if (shell) shell.classList.add("red-notes-shell--list-only");
      if (editorModal) {
        editorModal.classList.remove("visible");
      }
      if (editorEl && editorModalBody && editorWrap && editorEl.parentNode === editorModalBody) {
        editorWrap.appendChild(editorEl);
      }
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
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
      return;
    }

    if (shell) shell.classList.add("red-notes-shell--list-only");
    if (editorEl && editorModalBody && editorWrap) {
      if (editorEl.parentNode !== editorModalBody) editorModalBody.appendChild(editorEl);
      if (editorModal) {
        editorModal.classList.add("visible");
      }
    }

    emptyState.style.display = "none";
    const isChecklist = selected.type === "checklist";
    form.style.display = isChecklist ? "none" : "grid";
    if (checklistForm) checklistForm.style.display = isChecklist ? "grid" : "none";

    if (isChecklist) {
      this.renderRedChecklistEditor(selected);
    } else {
      if (document.activeElement !== titleInput) titleInput.value = selected.title || "";
      if (document.activeElement !== contentInput) contentInput.value = selected.content || "";
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
    progressEl.textContent = total ? done + " de " + total + " concluídos" : "Nenhum item";
    progressEl.style.display = total ? "block" : "none";
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
    const stamp = new Date(item.updatedAt || item.createdAt || Date.now());
    meta.textContent = Number.isNaN(stamp.getTime()) ? "" : "Atualizada em " + stamp.toLocaleDateString("pt-BR") + " " + stamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    this.setupRedChecklistItemEvents();
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  },

  setupRedChecklistItemEvents() {
    const container = document.getElementById("red-checklist-items");
    const titleInput = document.getElementById("red-checklist-title");
    const addBtn = document.getElementById("red-checklist-add-btn");
    const deleteBtn = document.getElementById("red-checklist-delete-btn");
    if (!container || !titleInput || !addBtn || !deleteBtn) return;
    const noteId = this.redSelectedNoteId;
    if (!noteId) return;

    const self = this;
    const persist = (rerender = false) => {
      if (!App.redSelectedNoteId || App.redSelectedNoteId !== noteId) return;
      const items = [];
      container.querySelectorAll(".red-checklist-item").forEach((row, idx) => {
        const check = row.querySelector(".red-checklist-item-check");
        const text = row.querySelector(".red-checklist-item-text");
        items.push({ id: "i-" + idx, text: (text && text.value) ? String(text.value) : "", completed: !!(check && check.checked) });
      });
      Storage.updateItem(noteId, {
        title: (titleInput && titleInput.value) ? String(titleInput.value).trim() || "Checklist" : "Checklist",
        checklistItems: items,
        updatedAt: new Date().toISOString()
      });
      self.renderDebutHighlights();
      if (rerender) self.renderRedNotes();
    };

    const debouncedPersist = (rerender = false) => {
      clearTimeout(self.redChecklistSaveTimer);
      self.redChecklistSaveTimer = setTimeout(() => persist(rerender), 220);
    };

    container.querySelectorAll(".red-checklist-item-check").forEach((c) => c.addEventListener("change", () => debouncedPersist(true)));
    container.querySelectorAll(".red-checklist-item-text").forEach((c) => c.addEventListener("input", () => debouncedPersist(false)));
    container.querySelectorAll(".red-checklist-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".red-checklist-item");
        if (row) row.remove();
        debouncedPersist(true);
      });
    });
    titleInput.removeEventListener("input", titleInput._redChecklistTitleHandler);
    titleInput._redChecklistTitleHandler = () => debouncedPersist(false);
    titleInput.addEventListener("input", titleInput._redChecklistTitleHandler);

    addBtn.replaceWith(addBtn.cloneNode(true));
    document.getElementById("red-checklist-add-btn").addEventListener("click", () => {
      const current = Storage.getAll().find((i) => i.id === noteId);
      const prev = (current && Array.isArray(current.checklistItems)) ? [...current.checklistItems] : [];
      prev.push({ id: "i-" + Date.now(), text: "", completed: false });
      Storage.updateItem(noteId, { checklistItems: prev, updatedAt: new Date().toISOString() });
      self.renderRedNotes();
    });

    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    document.getElementById("red-checklist-delete-btn").addEventListener("click", () => self.openDeleteNoteModal(noteId));
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

    // Pin/unpin
    container.querySelectorAll(".item-btn-pin").forEach(btn => {
      btn.addEventListener("click", () => {
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
      btn.addEventListener("click", () => {
        this.openDeleteNoteModal(btn.dataset.id, { era, closeRedEditor: false });
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
            '<div class="highlight-link-main">' +
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




















