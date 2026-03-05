// ===== STORAGE MODULE =====
// Mapa rapido deste arquivo:
// 1) Leitura/escrita de itens no localStorage
// 2) Seeds da era Fearless
// 3) CRUD + filtros + busca
// 4) Estatisticas (acessos, pins, tags)
// 5) Ordenacao manual por era
// 6) Exportacao/importacao de backup
const Storage = {
  KEY: "swiftItems",
  ORDER_KEY: "swiftItemsOrder",
  FEARLESS_SEED_KEY: "fearlessDefaultSeeded",

  DEFAULT_FEARLESS_CARDS: [
    {
      type: "repo",
      title: "HtmlAnalyzer",
      url: "https://github.com/hrrymnz/HtmlAnalyzer",
      content: "Teste tecnico",
      tags: ["principal"],
      category: "fearless",
      pinned: true
    },
    {
      type: "repo",
      title: "Quiz",
      url: "https://github.com/hrrymnz/Quiz",
      content: "Codigo feito com objetivo academico",
      tags: ["principal"],
      category: "fearless",
      pinned: false
    }
  ],

  getAll() {
    return JSON.parse(localStorage.getItem(this.KEY)) || [];
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
  },

  // ===== 1) CRUD BASICO =====
  addItem(data) {
    const items = this.getAll();
    const newItem = {
      id: crypto.randomUUID(),
      type: data.type || "link",
      title: data.title || "",
      url: data.url || "",
      content: data.content || "",
      tags: data.tags || [],
      category: data.category || "debut",
      pinned: data.pinned || false,
      accessCount: 0,
      createdAt: new Date().toISOString(),
      lastAccessed: ""
    };
    items.push(newItem);
    this.save(items);
    return newItem;
  },

  // ===== 2) SEED INICIAL =====
  ensureFearlessDefaults() {
    const allItems = this.getAll();
    const fearlessItems = allItems.filter(item => item.category === "fearless");

    // If Fearless is empty, repopulate the default repository cards.
    if (fearlessItems.length === 0) {
      this.DEFAULT_FEARLESS_CARDS.forEach(card => this.addItem(card));
      localStorage.setItem(this.FEARLESS_SEED_KEY, "1");
      return;
    }

    if (localStorage.getItem(this.FEARLESS_SEED_KEY) !== "1") {
      localStorage.setItem(this.FEARLESS_SEED_KEY, "1");
    }
  },

  // ===== 3) ATUALIZACAO/REMOCAO/FILTROS =====
  updateItem(id, updates) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.save(items);
    return items[idx];
  },

  deleteItem(id) {
    this.save(this.getAll().filter(i => i.id !== id));
  },

  getByCategory(category) {
    const items = this.getAll().filter(i => i.category === category);
    const order = this.getOrder(category);
    if (!order.length) return items;
    const ordered = [];
    order.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) ordered.push(item);
    });
    items.forEach(i => {
      if (!order.includes(i.id)) ordered.push(i);
    });
    return ordered;
  },

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.getAll().filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.url.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q)) ||
      (i.content || "").toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  },

  // ===== 4) METRICAS E TAGS =====
  trackAccess(id) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    items[idx].accessCount = (items[idx].accessCount || 0) + 1;
    items[idx].lastAccessed = new Date().toISOString();
    this.save(items);
  },

  getTagsByCategory(category) {
    const tags = new Set();
    this.getByCategory(category).forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
  },

  getPinned() {
    return this.getAll().filter(i => i.pinned).sort((a, b) => b.accessCount - a.accessCount);
  },

  getMostAccessed(limit = 5) {
    return this.getAll()
      .filter(i => i.accessCount > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  },

  // ===== 5) ORDENACAO POR ERA =====
  getOrder(category) {
    // Ordem customizada por era: { fearless: [id1, id2...], red: [...] }
    const orders = JSON.parse(localStorage.getItem(this.ORDER_KEY)) || {};
    return orders[category] || [];
  },

  saveOrder(category, orderedIds) {
    const orders = JSON.parse(localStorage.getItem(this.ORDER_KEY)) || {};
    orders[category] = orderedIds;
    localStorage.setItem(this.ORDER_KEY, JSON.stringify(orders));
  },

  // ===== 6) BACKUP =====
  exportData() {
    // Exporta dados de itens + ordenacao + recentes em um unico JSON de backup.
    const data = {
      items: this.getAll(),
      orders: JSON.parse(localStorage.getItem(this.ORDER_KEY)) || {},
      reposRecentes: JSON.parse(localStorage.getItem("reposRecentes")) || [],
      avatar: this.getAvatar() || null,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taylorswift-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  },

  // ===== 7) FOTO DE PERFIL =====
  AVATAR_KEY: "swiftAvatar",

  getAvatar() {
    return localStorage.getItem(this.AVATAR_KEY) || "";
  },

  saveAvatar(dataUrl) {
    localStorage.setItem(this.AVATAR_KEY, dataUrl);
  },

  removeAvatar() {
    localStorage.removeItem(this.AVATAR_KEY);
  },

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Import parcial tolerante:
          // se um bloco nao existir no arquivo, os demais ainda podem ser aplicados.
          const data = JSON.parse(e.target.result);
          if (data.items && Array.isArray(data.items)) {
            this.save(data.items);
          }
          if (data.orders) {
            localStorage.setItem(this.ORDER_KEY, JSON.stringify(data.orders));
          }
          if (data.reposRecentes) {
            localStorage.setItem("reposRecentes", JSON.stringify(data.reposRecentes));
          }
          if (data.avatar) {
            this.saveAvatar(data.avatar);
          }
          resolve(data.items ? data.items.length : 0);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};
