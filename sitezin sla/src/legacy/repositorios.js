// ===== REPOSITORIOS + GITHUB DASHBOARD =====
// Mapa rapido deste arquivo:
// 1) Configuracoes e estado
// 2) Cards fixos + recentes
// 3) Helpers de formatacao
// 4) Cache e preferencias do painel GitHub
// 5) Coleta/processamento de eventos e contribuições
// 6) Renderizacao de commits/grafico
// 7) Controles da UI (período/limite/refresh)

// ===== 1) CONFIGURACAO =====
const DEFAULT_GITHUB_USER = "hrrymnz";
const GITHUB_CACHE_TTL_MS = 15 * 60 * 1000;

const githubState = {
  periodoDias: 90,
  limiteCommits: 8
};

function getReposRecentesKey() {
  if (typeof Storage !== "undefined" && Storage.REPOS_RECENTES_KEY) return Storage.REPOS_RECENTES_KEY;
  return "reposRecentes";
}

function getGithubPrefsKey() {
  if (typeof Storage !== "undefined" && Storage.GITHUB_PREFS_KEY) return Storage.GITHUB_PREFS_KEY;
  return "githubDashboardPrefs";
}

function getGithubCacheKey() {
  if (typeof Storage !== "undefined" && Storage.GITHUB_CACHE_KEY) return Storage.GITHUB_CACHE_KEY;
  return "githubDashboardCache";
}

function extrairGithubUsername(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "";

  const candidate = raw.replace(/^@+/, "").trim();
  if (/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(candidate)) {
    return candidate;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "github.com") return "";
    const [firstSegment] = parsed.pathname.split("/").filter(Boolean);
    return /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(firstSegment || "") ? firstSegment : "";
  } catch {
    return "";
  }
}

function obterGithubIdentity() {
  const configuredUrl = (typeof Storage !== "undefined" && typeof Storage.getProfileSettings === "function")
    ? String(Storage.getProfileSettings().githubProfileUrl || "").trim()
    : "";
  const username = extrairGithubUsername(configuredUrl) || DEFAULT_GITHUB_USER;

  return {
    username,
    profileUrl: `https://github.com/${username}`,
    eventsApi: `https://api.github.com/users/${username}/events`,
    contribApi: `https://github-contributions-api.jogruber.de/v4/${username}`
  };
}

function normalizarInicioDoDia(data) {
  const valor = new Date(data);
  valor.setHours(0, 0, 0, 0);
  return valor;
}

