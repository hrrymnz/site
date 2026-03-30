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
  REPOS_PINNED_KEY: "reposPinned",
  REPOS_RECENTES_KEY: "reposRecentes",
  GITHUB_PREFS_KEY: "githubDashboardPrefs",
  GITHUB_CACHE_KEY: "githubDashboardCache",
  PROFILE_SETTINGS_KEY: "swiftProfileSettings",
  UI_PREFS_KEY: "swiftUiPrefs",
  LOCAL_VERSIONS_KEY: "swiftLocalVersions",
  NOTIFICATIONS_KEY: "swiftNotifications",
  AVATAR_KEY: "swiftAvatar",
  HEADER_KEY: "swiftProfileHeader",
  STATE_META_KEY: "swiftStateMeta",
  STATE_SCOPE: "default",
  currentUserId: null,
  currentWorkspace: "default",
  workspacesEnabled: false,
  hasPendingSync: false,
  lastRemoteUpdatedAt: "",
  remoteRefreshInFlight: false,
  syncStatus: "idle",
  syncStatusMessage: "Pronto para sincronizar",
  syncTimer: null,
  versionTimer: null,
  lastNotifiedSyncStatus: "",
  lastNotifiedSyncAt: 0,
  lastVersionAt: 0,
  lastVersionSignature: "",
  AUTO_VERSION_INTERVAL_MS: 5 * 60 * 1000,

  get hasSupabase() {
    return !!supabase;
  },

  getSyncStatus() {
    return {
      status: this.syncStatus || "idle",
      message: this.syncStatusMessage || "Pronto para sincronizar",
      lastSyncedAt: String(this.lastRemoteUpdatedAt || "")
    };
  },

  emitSyncStatus() {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("storage-sync-status", {
      detail: this.getSyncStatus()
    }));
  },

  emitNotificationsUpdated() {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("storage-notifications-updated", {
      detail: {
        notifications: this.getNotifications(),
        unreadCount: this.getUnreadNotificationsCount()
      }
    }));
  },

  setSyncStatus(status = "idle", message = "") {
    const fallbackMessages = {
      idle: "Pronto para sincronizar",
      saving: "Salvando...",
      saved: "Salvo no servidor",
      error: "Erro de sincronizacao",
      local: "Somente local"
    };

    this.maybeNotifySyncStatus(status, String(message || fallbackMessages[status] || fallbackMessages.idle));
    this.syncStatus = status;
    this.syncStatusMessage = String(message || fallbackMessages[status] || fallbackMessages.idle);
    this.emitSyncStatus();
    return this.getSyncStatus();
  },

  setUser(userId, workspacesEnabled = false) {
    this.currentUserId = userId;
    this.workspacesEnabled = !!workspacesEnabled;
    this.hasPendingSync = false;
    this.lastRemoteUpdatedAt = "";
    this.setSyncStatus(this.hasSupabase ? "idle" : "local");

    if (this.workspacesEnabled) {
      const workspaceFromStorage = userId ? localStorage.getItem(`${userId}_activeWorkspace`) : null;
      this.currentWorkspace = workspaceFromStorage || "default";
    } else {
      this.currentWorkspace = "default";
    }

    this.applyKeyPrefix();
    this.migrateLegacyKeysIfNeeded();
  },

  setWorkspace(workspaceId) {
    if (!this.workspacesEnabled) {
      this.currentWorkspace = "default";
      this.hasPendingSync = false;
      this.lastRemoteUpdatedAt = "";
      this.applyKeyPrefix();
      this.migrateLegacyKeysIfNeeded();
      return;
    }

    this.currentWorkspace = workspaceId || "default";
    this.hasPendingSync = false;
    this.lastRemoteUpdatedAt = "";
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
    const remoteScope = !this.currentUserId
      ? "default"
      : (!this.workspacesEnabled || workspacePrefix === "default")
        ? this.currentUserId
        : `${this.currentUserId}:${workspacePrefix}`;

    // O Supabase atual autoriza o scope base do usuario (auth.uid()).
    // Quando workspaces estao desabilitados, persistimos remotamente sem sufixo.
    this.STATE_SCOPE = remoteScope;
    this.KEY = prefix + "swiftItems";
    this.ORDER_KEY = prefix + "swiftItemsOrder";
    this.FEARLESS_SEED_KEY = prefix + "fearlessDefaultSeeded";
    this.REPOS_PINNED_KEY = prefix + "reposPinned";
    this.REPOS_RECENTES_KEY = prefix + "reposRecentes";
    this.GITHUB_PREFS_KEY = prefix + "githubDashboardPrefs";
    this.GITHUB_CACHE_KEY = prefix + "githubDashboardCache";
    this.PROFILE_SETTINGS_KEY = prefix + "swiftProfileSettings";
    this.AVATAR_KEY = prefix + "swiftAvatar";
    this.HEADER_KEY = prefix + "swiftProfileHeader";
    this.UI_PREFS_KEY = prefix + "swiftUiPrefs";
    this.LOCAL_VERSIONS_KEY = prefix + "swiftLocalVersions";
    this.NOTIFICATIONS_KEY = prefix + "swiftNotifications";
    this.SYNC_NOTIFICATIONS_META_KEY = prefix + "swiftSyncNotificationsMeta";
    this.STATE_META_KEY = prefix + "swiftStateMeta";
  },


  migrateLegacyKeysIfNeeded() {
    if (!this.currentUserId) return;
    if ((this.currentWorkspace || "default") !== "default") return;

    const userPrefix = this.currentUserId.slice(0, 8) + "_";
    const legacyMap = [
      [this.KEY, userPrefix + "swiftItems"],
      [this.ORDER_KEY, userPrefix + "swiftItemsOrder"],
      [this.FEARLESS_SEED_KEY, userPrefix + "fearlessDefaultSeeded"],
      [this.REPOS_PINNED_KEY, userPrefix + "reposPinned"],
      [this.REPOS_RECENTES_KEY, userPrefix + "reposRecentes"],
      [this.GITHUB_PREFS_KEY, userPrefix + "githubDashboardPrefs"],
      [this.GITHUB_CACHE_KEY, userPrefix + "githubDashboardCache"],
      [this.PROFILE_SETTINGS_KEY, userPrefix + "swiftProfileSettings"],
      [this.AVATAR_KEY, userPrefix + "swiftAvatar"],
      [this.HEADER_KEY, userPrefix + "swiftProfileHeader"],
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
  DEFAULT_PINNED_REPOS: [],

  safeParse(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  },

  toTimestampMs(value) {
    if (!value) return 0;
    const ms = new Date(String(value)).getTime();
    return Number.isFinite(ms) ? ms : 0;
  },

  getLocalStateMeta() {
    return this.normalizePlainObject(this.safeParse(this.STATE_META_KEY, {}));
  },

  getLocalStateUpdatedAt() {
    return String(this.getLocalStateMeta().updatedAt || "");
  },

  setLocalStateUpdatedAt(updatedAt = "") {
    const nextUpdatedAt = String(updatedAt || new Date().toISOString()).trim();
    if (!nextUpdatedAt) return "";
    localStorage.setItem(this.STATE_META_KEY, JSON.stringify({ updatedAt: nextUpdatedAt }));
    return nextUpdatedAt;
  },

  normalizeNotification(raw) {
    const base = raw && typeof raw === "object" ? raw : {};
    const level = ["success", "error", "warning", "info"].includes(String(base.level || "").trim())
      ? String(base.level).trim()
      : "info";
    const category = ["sync", "backup", "import", "github", "system"].includes(String(base.category || "").trim())
      ? String(base.category).trim()
      : "system";

    return {
      id: String(base.id || this.generateId()).trim(),
      title: String(base.title || "").trim() || "Atualização",
      message: String(base.message || "").trim() || "",
      category,
      level,
      read: !!base.read,
      createdAt: String(base.createdAt || new Date().toISOString()).trim(),
      meta: this.normalizePlainObject(base.meta)
    };
  },

  getNotifications() {
    const saved = this.safeParse(this.NOTIFICATIONS_KEY, []);
    if (!Array.isArray(saved)) return [];

    return saved
      .map((entry) => this.normalizeNotification(entry))
      .sort((a, b) => this.toTimestampMs(b.createdAt) - this.toTimestampMs(a.createdAt))
      .slice(0, 50);
  },

  getUnreadNotificationsCount() {
    return this.getNotifications().filter((entry) => !entry.read).length;
  },

  saveNotifications(notifications = []) {
    const normalized = Array.isArray(notifications)
      ? notifications.map((entry) => this.normalizeNotification(entry)).slice(0, 50)
      : [];
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(normalized));
    this.emitNotificationsUpdated();
    return normalized;
  },

  addNotification(notification = {}) {
    const nextNotification = this.normalizeNotification(notification);
    const current = this.getNotifications();
    const nextTime = this.toTimestampMs(nextNotification.createdAt);
    const hasDuplicate = current.some((entry) => (
      entry.category === nextNotification.category &&
      entry.level === nextNotification.level &&
      entry.title === nextNotification.title &&
      entry.message === nextNotification.message &&
      Math.abs(nextTime - this.toTimestampMs(entry.createdAt)) < 10000
    ));
    if (hasDuplicate) return current;

    return this.saveNotifications([nextNotification, ...current]);
  },

  markAllNotificationsRead() {
    const current = this.getNotifications();
    const hasUnread = current.some((entry) => !entry.read);
    if (!hasUnread) return current;
    return this.saveNotifications(current.map((entry) => ({ ...entry, read: true })));
  },

  clearNotifications() {
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify([]));
    this.emitNotificationsUpdated();
    return [];
  },

  getSyncNotificationMeta() {
    return this.normalizePlainObject(this.safeParse(this.SYNC_NOTIFICATIONS_META_KEY, {}));
  },

  saveSyncNotificationMeta(meta = {}) {
    const normalized = this.normalizePlainObject(meta);
    localStorage.setItem(this.SYNC_NOTIFICATIONS_META_KEY, JSON.stringify(normalized));
    return normalized;
  },

  maybeNotifySyncStatus(status, message) {
    if (!["saved", "error", "local"].includes(status)) return;

    const notificationKey = `${status}:${message}`;
    const now = Date.now();

    if (status === "saved" && message === "Atualizado do servidor") {
      this.addNotification({
        category: "sync",
        level: "info",
        title: "Dados atualizados",
        message: "Alterações feitas em outro dispositivo chegaram nesta sessão.",
        createdAt: new Date(now).toISOString()
      });
      return;
    }

    if (status === "error") {
      this.addNotification({
        category: "sync",
        level: "error",
        title: "Erro de sincronização",
        message: "Não foi possível sincronizar com o servidor agora.",
        createdAt: new Date(now).toISOString()
      });
      return;
    }

    const throttleMs = 5 * 60 * 60 * 1000;
    const syncNotificationMeta = this.getSyncNotificationMeta();
    const lastNotifiedAt = Number(syncNotificationMeta[notificationKey] || 0);

    if (lastNotifiedAt && now - lastNotifiedAt < throttleMs) {
      return;
    }

    this.lastNotifiedSyncStatus = notificationKey;
    this.lastNotifiedSyncAt = now;
    syncNotificationMeta[notificationKey] = now;
    this.saveSyncNotificationMeta(syncNotificationMeta);

    if (status === "saved") {
      this.addNotification({
        category: "sync",
        level: "success",
        title: "Salvo no servidor",
        message: "Suas alterações foram sincronizadas com sucesso.",
        createdAt: new Date(now).toISOString()
      });
      return;
    }

    this.addNotification({
      category: "sync",
      level: "warning",
      title: "Somente local",
      message: "As alterações estão disponíveis apenas neste dispositivo por enquanto.",
      createdAt: new Date(now).toISOString()
    });
  },

  generateId() {
    if (typeof crypto !== "undefined" && crypto && typeof crypto.randomUUID === "function") {
      try {
        return crypto.randomUUID();
      } catch {
        // Fallback abaixo cobre ambientes sem suporte ou com erro na API.
      }
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  },

  isExplicitUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^(https?:\/\/|www\.)/i.test(raw)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|\?|#)/i.test(raw);
  },

  getUrlHostLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(normalized);
      return String(parsed.hostname || "").replace(/^www\./i, "").trim();
    } catch {
      return "";
    }
  },

  normalizeTitle(rawTitle, fallbackUrl = "") {
    const title = String(rawTitle != null ? rawTitle : "").trim();
    if (!title) return "";
    if (!this.isExplicitUrl(title)) return title;
    return this.getUrlHostLabel(fallbackUrl) || this.getUrlHostLabel(title) || "";
  },

  isUrlLikeTag(value) {
    const raw = String(value || "").trim();
    if (!raw) return false;
    if (/^(https?:\/\/|www\.)/i.test(raw)) return true;
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(normalized);
      return !!(parsed.hostname && /\./.test(parsed.hostname));
    } catch {
      return false;
    }
  },

  normalizeTags(rawTags) {
    if (!Array.isArray(rawTags)) return [];

    const seen = new Set();
    return rawTags
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter((tag) => tag && !this.isUrlLikeTag(tag))
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  },

  normalizeItem(raw) {
    const base = raw && typeof raw === "object" ? raw : {};
    const normalized = { ...base };

    let id = typeof base.id === "string" ? base.id.trim() : "";
    if (!id) {
      id = this.generateId();
    }
    normalized.id = id;

    const type = (base.type != null ? String(base.type) : "link").trim() || "link";
    normalized.type = type;

    normalized.url = (base.url != null ? String(base.url) : "").trim();
    normalized.title = this.normalizeTitle(base.title, normalized.url);
    normalized.content = base.content != null ? String(base.content) : "";
    normalized.category = (base.category != null ? String(base.category) : "debut").trim() || "debut";
    normalized.tags = this.normalizeTags(base.tags);

    if (type === "checklist") {
      const checklist = Array.isArray(base.checklistItems) ? base.checklistItems : [];
      normalized.checklistItems = checklist
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const text = entry.text != null ? String(entry.text).trim() : "";
          const completed = !!entry.completed;
          if (!text) return null;
          return { text, completed };
        })
        .filter(Boolean);
    } else if (Object.prototype.hasOwnProperty.call(normalized, "checklistItems")) {
      if (!Array.isArray(normalized.checklistItems)) {
        delete normalized.checklistItems;
      }
    }

    return normalized;
  },

  isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  },

  normalizePlainObject(raw) {
    return this.isPlainObject(raw) ? { ...raw } : {};
  },

  normalizeOrderMap(raw, validIds = null, idMap = null) {
    if (!this.isPlainObject(raw)) return {};

    const normalized = {};
    Object.entries(raw).forEach(([category, ids]) => {
      const key = String(category || "").trim();
      if (!key || !Array.isArray(ids)) return;

      const seen = new Set();
      const nextIds = [];

      ids.forEach((entry) => {
        let id = typeof entry === "string" ? entry.trim() : String(entry || "").trim();
        if (!id) return;
        if (idMap && idMap[id]) id = idMap[id];
        if (validIds && !validIds.has(id)) return;
        if (seen.has(id)) return;
        seen.add(id);
        nextIds.push(id);
      });

      if (nextIds.length) {
        normalized[key] = nextIds;
      }
    });

    return normalized;
  },

  normalizePinnedRepo(raw, idMap = null) {
    const base = raw && typeof raw === "object" ? raw : {};
    let sourceId = String(base.sourceId || "").trim();
    if (sourceId && idMap && idMap[sourceId]) {
      sourceId = idMap[sourceId];
    }

    const normalized = {
      sourceId,
      estilo: base.estilo === "light" ? "light" : "primary",
      nome: String(base.nome || "").trim(),
      descricao: String(base.descricao || "").trim(),
      slug: String(base.slug || "").trim(),
      url: String(base.url || "").trim()
    };

    if (!normalized.sourceId && !normalized.slug && !normalized.url && !normalized.nome) {
      return null;
    }

    return normalized;
  },

  normalizeReposRecentes(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry) => {
        if (typeof entry === "string") {
          const slug = entry.trim();
          if (!slug) return null;
          return { slug, titulo: slug };
        }

        if (!entry || typeof entry !== "object") return null;

        const slug = String(entry.slug || "").trim();
        if (!slug) return null;

        const titulo = String(entry.titulo || entry.title || entry.nome || slug).trim() || slug;
        return { slug, titulo };
      })
      .filter(Boolean);
  },

  normalizeProfileSettings(raw) {
    const base = this.normalizePlainObject(raw);
    const normalized = {};

    Object.entries(base).forEach(([key, value]) => {
      const nextKey = String(key || "").trim();
      if (!nextKey) return;
      normalized[nextKey] = value == null ? "" : String(value).trim();
    });

    return normalized;
  },

  normalizeUiPrefs(raw, withDefaults = false) {
    const base = this.normalizePlainObject(raw);
    const normalized = {};

    if (typeof base.quickFilter === "string" && base.quickFilter.trim()) {
      normalized.quickFilter = base.quickFilter.trim();
    }

    if (typeof base.tag === "string" && base.tag.trim()) {
      normalized.tag = base.tag.trim();
    }

    if (withDefaults) {
      return {
        quickFilter: normalized.quickFilter || "all",
        tag: normalized.tag || "__all__"
      };
    }

    return normalized;
  },

  isFilledValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (this.isPlainObject(value)) return Object.keys(value).length > 0;
    return true;
  },

  mergeObjectsFillMissing(current, imported) {
    const base = this.normalizePlainObject(current);
    const source = this.normalizePlainObject(imported);
    const merged = { ...base };

    Object.entries(source).forEach(([key, importedValue]) => {
      const currentValue = merged[key];

      if (this.isPlainObject(currentValue) && this.isPlainObject(importedValue)) {
        merged[key] = this.mergeObjectsFillMissing(currentValue, importedValue);
        return;
      }

      if (!this.isFilledValue(currentValue) && this.isFilledValue(importedValue)) {
        merged[key] = importedValue;
      }
    });

    return merged;
  },

  getItemIdentity(raw) {
    const item = this.normalizeItem(raw);
    const type = String(item.type || "").trim().toLowerCase();
    const category = String(item.category || "").trim().toLowerCase();
    const title = String(item.title || "").trim().toLowerCase();
    const url = String(item.url || "").trim().toLowerCase();
    const content = String(item.content || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 1000);

    if (type === "checklist") {
      const checklistKey = Array.isArray(item.checklistItems)
        ? item.checklistItems
            .map((entry) => `${String(entry.text || "").trim().toLowerCase()}::${entry.completed ? "1" : "0"}`)
            .join("|")
        : "";
      return [type, category, title, content, checklistKey].join("::");
    }

    if (url) {
      return [type, category, title, url].join("::");
    }

    return [type, category, title, content].join("::");
  },

  mergeItemsNonDestructive(importedItems) {
    const currentItems = Array.isArray(this.getAll()) ? this.getAll().slice() : [];
    const mergedItems = currentItems.slice();
    const existingIds = new Set();
    const identityToId = new Map();
    const idMap = {};
    let addedCount = 0;

    currentItems.forEach((item) => {
      const itemId = typeof item?.id === "string" ? item.id.trim() : "";
      if (itemId) {
        existingIds.add(itemId);
        idMap[itemId] = itemId;
      }

      const identity = this.getItemIdentity(item);
      if (identity && itemId && !identityToId.has(identity)) {
        identityToId.set(identity, itemId);
      }
    });

    if (!Array.isArray(importedItems)) {
      return { items: mergedItems, addedCount, idMap };
    }

    importedItems.forEach((rawItem) => {
      const item = this.normalizeItem(rawItem);

      if (existingIds.has(item.id)) {
        idMap[item.id] = item.id;
        return;
      }

      const identity = this.getItemIdentity(item);
      const matchedId = identity ? identityToId.get(identity) : "";
      if (matchedId) {
        idMap[item.id] = matchedId;
        return;
      }

      mergedItems.push(item);
      existingIds.add(item.id);
      idMap[item.id] = item.id;
      if (identity) {
        identityToId.set(identity, item.id);
      }
      addedCount += 1;
    });

    return { items: mergedItems, addedCount, idMap };
  },

  mergeOrdersNonDestructive(importedOrders, validIds, idMap = null) {
    const current = this.normalizeOrderMap(this.safeParse(this.ORDER_KEY, {}), validIds);
    const incoming = this.normalizeOrderMap(importedOrders, validIds, idMap);
    const merged = { ...current };

    Object.entries(incoming).forEach(([category, ids]) => {
      const existing = Array.isArray(merged[category]) ? merged[category] : [];
      const seen = new Set(existing);
      const next = existing.slice();

      ids.forEach((id) => {
        if (seen.has(id)) return;
        seen.add(id);
        next.push(id);
      });

      if (next.length) {
        merged[category] = next;
      }
    });

    return merged;
  },

  mergePinnedReposNonDestructive(importedRepos, idMap = null) {
    const current = this.getPinnedRepos()
      .map((repo) => this.normalizePinnedRepo(repo))
      .filter(Boolean);
    const incoming = Array.isArray(importedRepos)
      ? importedRepos.map((repo) => this.normalizePinnedRepo(repo, idMap)).filter(Boolean)
      : [];

    const merged = current.slice();
    const seen = new Set(
      current.map((repo) => {
        if (repo.sourceId) return `id:${repo.sourceId}`;
        return `meta:${repo.slug.toLowerCase()}|${repo.url.toLowerCase()}|${repo.nome.toLowerCase()}`;
      })
    );

    incoming.forEach((repo) => {
      const key = repo.sourceId
        ? `id:${repo.sourceId}`
        : `meta:${repo.slug.toLowerCase()}|${repo.url.toLowerCase()}|${repo.nome.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(repo);
    });

    return merged;
  },

  mergeReposRecentesNonDestructive(importedRecentes) {
    const current = this.normalizeReposRecentes(this.safeParse(this.REPOS_RECENTES_KEY, []));
    const incoming = this.normalizeReposRecentes(importedRecentes);
    const merged = current.slice();
    const seen = new Set(current.map((repo) => repo.slug.toLowerCase()));

    incoming.forEach((repo) => {
      const slug = repo.slug.toLowerCase();
      if (seen.has(slug)) return;
      seen.add(slug);
      merged.push(repo);
    });

    return merged.slice(0, 10);
  },

  mergeSnapshotNonDestructive(data) {
    if (!data || typeof data !== "object") {
      return { addedItemsCount: 0 };
    }

    const importedItems = Array.isArray(data.items)
      ? data.items
      : (Array.isArray(data.swiftItems) ? data.swiftItems : []);

    const itemMerge = this.mergeItemsNonDestructive(importedItems);
    localStorage.setItem(this.KEY, JSON.stringify(itemMerge.items));

    const validIds = new Set(
      itemMerge.items
        .map((item) => (typeof item?.id === "string" ? item.id.trim() : ""))
        .filter(Boolean)
    );

    const mergedOrders = this.mergeOrdersNonDestructive(data.orders, validIds, itemMerge.idMap);
    localStorage.setItem(this.ORDER_KEY, JSON.stringify(mergedOrders));

    const mergedPinnedRepos = this.mergePinnedReposNonDestructive(data.reposPinned, itemMerge.idMap);
    localStorage.setItem(this.REPOS_PINNED_KEY, JSON.stringify(mergedPinnedRepos));

    const mergedRecentRepos = this.mergeReposRecentesNonDestructive(data.reposRecentes);
    localStorage.setItem(this.REPOS_RECENTES_KEY, JSON.stringify(mergedRecentRepos));

    const mergedGithubPrefs = this.mergeObjectsFillMissing(
      this.normalizePlainObject(this.safeParse(this.GITHUB_PREFS_KEY, {})),
      this.normalizePlainObject(data.githubPrefs)
    );
    localStorage.setItem(this.GITHUB_PREFS_KEY, JSON.stringify(mergedGithubPrefs));

    const mergedGithubCache = this.mergeObjectsFillMissing(
      this.normalizePlainObject(this.safeParse(this.GITHUB_CACHE_KEY, {})),
      this.normalizePlainObject(data.githubCache)
    );
    localStorage.setItem(this.GITHUB_CACHE_KEY, JSON.stringify(mergedGithubCache));

    const mergedProfileSettings = this.mergeObjectsFillMissing(
      this.normalizeProfileSettings(this.safeParse(this.PROFILE_SETTINGS_KEY, {})),
      this.normalizeProfileSettings(data.profileSettings)
    );
    localStorage.setItem(this.PROFILE_SETTINGS_KEY, JSON.stringify(mergedProfileSettings));

    const mergedUiPrefs = this.mergeObjectsFillMissing(
      this.normalizeUiPrefs(this.safeParse(this.UI_PREFS_KEY, null), false),
      this.normalizeUiPrefs(data.uiPrefs, false)
    );
    localStorage.setItem(this.UI_PREFS_KEY, JSON.stringify(mergedUiPrefs));

    if (data.fearlessSeeded === true || localStorage.getItem(this.FEARLESS_SEED_KEY) === "1") {
      localStorage.setItem(this.FEARLESS_SEED_KEY, "1");
    }

    const currentAvatar = localStorage.getItem(this.AVATAR_KEY) || "";
    if (!currentAvatar && data.avatar) {
      localStorage.setItem(this.AVATAR_KEY, data.avatar);
    }

    const currentHeader = localStorage.getItem(this.HEADER_KEY) || "";
    if (!currentHeader && data.profileHeader) {
      localStorage.setItem(this.HEADER_KEY, data.profileHeader);
    }

    return { addedItemsCount: itemMerge.addedCount };
  },

  getAll() {
    return this.safeParse(this.KEY, []);
  },

  getSnapshot() {
    return {
      items: this.getAll(),
      orders: this.safeParse(this.ORDER_KEY, {}),
      reposPinned: this.getPinnedRepos(),
      reposRecentes: this.safeParse(this.REPOS_RECENTES_KEY, []),
      githubPrefs: this.safeParse(this.GITHUB_PREFS_KEY, {}),
      githubCache: this.safeParse(this.GITHUB_CACHE_KEY, {}),
      profileSettings: this.getProfileSettings(),
      uiPrefs: this.getUiPrefs(),
      workspace: this.currentWorkspace || "default",
      fearlessSeeded: localStorage.getItem(this.FEARLESS_SEED_KEY) === "1",
      avatar: this.getAvatar() || null,
      profileHeader: this.getProfileHeader() || null
    };
  },

  applySnapshot(data) {
    if (!data || typeof data !== "object") return;

    const importedItems = Array.isArray(data.items)
      ? data.items
      : (Array.isArray(data.swiftItems) ? data.swiftItems : null);

    if (importedItems) {
      const normalizedItems = importedItems.map((item) => this.normalizeItem(item));
      localStorage.setItem(this.KEY, JSON.stringify(normalizedItems));
    }

    if (data.orders && typeof data.orders === "object") {
      localStorage.setItem(this.ORDER_KEY, JSON.stringify(data.orders));
    }

    if (Array.isArray(data.reposPinned)) {
      localStorage.setItem(this.REPOS_PINNED_KEY, JSON.stringify(data.reposPinned));
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
    if (Object.prototype.hasOwnProperty.call(data, "profileHeader")) {
      if (data.profileHeader) {
        localStorage.setItem(this.HEADER_KEY, data.profileHeader);
      } else {
        localStorage.removeItem(this.HEADER_KEY);
      }
    }
  },

  snapshotScore(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return 0;
    const itemsCount = Array.isArray(snapshot.items) ? snapshot.items.length : 0;
    const pinnedReposCount = Array.isArray(snapshot.reposPinned) ? snapshot.reposPinned.length : 0;
    const recentCount = Array.isArray(snapshot.reposRecentes) ? snapshot.reposRecentes.length : 0;
    const prefsCount = snapshot.githubPrefs && typeof snapshot.githubPrefs === "object"
      ? Object.keys(snapshot.githubPrefs).length
      : 0;
    const profileCount = snapshot.profileSettings && typeof snapshot.profileSettings === "object"
      ? Object.values(snapshot.profileSettings).filter(Boolean).length
      : 0;
    const hasAvatar = snapshot.avatar ? 1 : 0;
    const hasHeader = snapshot.profileHeader ? 1 : 0;
    return itemsCount * 10 + pinnedReposCount * 4 + recentCount * 3 + prefsCount * 2 + profileCount * 2 + hasAvatar + hasHeader;
  },

  scheduleSync() {
    // Toda mudanca local renova o "updatedAt" antes de entrar na fila de sync remota.
    this.setLocalStateUpdatedAt();
    this.hasPendingSync = true;
    this.setSyncStatus(this.hasSupabase ? "saving" : "local");
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.pushStateToServer().catch(() => {
        this.setSyncStatus(this.hasSupabase ? "error" : "local");
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

  getServerScopeCandidates() {
    // O app atual usa auth.uid() como scope principal, mas ainda tenta ler
    // escopos legados para recuperar estados salvos antes da migracao.
    const scopes = [this.STATE_SCOPE];

    if (!this.currentUserId) {
      return scopes.filter(Boolean);
    }

    if (this.currentWorkspace === 'default') {
      scopes.push(`${this.currentUserId}:default`);
    }

    if (this.STATE_SCOPE !== this.currentUserId) {
      scopes.push(this.currentUserId);
    }

    return Array.from(new Set(scopes.filter(Boolean)));
  },

  async fetchServerStateRecord() {
    if (!this.hasSupabase) return null;

    const loadByScope = async (scope) => {
      const { data, error } = await supabase
        .from('app_state')
        .select('state, updated_at')
        .eq('scope', scope)
        .maybeSingle();

      if (error || !data || !data.state) return null;
      return data;
    };

    const scopes = this.getServerScopeCandidates();
    let record = null;

    for (const scope of scopes) {
      const scopedRecord = await loadByScope(scope);
      if (!scopedRecord) continue;

      record = scopedRecord;

      if (scope !== this.STATE_SCOPE) {
        await supabase
          .from('app_state')
          .upsert(
            { scope: this.STATE_SCOPE, state: scopedRecord.state, updated_at: new Date().toISOString() },
            { onConflict: 'scope' }
          );
      }
      break;
    }

    return record;
  },

  async fetchLatestServerVersionRecord(limit = 10) {
    if (!this.hasSupabase) return null;

    const loadLatestMeaningfulByScope = async (scope) => {
      const { data, error } = await supabase
        .from('app_state_versions')
        .select('state, created_at, label')
        .eq('scope', scope)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !Array.isArray(data)) return null;

      const meaningful = data.find((entry) => entry?.state && this.snapshotScore(entry.state) > 0);
      if (!meaningful) return null;

      return {
        state: meaningful.state,
        updated_at: String(meaningful.created_at || ""),
        label: String(meaningful.label || ""),
        scope
      };
    };

    let bestRecord = null;

    for (const scope of this.getServerScopeCandidates()) {
      const candidate = await loadLatestMeaningfulByScope(scope);
      if (!candidate) continue;

      const candidateTime = candidate.updated_at ? new Date(candidate.updated_at).getTime() : 0;
      const bestTime = bestRecord?.updated_at ? new Date(bestRecord.updated_at).getTime() : 0;

      if (!bestRecord || candidateTime >= bestTime) {
        bestRecord = candidate;
      }
    }

    return bestRecord;
  },

  async fetchBestServerStateRecord() {
    const record = await this.fetchServerStateRecord();
    const recordScore = record?.state ? this.snapshotScore(record.state) : 0;

    if (record && recordScore > 0) return record;

    const versionRecord = await this.fetchLatestServerVersionRecord();
    const versionScore = versionRecord?.state ? this.snapshotScore(versionRecord.state) : 0;

    if (!versionRecord || versionScore <= recordScore) {
      return record;
    }

    // Se a linha principal estiver vazia, tentamos reviver o estado a partir da
    // ultima versao remota consistente para evitar bootstrap em branco.
    try {
      await supabase
        .from('app_state')
        .upsert(
          {
            scope: this.STATE_SCOPE,
            state: versionRecord.state,
            updated_at: versionRecord.updated_at || new Date().toISOString()
          },
          { onConflict: 'scope' }
        );
    } catch {
      // Se a escrita falhar, ainda tentamos hidratar a UI a partir da versao.
    }

    return versionRecord;
  },

  // @deprecated Mantido para evolucao futura de restore remoto por versao.
  // Nao ha consumo ativo na UI atual (ciclo atual usa historico local).
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

  // @deprecated Mantido para evolucao futura de restore remoto por versao.
  // Nao ha consumo ativo na UI atual (ciclo atual usa historico local).
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
    this.setLocalStateUpdatedAt(new Date().toISOString());
    this.createLocalVersion(`restore-server-${versionId}`, this.getSnapshot());
    this.addNotification({
      category: "backup",
      level: "success",
      title: "Versão restaurada",
      message: "Uma versão do servidor foi restaurada com sucesso."
    });
    return version;
  },

  async pushStateToServer() {
    if (!this.hasSupabase) {
      this.setSyncStatus("local");
      return;
    }
    const snapshot = this.getSnapshot();
    const updatedAt = this.setLocalStateUpdatedAt(this.getLocalStateUpdatedAt() || new Date().toISOString());
    this.setSyncStatus("saving");

    const { error } = await supabase
      .from('app_state')
      .upsert({ scope: this.STATE_SCOPE, state: snapshot, updated_at: updatedAt }, { onConflict: 'scope' });

    if (error) {
      this.setSyncStatus("error");
      throw new Error("Falha ao salvar estado: " + error.message);
    }

    this.hasPendingSync = false;
    this.lastRemoteUpdatedAt = updatedAt;
    this.setLocalStateUpdatedAt(updatedAt);
    this.setSyncStatus("saved");
    this.maybeScheduleVersion(snapshot, "auto");
  },

  async hydrateFromServer() {
    if (!this.hasSupabase) return false;
    try {
      const record = await this.fetchBestServerStateRecord();
      if (!record || !record.state) return false;
      this.applySnapshot(record.state);
      this.lastRemoteUpdatedAt = String(record.updated_at || "");
      this.setLocalStateUpdatedAt(this.lastRemoteUpdatedAt || new Date().toISOString());
      this.hasPendingSync = false;
      this.setSyncStatus(this.hasSupabase ? "saved" : "local", this.hasSupabase ? "Salvo no servidor" : "");
      return true;
    } catch {
      this.setSyncStatus(this.hasSupabase ? "error" : "local");
      return false;
    }
  },

  async refreshFromServer() {
    if (!this.hasSupabase || this.hasPendingSync || this.remoteRefreshInFlight) return false;

    this.remoteRefreshInFlight = true;
    try {
      const record = await this.fetchBestServerStateRecord();
      if (!record || !record.state) return false;

      const remoteUpdatedAt = String(record.updated_at || "");
      const localSignature = this.buildSnapshotSignature(this.getSnapshot());
      const remoteSignature = this.buildSnapshotSignature(record.state);

      if (remoteSignature === localSignature) {
        this.lastRemoteUpdatedAt = remoteUpdatedAt || this.lastRemoteUpdatedAt;
        this.setSyncStatus("saved", "Salvo no servidor");
        return false;
      }

      const knownRemoteMs = this.lastRemoteUpdatedAt ? new Date(this.lastRemoteUpdatedAt).getTime() : 0;
      const nextRemoteMs = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;

      if (knownRemoteMs && nextRemoteMs && nextRemoteMs <= knownRemoteMs) {
        return false;
      }

      this.applySnapshot(record.state);
      this.lastRemoteUpdatedAt = remoteUpdatedAt || this.lastRemoteUpdatedAt;
      this.setLocalStateUpdatedAt(this.lastRemoteUpdatedAt || new Date().toISOString());
      this.hasPendingSync = false;
      this.lastVersionSignature = this.buildSnapshotSignature(this.getSnapshot());
      this.setSyncStatus("saved", "Atualizado do servidor");
      return true;
    } catch {
      this.setSyncStatus("error");
      return false;
    } finally {
      this.remoteRefreshInFlight = false;
    }
  },

  async bootstrapPersistence() {
    const localBeforeHydrate = this.getSnapshot();
    const localSignature = this.buildSnapshotSignature(localBeforeHydrate);
    let loaded = false;

    if (this.hasSupabase) {
      try {
        const record = await this.fetchBestServerStateRecord();
        if (record && record.state) {
          loaded = true;

          const remoteSnapshot = record.state;
          const remoteUpdatedAt = String(record.updated_at || "");
          const remoteSignature = this.buildSnapshotSignature(remoteSnapshot);

          if (remoteSignature !== localSignature) {
            this.applySnapshot(remoteSnapshot);
          }

          this.lastRemoteUpdatedAt = remoteUpdatedAt || this.lastRemoteUpdatedAt;
          this.setLocalStateUpdatedAt(this.lastRemoteUpdatedAt || new Date().toISOString());
          this.hasPendingSync = false;
          this.setSyncStatus(this.hasSupabase ? "saved" : "local", this.hasSupabase ? "Salvo no servidor" : "");
        }
      } catch {
        this.setSyncStatus(this.hasSupabase ? "error" : "local");
      }
    }

    this.ensureFearlessDefaults();

    const currentSnapshot = this.getSnapshot();
    const shouldBootstrapRemote = !loaded && this.snapshotScore(currentSnapshot) > 0;
    this.lastVersionSignature = this.buildSnapshotSignature(currentSnapshot);

    if (!loaded && shouldBootstrapRemote) {
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

  getPinnedRepos() {
    const saved = this.safeParse(this.REPOS_PINNED_KEY, []);
    if (!Array.isArray(saved) || !saved.length) {
      return this.DEFAULT_PINNED_REPOS.map(repo => ({ ...repo }));
    }

    return saved.map((repo) => ({
      sourceId: String(repo?.sourceId || "").trim(),
      estilo: repo?.estilo === "light" ? "light" : "primary",
      // Campos legados mantidos para migracao progressiva no frontend
      nome: String(repo?.nome || "").trim(),
      descricao: String(repo?.descricao || "").trim(),
      slug: String(repo?.slug || "").trim(),
      url: String(repo?.url || "").trim()
    }));
  },

  savePinnedRepos(repos = []) {
    const normalized = Array.isArray(repos)
      ? repos.map((repo) => ({
          sourceId: String(repo?.sourceId || "").trim(),
          estilo: repo?.estilo === "light" ? "light" : "primary",
          nome: String(repo?.nome || "").trim(),
          descricao: String(repo?.descricao || "").trim(),
          slug: String(repo?.slug || "").trim(),
          url: String(repo?.url || "").trim()
        }))
      : [];

    localStorage.setItem(this.REPOS_PINNED_KEY, JSON.stringify(normalized));
    this.scheduleSync();
    this.createLocalVersion("repos-pinned-update");
    return normalized;
  },

  updatePinnedRepo(index, nextRepo) {
    const repos = this.getPinnedRepos();
    if (index < 0 || index >= repos.length) return repos;
    repos[index] = { ...repos[index], ...nextRepo };
    return this.savePinnedRepos(repos);
  },

  getUiPrefs() {
    return this.normalizeUiPrefs(this.safeParse(this.UI_PREFS_KEY, null), true);
  },

  saveUiPrefs(prefs = {}) {
    const merged = { ...this.getUiPrefs(), ...prefs };
    localStorage.setItem(this.UI_PREFS_KEY, JSON.stringify(merged));
    this.scheduleSync();
    return merged;
  },

  listLocalVersions() {
    return this.safeParse(this.LOCAL_VERSIONS_KEY, []);
  },

  createLocalVersion(label = "auto-local", snapshot = null) {
    // Mantem um historico curto, suficiente para restauracao rapida sem inflar o storage.
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
    this.addNotification({
      category: "backup",
      level: "success",
      title: "Versão restaurada",
      message: "Uma versão local foi restaurada e será sincronizada com o servidor."
    });
    return selected;
  },
  // ===== 1) CRUD BASICO =====
  addItem(data) {
    const items = this.getAll();
    const newItem = {
      id: this.generateId(),
      type: data.type || "link",
      title: data.title || "",
      url: data.url || "",
      content: data.content || "",
      tags: this.normalizeTags(data.tags || []),
      category: data.category || "debut",
      pinned: data.pinned || false,
      accessCount: 0,
      pinnedAt: data.pinned ? new Date().toISOString() : "",
      createdAt: new Date().toISOString(),
      lastAccessed: ""
    };
    if (newItem.type === "checklist") {
      newItem.checklistItems = Array.isArray(data.checklistItems) ? data.checklistItems : [];
    }
    items.push(newItem);
    this.save(items);
    return newItem;
  },

  // ===== 2) SEED INICIAL =====
  ensureFearlessDefaults() {
    // Sem seed automatico: repositorios devem ser adicionados manualmente na era Fearless.
    if (localStorage.getItem(this.FEARLESS_SEED_KEY) !== "1") {
      localStorage.setItem(this.FEARLESS_SEED_KEY, "1");
    }
  },

  // ===== 3) ATUALIZACAO/REMOCAO/FILTROS =====
  updateItem(id, updates) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const nextUpdates = { ...updates };
    if (Object.prototype.hasOwnProperty.call(nextUpdates, "tags")) {
      nextUpdates.tags = this.normalizeTags(nextUpdates.tags);
    }
    items[idx] = this.normalizeItem({ ...items[idx], ...nextUpdates });
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
    this.getByCategory(category).forEach((item) => {
      this.normalizeTags(item.tags || []).forEach((tag) => tags.add(tag));
    });
    return [...tags].sort();
  },

  getPinned() {
    return this.getAll()
      .filter(i => i.pinned)
      .sort((a, b) => {
        const aPinnedAt = new Date(a.pinnedAt || a.createdAt || 0).getTime();
        const bPinnedAt = new Date(b.pinnedAt || b.createdAt || 0).getTime();
        if (aPinnedAt !== bPinnedAt) return bPinnedAt - aPinnedAt;
        return (b.accessCount || 0) - (a.accessCount || 0);
      });
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
    const orders = this.safeParse(this.ORDER_KEY, {});
    return orders[category] || [];
  },

  saveOrder(category, orderedIds) {
    const orders = this.safeParse(this.ORDER_KEY, {});
    orders[category] = orderedIds;
    localStorage.setItem(this.ORDER_KEY, JSON.stringify(orders));
    this.scheduleSync();
    this.createLocalVersion("reorder");
  },

  // ===== 6) BACKUP =====
  exportData() {
    // Exporta dados do app em um unico JSON de backup.
    const data = { ...this.getSnapshot(), exportedAt: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taylorswift-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);

    try {
      this.createLocalVersion("export-manual", data);
    } catch {
      // O download do backup nao deve falhar se o armazenamento local estiver cheio.
    }

    this.createServerVersion("export-manual", data).catch(() => {
      // Export local continua funcionando mesmo sem backend.
    });

    this.addNotification({
      category: "backup",
      level: "success",
      title: "Backup exportado",
      message: "Seu arquivo de backup .json foi gerado com sucesso."
    });

    return data;
  },

  // ===== 7) SETTINGS PROFILE =====
  getProfileSettings() {
    return this.safeParse(this.PROFILE_SETTINGS_KEY, {});
  },

  saveProfileSettings(profileData, options = {}) {
    const shouldSync = options.sync !== false;
    const shouldCreateVersion = options.createVersion !== false;
    const current = this.getProfileSettings();
    const merged = { ...current, ...profileData };
    localStorage.setItem(this.PROFILE_SETTINGS_KEY, JSON.stringify(merged));
    if (shouldSync) this.scheduleSync();
    if (shouldCreateVersion) this.createLocalVersion("profile-update");
    return merged;
  },

  async saveProfileAndAllData(profileData, media = {}) {
    // Salva perfil localmente e sincroniza um snapshot completo do app.
    this.saveProfileSettings(profileData, { sync: false, createVersion: false });

    if (Object.prototype.hasOwnProperty.call(media, "avatar")) {
      const nextAvatar = String(media.avatar || "").trim();
      if (nextAvatar) this.saveAvatar(nextAvatar, { sync: false });
      else this.removeAvatar({ sync: false });
    }

    if (Object.prototype.hasOwnProperty.call(media, "profileHeader")) {
      const nextHeader = String(media.profileHeader || "").trim();
      if (nextHeader) this.saveProfileHeader(nextHeader, { sync: false });
      else this.removeProfileHeader({ sync: false });
    }

    this.setLocalStateUpdatedAt();
    this.hasPendingSync = true;
    this.setSyncStatus(this.hasSupabase ? "saving" : "local");
    this.createLocalVersion("profile-update");
    const snapshot = this.getSnapshot();
    let remoteError = null;
    let versionError = null;

    try {
      await this.pushStateToServer();
    } catch (error) {
      remoteError = error;
      this.hasPendingSync = true;
      this.setSyncStatus(this.hasSupabase ? "error" : "local");
    }

    // A versao historica ajuda restore, mas nao deve invalidar um save principal
    // que ja tenha conseguido subir o app_state.
    if (!remoteError) {
      try {
        await this.createServerVersion("settings-profile-save", snapshot);
      } catch (error) {
        versionError = error;
      }
    }

    return {
      snapshot,
      remoteSaved: !remoteError,
      remoteError,
      versionError
    };
  },

  getAvatar() {
    return localStorage.getItem(this.AVATAR_KEY) || "";
  },

  saveAvatar(dataUrl, options = {}) {
    localStorage.setItem(this.AVATAR_KEY, dataUrl);
    if (options.sync !== false) this.scheduleSync();
  },

  removeAvatar(options = {}) {
    localStorage.removeItem(this.AVATAR_KEY);
    if (options.sync !== false) this.scheduleSync();
  },


  getProfileHeader() {
    return localStorage.getItem(this.HEADER_KEY) || "";
  },

  saveProfileHeader(dataUrl, options = {}) {
    localStorage.setItem(this.HEADER_KEY, dataUrl);
    if (options.sync !== false) this.scheduleSync();
  },

  removeProfileHeader(options = {}) {
    localStorage.removeItem(this.HEADER_KEY);
    if (options.sync !== false) this.scheduleSync();
  },
  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Faz um checkpoint remoto/local antes do merge para facilitar rollback.
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

          const mergeResult = this.mergeSnapshotNonDestructive(data);
          this.scheduleSync();
          await this.createServerVersion("import-backup", this.getSnapshot()).catch(() => {
            // Import nao falha caso o versionamento remoto falhe.
          });

          this.addNotification({
            category: "import",
            level: "success",
            title: "Backup importado",
            message: importedItems
              ? `${mergeResult.addedItemsCount} itens novos foram adicionados ao app.`
              : "Os dados do backup foram importados com sucesso."
          });

          resolve(importedItems ? mergeResult.addedItemsCount : 0);
        } catch (err) {
          this.addNotification({
            category: "import",
            level: "error",
            title: "Falha ao importar backup",
            message: "Não foi possível importar o arquivo selecionado."
          });
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









