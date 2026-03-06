import { supabase } from '../lib/supabase.js';

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
  REPOS_RECENTES_KEY: "reposRecentes",
  GITHUB_PREFS_KEY: "githubDashboardPrefs",
  GITHUB_CACHE_KEY: "githubDashboardCache",
  PROFILE_SETTINGS_KEY: "swiftProfileSettings",
  UI_PREFS_KEY: "swiftUiPrefs",
  LOCAL_VERSIONS_KEY: "swiftLocalVersions",
  STATE_SCOPE: "default",
  currentUserId: null,
  currentWorkspace: "default",
  syncTimer: null,
  versionTimer: null,
  lastVersionAt: 0,
  lastVersionSignature: "",
  AUTO_VERSION_INTERVAL_MS: 5 * 60 * 1000,

  get hasSupabase() {
    return !!supabase;
  },

  setUser(userId, workspacesEnabled = false) {
    this.currentUserId = userId;

    if (workspacesEnabled) {
      const workspaceFromStorage = userId ? localStorage.getItem(`${userId}_activeWorkspace`) : null;
      this.currentWorkspace = workspaceFromStorage || "default";
    } else {
      this.currentWorkspace = "default";
    }

    this.applyKeyPrefix();
    this.migrateLegacyKeysIfNeeded();
  },

  setWorkspace(workspaceId) {
    this.currentWorkspace = workspaceId || "default";
    if (this.currentUserId) {
      localStorage.setItem(`${this.currentUserId}_activeWorkspace`, this.currentWorkspace);
    }
    this.applyKeyPrefix();
    this.migrateLegacyKeysIfNeeded();
  },

  applyKeyPrefix() {
    const userPrefix = this.currentUserId ? this.currentUserId.slice(0, 8) : "anon";
    const workspacePrefix = this.currentWorkspace || "default";
    const prefix = `${userPrefix}_${workspacePrefix}_`;

    this.STATE_SCOPE = `${this.currentUserId || "default"}:${workspacePrefix}`;
    this.KEY = prefix + "swiftItems";
    this.ORDER_KEY = prefix + "swiftItemsOrder";
    this.FEARLESS_SEED_KEY = prefix + "fearlessDefaultSeeded";
    this.REPOS_RECENTES_KEY = prefix + "reposRecentes";
    this.GITHUB_PREFS_KEY = prefix + "githubDashboardPrefs";
    this.GITHUB_CACHE_KEY = prefix + "githubDashboardCache";
    this.PROFILE_SETTINGS_KEY = prefix + "swiftProfileSettings";
    this.AVATAR_KEY = prefix + "swiftAvatar";
    this.UI_PREFS_KEY = prefix + "swiftUiPrefs";
    this.LOCAL_VERSIONS_KEY = prefix + "swiftLocalVersions";
  },


  migrateLegacyKeysIfNeeded() {
    if (!this.currentUserId) return;
    if ((this.currentWorkspace || "default") !== "default") return;

    const userPrefix = this.currentUserId.slice(0, 8) + "_";
    const legacyMap = [
      [this.KEY, userPrefix + "swiftItems"],
      [this.ORDER_KEY, userPrefix + "swiftItemsOrder"],
      [this.FEARLESS_SEED_KEY, userPrefix + "fearlessDefaultSeeded"],
      [this.REPOS_RECENTES_KEY, userPrefix + "reposRecentes"],
      [this.GITHUB_PREFS_KEY, userPrefix + "githubDashboardPrefs"],
      [this.GITHUB_CACHE_KEY, userPrefix + "githubDashboardCache"],
      [this.PROFILE_SETTINGS_KEY, userPrefix + "swiftProfileSettings"],
      [this.AVATAR_KEY, userPrefix + "swiftAvatar"],
      [this.UI_PREFS_KEY, userPrefix + "swiftUiPrefs"]
    ];

    legacyMap.forEach(([nextKey, legacyKey]) => {
      const legacyValue = localStorage.getItem(legacyKey);
      const nextValue = localStorage.getItem(nextKey);

      if (!legacyValue) return;

      // Idempotente: promove legado quando destino nao existe ou parece menos completo.
      if (!nextValue || legacyValue.length > nextValue.length) {
        localStorage.setItem(nextKey, legacyValue);
        localStorage.setItem(`${legacyKey}_migrated_at`, new Date().toISOString());
      }
    });
  },
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

  getSnapshot() {
    return {
      items: this.getAll(),
      orders: JSON.parse(localStorage.getItem(this.ORDER_KEY)) || {},
      reposRecentes: JSON.parse(localStorage.getItem(this.REPOS_RECENTES_KEY)) || [],
      githubPrefs: JSON.parse(localStorage.getItem(this.GITHUB_PREFS_KEY)) || {},
      githubCache: JSON.parse(localStorage.getItem(this.GITHUB_CACHE_KEY)) || {},
      profileSettings: this.getProfileSettings(),
      uiPrefs: this.getUiPrefs(),
      workspace: this.currentWorkspace || "default",
      fearlessSeeded: localStorage.getItem(this.FEARLESS_SEED_KEY) === "1",
      avatar: this.getAvatar() || null
    };
  },

  applySnapshot(data) {
    if (!data || typeof data !== "object") return;

    const importedItems = Array.isArray(data.items)
      ? data.items
      : (Array.isArray(data.swiftItems) ? data.swiftItems : null);

    if (importedItems) {
      localStorage.setItem(this.KEY, JSON.stringify(importedItems));
    }

    if (data.orders && typeof data.orders === "object") {
      localStorage.setItem(this.ORDER_KEY, JSON.stringify(data.orders));
    }

    if (Array.isArray(data.reposRecentes)) {
      localStorage.setItem(this.REPOS_RECENTES_KEY, JSON.stringify(data.reposRecentes));
    }

    if (data.githubPrefs && typeof data.githubPrefs === "object") {
      localStorage.setItem(this.GITHUB_PREFS_KEY, JSON.stringify(data.githubPrefs));
    }

    if (data.githubCache && typeof data.githubCache === "object") {
      localStorage.setItem(this.GITHUB_CACHE_KEY, JSON.stringify(data.githubCache));
    }

    if (data.profileSettings && typeof data.profileSettings === "object") {
      localStorage.setItem(this.PROFILE_SETTINGS_KEY, JSON.stringify(data.profileSettings));
    }

    if (data.uiPrefs && typeof data.uiPrefs === "object") {
      localStorage.setItem(this.UI_PREFS_KEY, JSON.stringify(data.uiPrefs));
    }

    if (data.fearlessSeeded === true) {
      localStorage.setItem(this.FEARLESS_SEED_KEY, "1");
    }

    if (Object.prototype.hasOwnProperty.call(data, "avatar")) {
      if (data.avatar) {
        localStorage.setItem(this.AVATAR_KEY, data.avatar);
      } else {
        localStorage.removeItem(this.AVATAR_KEY);
      }
    }
  },

  snapshotScore(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return 0;
    const itemsCount = Array.isArray(snapshot.items) ? snapshot.items.length : 0;
    const recentCount = Array.isArray(snapshot.reposRecentes) ? snapshot.reposRecentes.length : 0;
    const prefsCount = snapshot.githubPrefs && typeof snapshot.githubPrefs === "object"
      ? Object.keys(snapshot.githubPrefs).length
      : 0;
    const profileCount = snapshot.profileSettings && typeof snapshot.profileSettings === "object"
      ? Object.values(snapshot.profileSettings).filter(Boolean).length
      : 0;
    const hasAvatar = snapshot.avatar ? 1 : 0;
    return itemsCount * 10 + recentCount * 3 + prefsCount * 2 + profileCount * 2 + hasAvatar;
  },

  scheduleSync() {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.pushStateToServer().catch(() => {
        // Mantem funcionamento offline/local mesmo sem backend disponivel.
      });
    }, 300);
  },

  buildSnapshotSignature(snapshot) {
    return JSON.stringify(snapshot);
  },

  maybeScheduleVersion(snapshot, label = "auto") {
    const signature = this.buildSnapshotSignature(snapshot);
    const now = Date.now();
    if (signature === this.lastVersionSignature) return;
    if (now - this.lastVersionAt < this.AUTO_VERSION_INTERVAL_MS) return;

    clearTimeout(this.versionTimer);
    this.versionTimer = setTimeout(() => {
      this.createServerVersion(label, snapshot).catch(() => {
        // Falha de rede nao interrompe o uso local.
      });
    }, 400);
  },

  async createServerVersion(label = "manual", snapshot = null) {
    if (!this.hasSupabase) return null;
    const state = snapshot || this.getSnapshot();

    const { error } = await supabase
      .from('app_state_versions')
      .insert({ scope: this.STATE_SCOPE, state, label });

    if (error) throw new Error("Falha ao criar versao: " + error.message);

    this.lastVersionAt = Date.now();
    this.lastVersionSignature = this.buildSnapshotSignature(state);
  },

  async listServerVersions(limit = 30) {
    if (!this.hasSupabase) return [];

    const { data, error } = await supabase
      .from('app_state_versions')
      .select('id, scope, label, created_at')
      .eq('scope', this.STATE_SCOPE)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error("Falha ao listar versoes: " + error.message);
    return data;
  },

  async restoreServerVersion(versionId) {
    if (!this.hasSupabase) throw new Error("Supabase nao configurado");

    const { data: version, error: fetchErr } = await supabase
      .from('app_state_versions')
      .select('state')
      .eq('scope', this.STATE_SCOPE)
      .eq('id', versionId)
      .single();

    if (fetchErr || !version) throw new Error("Versao nao encontrada");

    // Upsert estado atual com a versao restaurada
    await supabase
      .from('app_state')
      .upsert({ scope: this.STATE_SCOPE, state: version.state, updated_at: new Date().toISOString() }, { onConflict: 'scope' });

    // Registra restauracao no historico
    await supabase
      .from('app_state_versions')
      .insert({ scope: this.STATE_SCOPE, state: version.state, label: 'restore-from-' + versionId });

    this.applySnapshot(version.state);
    return version;
  },

  async pushStateToServer() {
    if (!this.hasSupabase) return;
    const snapshot = this.getSnapshot();

    const { error } = await supabase
      .from('app_state')
      .upsert({ scope: this.STATE_SCOPE, state: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'scope' });

    if (error) throw new Error("Falha ao salvar estado: " + error.message);

    this.maybeScheduleVersion(snapshot, "auto");
  },

  async hydrateFromServer() {
    if (!this.hasSupabase) return false;
    try {
      const loadByScope = async (scope) => {
        const { data, error } = await supabase
          .from('app_state')
          .select('state')
          .eq('scope', scope)
          .single();

        if (error || !data || !data.state) return null;
        return data.state;
      };

      let state = await loadByScope(this.STATE_SCOPE);

      // Compatibilidade com escopo legado (antes do workspace no scope).
      if (!state && this.currentWorkspace === 'default' && this.currentUserId) {
        const legacyState = await loadByScope(this.currentUserId);
        if (legacyState) {
          state = legacyState;

          // Migra escopo legado -> novo sem apagar o antigo.
          await supabase
            .from('app_state')
            .upsert(
              { scope: this.STATE_SCOPE, state: legacyState, updated_at: new Date().toISOString() },
              { onConflict: 'scope' }
            );
        }
      }

      if (!state) return false;
      this.applySnapshot(state);
      return true;
    } catch {
      return false;
    }
  },

  async bootstrapPersistence() {
    const localBeforeHydrate = this.getSnapshot();
    const localScore = this.snapshotScore(localBeforeHydrate);

    const loaded = await this.hydrateFromServer();

    if (loaded) {
      const serverScore = this.snapshotScore(this.getSnapshot());
      if (localScore > serverScore) {
        this.applySnapshot(localBeforeHydrate);
        this.scheduleSync();
        this.createServerVersion("recover-local-priority", localBeforeHydrate).catch(() => {
          // Evita quebrar bootstrap por falha de rede.
        });
      }
    }

    this.ensureFearlessDefaults();

    const currentSnapshot = this.getSnapshot();
    this.lastVersionSignature = this.buildSnapshotSignature(currentSnapshot);

    if (!loaded) {
      this.scheduleSync();
      this.createServerVersion("bootstrap-init", currentSnapshot).catch(() => {
        // Ignora erro para manter bootstrap resiliente.
      });
    }
  },

  save(items, label = "change") {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.scheduleSync();
    this.createLocalVersion(label);
  },


  getUiPrefs() {
    return JSON.parse(localStorage.getItem(this.UI_PREFS_KEY)) || {
      quickFilter: "all",
      tag: "__all__"
    };
  },

  saveUiPrefs(prefs = {}) {
    const merged = { ...this.getUiPrefs(), ...prefs };
    localStorage.setItem(this.UI_PREFS_KEY, JSON.stringify(merged));
    this.scheduleSync();
    return merged;
  },

  listLocalVersions() {
    return JSON.parse(localStorage.getItem(this.LOCAL_VERSIONS_KEY)) || [];
  },

  createLocalVersion(label = "auto-local", snapshot = null) {
    const state = snapshot || this.getSnapshot();
    const signature = this.buildSnapshotSignature(state);
    const versions = this.listLocalVersions();

    if (versions.length && versions[0].signature === signature) {
      return versions;
    }

    const entry = {
      id: `${Date.now()}`,
      label,
      createdAt: new Date().toISOString(),
      signature,
      state
    };

    const next = [entry, ...versions].slice(0, 10);
    localStorage.setItem(this.LOCAL_VERSIONS_KEY, JSON.stringify(next));
    return next;
  },

  restoreLocalVersion(versionId) {
    const versions = this.listLocalVersions();
    const selected = versions.find((v) => String(v.id) === String(versionId));
    if (!selected || !selected.state) throw new Error("Versao local nao encontrada");

    this.applySnapshot(selected.state);
    this.scheduleSync();
    this.createLocalVersion(`restore-local-${versionId}`, this.getSnapshot());
    return selected;
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
      this.scheduleSync();
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
    this.scheduleSync();
    this.createLocalVersion("reorder");
  },

  // ===== 6) BACKUP =====
  exportData() {
    // Exporta dados do app em um unico JSON de backup.
    const data = { ...this.getSnapshot(), exportedAt: new Date().toISOString() };
    this.createLocalVersion("export-manual", data);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taylorswift-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);

    this.createServerVersion("export-manual", data).catch(() => {
      // Export local continua funcionando mesmo sem backend.
    });
  },

  // ===== 7) FOTO DE PERFIL =====
  AVATAR_KEY: "swiftAvatar",

  // ===== 8) SETTINGS PROFILE =====
  getProfileSettings() {
    return JSON.parse(localStorage.getItem(this.PROFILE_SETTINGS_KEY)) || {};
  },

  saveProfileSettings(profileData) {
    const current = this.getProfileSettings();
    const merged = { ...current, ...profileData };
    localStorage.setItem(this.PROFILE_SETTINGS_KEY, JSON.stringify(merged));
    this.scheduleSync();
    this.createLocalVersion("profile-update");
    return merged;
  },

  async saveProfileAndAllData(profileData) {
    // Salva perfil localmente e sincroniza um snapshot completo do app.
    this.saveProfileSettings(profileData);
    const snapshot = this.getSnapshot();
    await this.pushStateToServer();
    await this.createServerVersion("settings-profile-save", snapshot);
    return snapshot;
  },

  getAvatar() {
    return localStorage.getItem(this.AVATAR_KEY) || "";
  },

  saveAvatar(dataUrl) {
    localStorage.setItem(this.AVATAR_KEY, dataUrl);
    this.scheduleSync();
  },

  removeAvatar() {
    localStorage.removeItem(this.AVATAR_KEY);
    this.scheduleSync();
  },

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const beforeImport = this.getSnapshot();
          this.createServerVersion("pre-import", beforeImport).catch(() => {
            // Sem bloqueio em caso de falha.
          });

          // Import parcial tolerante:
          // se um bloco nao existir no arquivo, os demais ainda podem ser aplicados.
          const data = JSON.parse(e.target.result);
          const importedItems = Array.isArray(data.items)
            ? data.items
            : (Array.isArray(data.swiftItems) ? data.swiftItems : null);

          this.applySnapshot(data);
          this.scheduleSync();
          await this.createServerVersion("import-backup", this.getSnapshot()).catch(() => {
            // Import nao falha caso o versionamento remoto falhe.
          });

          resolve(importedItems ? importedItems.length : 0);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};

window.Storage = Storage;
export default Storage;