function formatarChaveDataLocal(data) {
  const valor = normalizarInicioDoDia(data);
  const ano = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, "0");
  const dia = String(valor.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function parseDataLocal(chave) {
  const [ano, mes, dia] = String(chave || "").split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

// ===== 2) CARDS FIXOS E RECENTES =====
const REPO_PIN_SLOTS = 2;

// Historico local de acessos recentes a repositórios.
let reposRecentes = JSON.parse(localStorage.getItem(getReposRecentesKey())) || [];
let reposPinned = carregarReposFixados();

function sincronizarEstadoPersistido() {
  if (typeof Storage !== "undefined" && typeof Storage.scheduleSync === "function") {
    Storage.scheduleSync();
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function extrairRepoSlug(urlOuNome) {
  const raw = String(urlOuNome || "").trim();
  if (!raw) return "";
  const fromUrl = raw.match(/^https?:\/\/github\.com\/[^/]+\/([^/?#]+)/i);
  if (fromUrl && fromUrl[1]) return fromUrl[1];
  return raw.replace(/^\/+|\/+$/g, "").split("/").pop() || "";
}

function obterDescricaoRepo(item) {
  if (item && item.content) {
    return String(item.content).slice(0, 120);
  }
  const host = item && item.url ? String(item.url).replace(/^https?:\/\//i, "") : "";
  return host || "Sem descrição";
}

function obterReposFearless() {
  if (typeof Storage === "undefined" || typeof Storage.getByCategory !== "function") return [];

  return Storage.getByCategory("fearless")
    .map((item) => ({
      id: item.id,
      title: item.title || "Item da Fearless",
      description: obterDescricaoRepo(item),
      url: item.url || "",
      safeUrl: sanitizeUrl(item.url || ""),
      type: String(item.type || "link").toLowerCase(),
      slug: extrairRepoSlug(item.url || item.title || "")
    }));
}

function criarMapaFearless(reposFearless) {
  const byId = new Map();
  reposFearless.forEach((repo) => byId.set(repo.id, repo));
  return byId;
}

function normalizeRepoSlot(repo, index, reposFearless) {
  const fallbackStyle = index % 2 === 0 ? "primary" : "light";
  const next = {
    sourceId: String(repo?.sourceId || "").trim(),
    estilo: repo?.estilo === "light" ? "light" : fallbackStyle,
    nome: String(repo?.nome || "").trim(),
    descricao: String(repo?.descricao || "").trim(),
    slug: String(repo?.slug || "").trim()
  };

  if (next.sourceId) return next;

  // Compatibilidade: tenta casar formato antigo (nome/slug/url) com repos existentes na Fearless.
  const oldName = String(repo?.nome || "").trim().toLowerCase();
  const oldSlug = extrairRepoSlug(repo?.slug || repo?.url || repo?.nome || "").toLowerCase();
  const matched = reposFearless.find((r) => {
    if (oldName && oldName === String(r.title || "").trim().toLowerCase()) return true;
    if (oldSlug && oldSlug === String(r.slug || "").trim().toLowerCase()) return true;
    return false;
  });

  if (matched) next.sourceId = matched.id;
  return next;
}

function carregarReposFixados() {
  const reposFearless = obterReposFearless();
  const saved = (typeof Storage !== "undefined" && typeof Storage.getPinnedRepos === "function")
    ? Storage.getPinnedRepos()
    : (JSON.parse(localStorage.getItem("reposPinned")) || []);

  const normalized = Array.isArray(saved)
    ? saved.slice(0, REPO_PIN_SLOTS).map((repo, idx) => normalizeRepoSlot(repo, idx, reposFearless))
    : [];

  while (normalized.length < REPO_PIN_SLOTS) {
    normalized.push({
      sourceId: "",
      estilo: normalized.length % 2 === 0 ? "primary" : "light"
    });
  }

  return normalized;
}

function salvarReposFixados(nextRepos) {
  reposPinned = nextRepos.map((repo, idx) => ({
    sourceId: String(repo?.sourceId || "").trim(),
    estilo: repo?.estilo === "light" ? "light" : (idx % 2 === 0 ? "primary" : "light"),
    nome: String(repo?.nome || "").trim(),
    descricao: String(repo?.descricao || "").trim()
  }));

  if (typeof Storage !== "undefined" && typeof Storage.savePinnedRepos === "function") {
    Storage.savePinnedRepos(reposPinned);
  } else {
    localStorage.setItem("reposPinned", JSON.stringify(reposPinned));
    sincronizarEstadoPersistido();
  }

  if (typeof window !== "undefined" && window.App && typeof window.App.renderDebutHighlights === "function") {
    window.App.renderDebutHighlights();
  }
}

function abrirRepositório(slug, nomeExibicao = "") {
  const repoSlug = String(slug || "").trim();
  if (!repoSlug) return;

  const { profileUrl } = obterGithubIdentity();
  const url = `${profileUrl}/${repoSlug}`;
  const titulo = String(nomeExibicao || repoSlug).trim();

  reposRecentes = reposRecentes
    .map((r) => (typeof r === "string" ? { slug: r, titulo: r } : r))
    .filter((r) => String(r.slug || "").trim().toLowerCase() !== repoSlug.toLowerCase());
  reposRecentes.unshift({ slug: repoSlug, titulo });
  if (reposRecentes.length > 10) reposRecentes.pop();
  localStorage.setItem(getReposRecentesKey(), JSON.stringify(reposRecentes));
  sincronizarEstadoPersistido();
  window.open(url, "_blank");
}

function abrirItemFearlessFixado(itemId, fallbackUrl = "") {
  const item = typeof Storage !== "undefined" && typeof Storage.getAll === "function"
    ? Storage.getAll().find((entry) => entry.id === itemId)
    : null;
  const safeUrl = sanitizeUrl(item?.url || fallbackUrl);

  if (item && typeof Storage !== "undefined" && typeof Storage.trackAccess === "function") {
    Storage.trackAccess(item.id);
  }

  if (safeUrl) {
    setTimeout(() => renderizarRecentes(), 100);
    window.open(safeUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const fearlessLink = document.querySelector('.era-link[data-target="fearless"]');
  if (fearlessLink) fearlessLink.click();
}

function atualizarPreviewRepoSelecionado() {
  const sourceSelect = document.getElementById("edit-repo-source");
  const nameInput = document.getElementById("edit-repo-name");
  const descInput = document.getElementById("edit-repo-description");
  if (!sourceSelect || !nameInput || !descInput) return;

  const reposFearless = obterReposFearless();
  const selected = reposFearless.find((repo) => repo.id === sourceSelect.value);

  if (!selected) {
    nameInput.value = "";
    descInput.value = "Adicione itens na era Fearless e selecione um acima.";
    return;
  }

  nameInput.value = selected.title;
  descInput.value = selected.description || "Sem descrição";
}

function editarRepositórioFixado(index) {
  const atual = reposPinned[index];
  if (!atual) return;

  const modal = document.getElementById("modal-edit-repo");
  const form = document.getElementById("form-edit-repo");
  const idxInput = document.getElementById("edit-repo-index");
  const slotInput = document.getElementById("edit-repo-slot");
  const sourceSelect = document.getElementById("edit-repo-source");
  const nameInput = document.getElementById("edit-repo-name");
  const descInput = document.getElementById("edit-repo-description");

  if (!modal || !form || !idxInput || !slotInput || !sourceSelect || !nameInput || !descInput) return;

  const reposFearless = obterReposFearless();
  idxInput.value = String(index);
  slotInput.value = "REPO FIXO " + (index + 1);

  if (!reposFearless.length) {
    sourceSelect.innerHTML = '<option value="">Sem itens na Fearless</option>';
    sourceSelect.disabled = true;
  } else {
    sourceSelect.disabled = false;
    sourceSelect.innerHTML = ['<option value="">Selecione um item da Fearless</option>']
      .concat(reposFearless.map((repo) =>
        '<option value="' + escapeHtml(repo.id) + '">' + escapeHtml(repo.title) + '</option>'
      ))
      .join('');
  }

  sourceSelect.value = atual.sourceId || "";
  atualizarPreviewRepoSelecionado();

  // Mantem customizacoes salvas por slot quando existirem.
  if (atual.nome) nameInput.value = atual.nome;
  if (atual.descricao) descInput.value = atual.descricao;

  modal.classList.add("visible");
  sourceSelect.focus();
}

function configurarModalEdicaoRepos() {
  const modal = document.getElementById("modal-edit-repo");
  const form = document.getElementById("form-edit-repo");
  const closeBtn = document.getElementById("modal-edit-repo-close");
  const cancelBtn = document.getElementById("edit-repo-cancel");
  const sourceSelect = document.getElementById("edit-repo-source");

  if (!modal || !form) return;
  if (modal.dataset.boundRepoModal === "1") return;
  modal.dataset.boundRepoModal = "1";

  const closeModal = () => {
    modal.classList.remove("visible");
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (sourceSelect) {
    sourceSelect.addEventListener("change", () => atualizarPreviewRepoSelecionado());
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const idxInput = document.getElementById("edit-repo-index");
    const sourceSelectEl = document.getElementById("edit-repo-source");

    const idx = Number(idxInput?.value || -1);
    if (idx < 0 || idx >= reposPinned.length) {
      closeModal();
      return;
    }

    const nameInput = document.getElementById("edit-repo-name");
    const descInput = document.getElementById("edit-repo-description");

    const sourceId = String(sourceSelectEl?.value || "").trim();
    const next = [...reposPinned];
    next[idx] = {
      ...next[idx],
      sourceId,
      nome: String(nameInput?.value || "").trim(),
      descricao: String(descInput?.value || "").trim()
    };

    salvarReposFixados(next);
    renderizarRepos();
    closeModal();
  });
}

function renderizarRepos() {
  const container = document.querySelector(".repo-overview-grid");
  if (!container) return;

  reposPinned = carregarReposFixados();
  const reposFearless = obterReposFearless();
  const byId = criarMapaFearless(reposFearless);

  container.innerHTML = reposPinned.map((slot, i) => {
    const selected = byId.get(slot.sourceId);
    const isEmpty = !selected;
    const classe = isEmpty ? 'repo-overview-card light repo-card repo-card-empty' : ('repo-overview-card ' + slot.estilo + ' repo-card');
    const dataItemId = isEmpty ? '' : escapeHtml(selected.id);
    const dataItemUrl = isEmpty ? '' : escapeHtml(selected.safeUrl || "");
    const tituloBase = selected ? selected.title : "Selecione um item";
    const descricaoBase = selected ? (selected.description || "Sem descrição") : "Adicione um item na Fearless e configure este slot.";
    const titulo = escapeHtml(slot.nome || tituloBase);
    const descricao = escapeHtml(slot.descricao || descricaoBase);

    return `
      <article class="${classe}" data-item-id="${dataItemId}" data-item-url="${dataItemUrl}" data-index="${i}">
        <div class="repo-card-head">
          <small>ITEM FIXO ${i + 1}</small>
          <button type="button" class="repo-edit-btn" data-edit-index="${i}" title="Editar item">
            <i data-lucide="pencil"></i>
          </button>
        </div>
        <strong>${titulo}</strong>
        <p>${descricao}</p>
      </article>
    `;
  }).join("");

  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }

  if (container.dataset.boundRepoClick === "1") return;
  container.dataset.boundRepoClick = "1";
  container.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".repo-edit-btn");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      editarRepositórioFixado(Number(editBtn.dataset.editIndex));
      return;
    }

    const card = e.target.closest(".repo-card");
    if (!card) return;
    const itemId = String(card.dataset.itemId || "").trim();
    const itemUrl = String(card.dataset.itemUrl || "").trim();
    if (!itemId && !itemUrl) return;
    abrirItemFearlessFixado(itemId, itemUrl);
  });
}

function renderizarRecentes() {
  const lista = document.querySelector(".recent ul");
  if (!lista) return;

  // Prioridade de dados:
  // 1) Itens internos com lastAccessed
  // 2) Complemento com repos recentes
  // 3) Completa ate 3 slots para manter o painel alinhado
  let recentesItens = [];
  if (typeof Storage !== "undefined") {
    recentesItens = Storage.getAll()
      .filter(item => item.lastAccessed && /^https?:\/\//i.test(item.url || ""))
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
      .slice(0, 3)
      .map(item => ({
        tipo: "item",
        id: item.id,
        titulo: item.title || item.url,
        url: item.url,
        era: item.category,
        itemType: item.type || "link"
      }));
  }

  const recentesRepos = reposRecentes
    .map((entry) => (typeof entry === "string" ? { slug: entry, titulo: entry } : entry))
    .slice(0, 3)
    .map((entry) => ({
      tipo: "repo",
      repo: entry.slug,
      titulo: entry.titulo || entry.slug,
      url: `${GITHUB_URL}/${entry.slug}`,
      era: "debut",
      itemType: "repo"
    }));

  // Combina fontes evitando duplicar a mesma URL.
  const combined = [];
  const seen = new Set();
  [...recentesItens, ...recentesRepos].forEach(item => {
    const key = String(item.url || "") + "|" + String(item.id || item.repo || "");
    if (seen.has(key)) return;
    seen.add(key);
    combined.push(item);
  });

  recentesItens = combined.slice(0, 3);

  while (recentesItens.length < 3) {
    recentesItens.push({
      tipo: "empty",
      titulo: "Sem acesso recente",
      era: "settings",
      itemType: "note",
      url: ""
    });
  }

  lista.innerHTML = recentesItens.map(item => {
    const eraKey = normalizarEra(item.era);
    const eraLabel = formatarEra(item.era);
    const itemIcon = iconeTipoItem(item.itemType);

    if (item.tipo === "empty") {
      return `
        <li class="recent-row recent-row-empty era-${eraKey}">
          <span class="recent-link recent-link-empty" aria-disabled="true">
            <span class="recent-item-icon"><i data-lucide="clock-3"></i></span>
            <span class="recent-item-title">${item.titulo}</span>
          </span>
          <span class="recent-era-inline recent-era-muted">
            <span class="recent-era-dot"></span>
            <span class="recent-era-text">-</span>
          </span>
        </li>
      `;
    }

    return `
      <li class="recent-row era-${eraKey}">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="plus recent-link" data-type="${item.tipo}" data-id="${item.id || ""}" data-repo="${item.repo || ""}">
          <span class="recent-item-icon"><i data-lucide="${itemIcon}"></i></span>
          <span class="recent-item-title">${item.titulo}</span>
        </a>
        <button type="button" class="recent-era-btn recent-era-inline" data-era="${eraKey}">
          <span class="recent-era-dot"></span>
          <span class="recent-era-text">${eraLabel}</span>
        </button>
      </li>
    `;
  }).join("");

  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }

  // Evita bind duplicado do listener ao re-renderizar a lista.
  if (lista.dataset.boundRecentes === "1") return;
  lista.dataset.boundRecentes = "1";
  lista.addEventListener("click", (e) => {
    const eraBtn = e.target.closest(".recent-era-btn");
    if (eraBtn) {
      e.preventDefault();
      if (typeof App !== "undefined" && typeof App.navigateToEra === "function") {
        App.navigateToEra(eraBtn.dataset.era);
      }
      return;
    }

    const link = e.target.closest(".recent-link");
    if (!link) return;

    if (link.dataset.type === "repo" && link.dataset.repo) {
      e.preventDefault();
      abrirRepositório(link.dataset.repo);
      return;
    }

    if (link.dataset.type === "item" && link.dataset.id && typeof Storage !== "undefined") {
      Storage.trackAccess(link.dataset.id);
      setTimeout(() => renderizarRecentes(), 100);
    }
  });
}

function iconeTipoItem(type) {
  const icons = {
    link: "link",
    note: "file-text",
    repo: "folder-git-2",
    playlist: "music"
  };
  return icons[String(type || "").toLowerCase()] || "file";
}

// ===== 3) HELPERS =====
function normalizarEra(era) {
  const value = String(era || "").toLowerCase().trim();
  if (value === "speak now") return "speak-now";
  return value || "debut";
}

function formatarEra(era) {
  // Reaproveita o mapa de labels da shell quando a app principal ja estiver pronta.
  if (window.App && typeof window.App.formatEraLabel === "function") {
    return window.App.formatEraLabel(era);
  }

  const key = normalizarEra(era);
  const labels = {
    debut: "Início",
    fearless: "Repositórios",
    "speak-now": "Música",
    red: "Notas",
    "1989": "Ferramentas",
    reputation: "Links",
    lover: "Vídeos",
    folklore: "Resumos e Anotações",
    settings: "Configurações"
  };
  return labels[key] || "Início";
}

function formatarData(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// ===== 4) CACHE E PREFERENCIAS =====
function carregarPreferenciasGithub() {
  const salvas = JSON.parse(localStorage.getItem(getGithubPrefsKey())) || {};
  githubState.periodoDias = [30, 90, 365].includes(Number(salvas.periodoDias)) ? Number(salvas.periodoDias) : 90;
  githubState.limiteCommits = [3, 5, 8, 12].includes(Number(salvas.limiteCommits)) ? Number(salvas.limiteCommits) : 8;
}

function salvarPreferenciasGithub() {
  localStorage.setItem(getGithubPrefsKey(), JSON.stringify({
    periodoDias: githubState.periodoDias,
    limiteCommits: githubState.limiteCommits
  }));
  sincronizarEstadoPersistido();
}

function lerCacheGithub() {
  return JSON.parse(localStorage.getItem(getGithubCacheKey())) || {};
}

function salvarCacheGithub(cache) {
  localStorage.setItem(getGithubCacheKey(), JSON.stringify(cache));
  sincronizarEstadoPersistido();
}

function limparCacheGithub(username = "") {
  const nextCache = username ? { username } : {};
  salvarCacheGithub(nextCache);
}

function cacheValido(registro) {
  if (!registro || !registro.savedAt) return false;
  return Date.now() - Number(registro.savedAt) < GITHUB_CACHE_TTL_MS;
}

function definirStatusCache(mensagem) {
  const status = document.getElementById("github-cache-status");
  if (status) status.textContent = mensagem;
}

function notificarGithub(payload = {}) {
  if (typeof Storage === "undefined" || typeof Storage.addNotification !== "function") return;
  Storage.addNotification(payload);
}

function formatarTempoRelativo(msPassados) {
  const minutos = Math.max(1, Math.round(msPassados / 60000));
  if (minutos < 60) return minutos + " min";
  const horas = Math.round(minutos / 60);
  return horas + " h";
}

// ===== 5) FETCH E PROCESSAMENTO =====
async function obterEventosGithub(forceRefresh = false) {
  const cache = lerCacheGithub();
  const github = obterGithubIdentity();
  const sameUser = String(cache.username || "").toLowerCase() === github.username.toLowerCase();

  if (!forceRefresh && sameUser && cacheValido(cache.events)) {
    return { data: cache.events.data || [], origem: "cache", idadeMs: Date.now() - Number(cache.events.savedAt) };
  }

  const response = await fetch(github.eventsApi);
  if (!response.ok) throw new Error("Falha ao carregar eventos");
  const data = await response.json();

  cache.username = github.username;
  cache.events = {
    savedAt: Date.now(),
    data
  };
  salvarCacheGithub(cache);

  return { data, origem: "api", idadeMs: 0 };
}

async function obterContribuicoesGithub(forceRefresh = false) {
  const cache = lerCacheGithub();
  const github = obterGithubIdentity();
  const sameUser = String(cache.username || "").toLowerCase() === github.username.toLowerCase();

  if (!forceRefresh && sameUser && cacheValido(cache.contributions)) {
    return { data: cache.contributions.data || null, origem: "cache", idadeMs: Date.now() - Number(cache.contributions.savedAt) };
  }

  const response = await fetch(github.contribApi);
  if (!response.ok) throw new Error("Falha ao carregar contribuições");
  const data = await response.json();

  cache.username = github.username;
  cache.contributions = {
    savedAt: Date.now(),
    data
  };
  salvarCacheGithub(cache);

  return { data, origem: "api", idadeMs: 0 };
}

function obterJanelaDias(periodoDias) {
  const dias = [];
  const hoje = normalizarInicioDoDia(new Date());
  for (let i = periodoDias - 1; i >= 0; i -= 1) {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() - i);
    dias.push(formatarChaveDataLocal(dia));
  }
  return dias;
}

function filtrarCommitsPorPeriodo(eventos, periodoDias) {
  // Corte temporal usado para filtrar apenas o intervalo ativo (30/90/365 dias).
  const corte = new Date();
  corte.setHours(0, 0, 0, 0);
  corte.setDate(corte.getDate() - (periodoDias - 1));

  return eventos
    .filter(evento => evento.type === "PushEvent" && evento.payload && Array.isArray(evento.payload.commits))
    .filter(evento => new Date(evento.created_at) >= corte)
    .flatMap(evento => evento.payload.commits.map(commit => ({
      repo: evento.repo ? evento.repo.name : "Repositório",
      mensagem: commit.message || "Commit sem mensagem",
      url: evento.repo ? `https://github.com/${evento.repo.name}/commit/${commit.sha}` : "#",
      data: evento.created_at
    })));
}

// ===== 6) RENDER DA UI GITHUB =====
function renderizarCommitsRecentes(commits) {
  const lista = document.getElementById("github-commits-list");
  if (!lista) return;

  if (!commits.length) {
    lista.innerHTML = '<li class="github-empty">Nenhum commit público no período selecionado.</li>';
    return;
  }

  lista.innerHTML = commits.slice(0, githubState.limiteCommits).map(commit => `
    <li>
      <a href="${commit.url}" target="_blank" rel="noopener noreferrer" title="${commit.mensagem}">${commit.mensagem}</a>
      <div class="github-commit-meta">
        <span>${commit.repo}</span>
        <span>${formatarData(commit.data)}</span>
      </div>
    </li>
  `).join("");
}

function normalizarNivelContribuicao(count, maxCount) {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 4;
  const ratio = count / maxCount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function preencherGraficoContribuicoes(dias, total) {
  const container = document.getElementById("contribution-graph");
  const mesesContainer = document.getElementById("contribution-months");
  const totalEl = document.getElementById("github-total-contributions");
  if (!container || !totalEl || !mesesContainer) return;

  container.innerHTML = "";
  mesesContainer.innerHTML = "";
  totalEl.textContent = String(total);

  const diffEmDias = (inicio, fim) => Math.round((normalizarInicioDoDia(fim) - normalizarInicioDoDia(inicio)) / 86400000);
  const primeiraData = dias.length ? parseDataLocal(dias[0].date) : null;
  const ultimaData = dias.length ? parseDataLocal(dias[dias.length - 1].date) : null;
  const inicioGrade = primeiraData ? new Date(primeiraData) : null;
  const fimGrade = ultimaData ? new Date(ultimaData) : null;

  if (inicioGrade) inicioGrade.setDate(inicioGrade.getDate() - inicioGrade.getDay());
  if (fimGrade) fimGrade.setDate(fimGrade.getDate() + (6 - fimGrade.getDay()));

  const deslocamentoInicial = primeiraData && inicioGrade ? diffEmDias(inicioGrade, primeiraData) : 0;
  const preenchimentoFinal = ultimaData && fimGrade ? diffEmDias(ultimaData, fimGrade) : 0;
  const totalCelulas = deslocamentoInicial + dias.length + preenchimentoFinal;

  // Exibe semanas completas de domingo a sabado, como no GitHub.
  const colunas = Math.max(5, Math.ceil(totalCelulas / 7));
  container.style.setProperty("--graph-columns", String(colunas));
  mesesContainer.style.setProperty("--graph-columns", String(colunas));

  const formatterMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const MIN_GAP_COLUNAS_ROTULO = 3;
  const mesesVisiveis = new Map();

  dias.forEach((day, idx) => {
    const data = parseDataLocal(day.date);
    const mesKey = data.getFullYear() + "-" + data.getMonth();
    if (!mesesVisiveis.has(mesKey)) {
      mesesVisiveis.set(mesKey, {
        text: formatterMes.format(data).replace(".", ""),
        firstIndex: idx,
        visibleDays: 0,
        realWeekColumn: Math.floor((deslocamentoInicial + idx) / 7) + 1
      });
    }
    mesesVisiveis.get(mesKey).visibleDays += 1;
  });

  const entradasMes = Array.from(mesesVisiveis.values());
  const mesesFiltrados = [];
  let colunaMaisNovaMantida = Infinity;

  // Mantemos os meses mais recentes ancorados na coluna real do primeiro dia
  // visivel daquele mes. Se dois labels ficarem proximos demais, escondemos o
  // mais antigo em vez de deslocar o mais novo.
  for (let i = entradasMes.length - 1; i >= 0; i -= 1) {
    const mes = entradasMes[i];
    if ((colunaMaisNovaMantida - mes.realWeekColumn) < MIN_GAP_COLUNAS_ROTULO) {
      continue;
    }
    mesesFiltrados.push(mes);
    colunaMaisNovaMantida = mes.realWeekColumn;
  }

  mesesFiltrados.reverse().forEach((mes) => {
    const label = document.createElement("span");
    label.className = "contribution-month-label";
    label.style.gridColumn = String(mes.realWeekColumn);
    label.textContent = mes.text;
    mesesContainer.appendChild(label);
  });

  for (let i = 0; i < deslocamentoInicial; i += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "contribution-day contribution-day-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    container.appendChild(placeholder);
  }

  // Renderiza cada celula do heatmap com nivel de intensidade (0 a 4).
  dias.forEach((day) => {
    const bloco = document.createElement("div");
    const level = Number(day.level) || 0;
    bloco.className = `contribution-day level-${Math.min(4, Math.max(0, level))}`;
    bloco.title = `${day.date} - ${day.count || 0} contribuições`;
    container.appendChild(bloco);
  });

  for (let i = 0; i < preenchimentoFinal; i += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "contribution-day contribution-day-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    container.appendChild(placeholder);
  }
}

function renderizarGraficoContribuicoes(dataContribuicoes) {
  // A API de contribuições vem por dia; aqui alinhamos esse mapa ao período selecionado.
  const diasApi = dataContribuicoes && Array.isArray(dataContribuicoes.contributions) ? dataContribuicoes.contributions : [];
  const mapa = new Map(diasApi.map(day => [day.date, Number(day.count) || 0]));
  const janela = obterJanelaDias(githubState.periodoDias);

  const counts = janela.map(date => mapa.get(date) || 0);
  const maxCount = Math.max(0, ...counts);
  const dias = janela.map((date, idx) => ({
    date,
    count: counts[idx],
    level: normalizarNivelContribuicao(counts[idx], maxCount)
  }));
  const total = counts.reduce((acc, value) => acc + value, 0);
  preencherGraficoContribuicoes(dias, total);
}

// ===== 7) CONTROLES DA UI =====
function sincronizarControlesGithub() {
  document.querySelectorAll(".github-period-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.period) === githubState.periodoDias);
  });

  document.querySelectorAll(".github-limit-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.limit) === githubState.limiteCommits);
  });
}

async function renderizarPainelGithub(forceRefresh = false) {
  const lista = document.getElementById("github-commits-list");
  if (!lista) return;

  if (forceRefresh) {
    definirStatusCache("Atualizando dados da API...");
  }

  try {
    // Commits e contribuições sao buscados em paralelo para reduzir tempo de espera.
    const [eventosResp, contribuicoesResp] = await Promise.all([
      obterEventosGithub(forceRefresh),
      obterContribuicoesGithub(forceRefresh)
    ]);

    const commits = filtrarCommitsPorPeriodo(eventosResp.data, githubState.periodoDias);
    renderizarCommitsRecentes(commits);
    renderizarGraficoContribuicoes(contribuicoesResp.data);

    if (eventosResp.origem === "cache" && contribuicoesResp.origem === "cache") {
      const idade = Math.max(eventosResp.idadeMs, contribuicoesResp.idadeMs);
      definirStatusCache("Cache local em uso (" + formatarTempoRelativo(idade) + " atrás).");
    } else {
      definirStatusCache("Dados atualizados da API.");
    }

    if (forceRefresh) {
      notificarGithub({
        category: "github",
        level: "success",
        title: "GitHub atualizado",
        message: "Os dados do painel GitHub foram atualizados.",
        createdAt: new Date().toISOString()
      });
    }
  } catch {
    // Fallback seguro: UI continua funcional mesmo sem resposta da API.
    renderizarCommitsRecentes([]);
    renderizarGraficoContribuicoes({ contributions: [] });
    definirStatusCache("Não foi possível carregar o GitHub agora.");

    if (forceRefresh) {
      notificarGithub({
        category: "github",
        level: "error",
        title: "GitHub indisponivel",
        message: "Nao foi possivel atualizar os dados do GitHub agora.",
        createdAt: new Date().toISOString()
      });
    }
  }
}

function configurarControlesGithub() {
  const periodButtons = document.querySelectorAll(".github-period-btn");
  const limitButtons = document.querySelectorAll(".github-limit-btn");
  const refreshBtn = document.getElementById("github-refresh-btn");

  periodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      githubState.periodoDias = Number(btn.dataset.period) || 90;
      salvarPreferenciasGithub();
      sincronizarControlesGithub();
      renderizarPainelGithub(false);
    });
  });

  limitButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      githubState.limiteCommits = Number(btn.dataset.limit) || 8;
      salvarPreferenciasGithub();
      sincronizarControlesGithub();
      renderizarPainelGithub(false);
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      renderizarPainelGithub(true);
    });
  }
}

async function refreshGithubDashboard(forceRefresh = false) {
  const github = obterGithubIdentity();
  if (forceRefresh) {
    limparCacheGithub(github.username);
  }
  carregarPreferenciasGithub();
  sincronizarControlesGithub();
  await renderizarPainelGithub(forceRefresh);
}

function initRepositorios() {
  // Ordem de inicializacao: cards/recentes -> preferencias -> controles -> painel.
  configurarModalEdicaoRepos();
  renderizarRepos();
  renderizarRecentes();
  carregarPreferenciasGithub();
  sincronizarControlesGithub();
  configurarControlesGithub();
  renderizarPainelGithub(false);
}

window.renderizarRecentes = renderizarRecentes;
window.initRepositorios = initRepositorios;
window.refreshGithubDashboard = refreshGithubDashboard;
window.getGithubIdentity = obterGithubIdentity;

export { initRepositorios, renderizarRecentes };
