// ===== APP MODULE =====
// Mapa rapido deste arquivo:
// 1) Helpers de seguranca/formatacao
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
      settings: "Settings"
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

  navigateToEra(era) {
    // Navegacao centralizada para reaproveitar o comportamento da sidebar.
    const key = this.normalizeEra(era);
    const link = document.querySelector('.era-link[data-target="' + CSS.escape(key) + '"]');
    if (link) link.click();
  },

  renderFearlessRepoCard(item, safeUrl) {
    const descricao = item.content
      ? this.escapeHtml(item.content.slice(0, 120)) + (item.content.length > 120 ? "..." : "")
      : (safeUrl ? this.escapeHtml(this.formatHost(item.url)) : "Sem descricao");

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
      (safeUrl ? '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="item-url fearless-repo-link" data-id="' + item.id + '">Abrir repositorio</a>' : '') +
      (item.tags.length ? '<div class="item-tags">' + item.tags.map(t => '<span class="item-tag" data-tag="' + this.escapeHtml(t) + '">' + this.escapeHtml(t) + '</span>').join("") + '</div>' : '') +
      '<div class="item-meta"><span>' + (item.accessCount || 0) + ' acessos</span></div>' +
    '</div>';
  },

  typeIcon(type) {
    const icons = {
      link: '<i data-lucide="link"></i>',
      note: '<i data-lucide="file-text"></i>',
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

    const prefs = Storage.getUiPrefs ? Storage.getUiPrefs() : {};
    this.quickFilter = prefs.quickFilter || "all";
    this.topbarTagFilter = prefs.tag || "__all__";

    this.setupQuickFilters();
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
    { id: "__page-fearless", title: "Fearless", era: "fearless", keywords: ["repositorios", "repos"] },
    { id: "__page-speak-now", title: "Speak Now", era: "speak-now", keywords: [] },
    { id: "__page-red", title: "Red", era: "red", keywords: [] },
    { id: "__page-1989", title: "1989", era: "1989", keywords: [] },
    { id: "__page-reputation", title: "Reputation", era: "reputation", keywords: [] },
    { id: "__page-lover", title: "Lover", era: "lover", keywords: [] },
    { id: "__page-folklore", title: "Folklore", era: "folklore", keywords: [] },
    { id: "__page-settings", title: "Settings", era: "settings", keywords: ["configuracoes", "configuraÃ§Ãµes", "preferencias", "perfil", "profile", "backup", "exportar", "importar", "seguranca"] }
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
            html += '<div class="search-section-label">Paginas</div>';
            html += pageResults.map(p =>
              '<a href="#" class="search-result-item search-result-page" data-era="' + p.era + '">' +
                '<span class="search-result-type"><i data-lucide="layout-dashboard"></i></span>' +
                '<div class="search-result-info">' +
                  '<strong>' + this.highlightText(this.escapeHtml(p.title), query) + '</strong>' +
                  '<small>Pagina</small>' +
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
                  '<small>' + this.escapeHtml(item.category) + (item.tags.length ? ' Â· ' + this.escapeHtml(item.tags.join(", ")) : '') + '</small>' +
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

      Storage.addItem({ type, title, url, content, tags, pinned, category });
      form.reset();
      modal.classList.remove("visible");
      this.renderEra(category);
      this.renderDebutHighlights();
    });
  },

  openModal(era) {
    const modal = document.getElementById("modal-add-item");
    if (!modal) return;
    const select = modal.querySelector("#item-category");
    const form = document.getElementById("form-add-item");
    form.reset();
    if (select) select.value = era || this.currentEra;
    form.querySelector(".field-url").style.display = "block";
    form.querySelector(".field-content").style.display = "none";
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

    if (era === "fearless" && items.length === 0) {
      Storage.ensureFearlessDefaults();
      items = this.applyQuickFilters(Storage.getByCategory(era));
    }

    const allEraItems = [...items];
    const eraTags = Storage.getTagsByCategory(era);

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
    if (tagsContainer) {
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
      } else if (eraTags.length) {
        tagsContainer.innerHTML = eraTags.map(tag =>
          '<button class="tag-btn ' + (this.currentTagFilter === tag ? "active" : "") + '" data-tag="' + this.escapeHtml(tag) + '">' + this.escapeHtml(tag) + '</button>'
        ).join("");
      } else {
        tagsContainer.innerHTML = "";
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
      container.innerHTML =
        '<div class="era-empty">' +
          '<p>Nenhum item nessa era ainda.</p>' +
          '<p><small>Clique em "+ Novo Item" para adicionar.</small></p>' +
        '</div>';
      return;
    }

    container.innerHTML = items.map(item => {
      const safeUrl = this.sanitizeUrl(item.url);
      if (era === "fearless") {
        return this.renderFearlessRepoCard(item, safeUrl);
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

    // Pin/unpin
    container.querySelectorAll(".item-btn-pin").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = Storage.getAll().find(i => i.id === btn.dataset.id);
        if (item) {
          Storage.updateItem(btn.dataset.id, { pinned: !item.pinned });
          this.renderEra(era);
          this.renderDebutHighlights();
        }
      });
    });

    // Delete
    container.querySelectorAll(".item-btn-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Excluir este item?")) {
          Storage.deleteItem(btn.dataset.id);
          this.renderEra(era);
          this.renderDebutHighlights();
        }
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

    // BLOCO 1: Itens fixados mais relevantes.
    if (pinnedContainer) {
      const pinned = Storage.getPinned().slice(0, 3);
      if (pinned.length) {
        pinnedContainer.innerHTML = pinned.map(item => {
          const safeUrl = this.sanitizeUrl(item.url);
          const eraBadge = this.renderEraBadge(item.category);
          if (safeUrl) {
            const eraKey = this.normalizeEra(item.category);
            return '<li class="highlight-row era-' + this.escapeHtml(eraKey) + '">' +
              '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="highlight-link-main" data-id="' + item.id + '">' +
                '<span>' + this.typeIcon(item.type) + '</span>' +
                '<b class="plus">' + this.escapeHtml(item.title) + '</b>' +
              '</a>' +
              eraBadge +
            '</li>';
          }

          const eraKey = this.normalizeEra(item.category);
          return '<li class="highlight-row era-' + this.escapeHtml(eraKey) + '">' +
            '<div class="highlight-link-main">' +
              '<span>' + this.typeIcon(item.type) + '</span>' +
              '<b class="plus">' + this.escapeHtml(item.title) + '</b>' +
            '</div>' +
            eraBadge +
          '</li>';
        }).join("");

        pinnedContainer.querySelectorAll(".highlight-link-main").forEach(link => {
          link.addEventListener("click", () => {
            if (link.dataset.id) Storage.trackAccess(link.dataset.id);
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
        if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      } else {
        pinnedContainer.innerHTML = '<li><span><i data-lucide="pin"></i></span><b class="plus">Fixe itens nas eras</b></li>';
        if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }
      }
    }

    // BLOCO 2: Itens mais acessados com URL valida.
    if (accessedContainer) {
      const accessed = Storage.getMostAccessed(20)
        .filter(item => this.sanitizeUrl(item.url))
        .slice(0, 3);
      if (accessed.length) {
        accessedContainer.innerHTML = accessed.map(item => {
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
