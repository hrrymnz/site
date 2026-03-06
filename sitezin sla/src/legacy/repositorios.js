// ===== REPOSITORIOS + GITHUB DASHBOARD =====
// Mapa rapido deste arquivo:
// 1) Configuracoes e estado
// 2) Cards fixos + recentes
// 3) Helpers de formatacao
// 4) Cache e preferencias do painel GitHub
// 5) Coleta/processamento de eventos e contribuicoes
// 6) Renderizacao de commits/grafico
// 7) Controles da UI (periodo/limite/refresh)

// ===== 1) CONFIGURACAO =====
const GITHUB_USER = "hrrymnz";
const GITHUB_URL = `https://github.com/${GITHUB_USER}`;
const GITHUB_EVENTS_API = `https://api.github.com/users/${GITHUB_USER}/events`;
const GITHUB_CONTRIB_API = `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}`;
const GITHUB_CACHE_KEY = "githubDashboardCache";
const GITHUB_PREFS_KEY = "githubDashboardPrefs";
const GITHUB_CACHE_TTL_MS = 15 * 60 * 1000;

const githubState = {
  periodoDias: 90,
  limiteCommits: 8
};

// ===== 2) CARDS FIXOS E RECENTES =====
// Repositorios fixados (aparecem como cards na pagina Debut).
const reposPinned = [
  { nome: "HtmlAnalyzer", descricao: "Teste tecnico", estilo: "primary" },
  { nome: "Quiz", descricao: "codigo feito com objetivo academico", estilo: "light" }
];

// Historico local de acessos recentes a repositorios.
let reposRecentes = JSON.parse(localStorage.getItem("reposRecentes")) || [];

function sincronizarEstadoPersistido() {
  if (typeof Storage !== "undefined" && typeof Storage.scheduleSync === "function") {
    Storage.scheduleSync();
  }
}

function abrirRepositorio(nome) {
  const url = `${GITHUB_URL}/${nome}`;
  reposRecentes = reposRecentes.filter(r => r !== nome);
  reposRecentes.unshift(nome);
  if (reposRecentes.length > 10) reposRecentes.pop();
  localStorage.setItem("reposRecentes", JSON.stringify(reposRecentes));
  sincronizarEstadoPersistido();
  window.open(url, "_blank");
}

function renderizarRepos() {
  const container = document.querySelector(".cards-row");
  if (!container) return;

  container.innerHTML = reposPinned.map((repo, i) => `
    <article class="credit-card ${repo.estilo} repo-card" data-repo="${repo.nome}">
      <small>REPO FIXO ${i + 1}</small>
      <strong>${repo.nome}</strong>
      <p>${repo.descricao}</p>
    </article>
  `).join("");

  container.addEventListener("click", (e) => {
    const card = e.target.closest(".repo-card");
    if (card) abrirRepositorio(card.dataset.repo);
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

  const recentesRepos = reposRecentes.slice(0, 3).map(nome => ({
    tipo: "repo",
    repo: nome,
    titulo: nome,
    url: `${GITHUB_URL}/${nome}`,
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
      abrirRepositorio(link.dataset.repo);
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
  const key = normalizarEra(era);
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
  return labels[key] || "Debut";
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
  const salvas = JSON.parse(localStorage.getItem(GITHUB_PREFS_KEY)) || {};
  githubState.periodoDias = [30, 90, 365].includes(Number(salvas.periodoDias)) ? Number(salvas.periodoDias) : 90;
  githubState.limiteCommits = [3, 5, 8, 12].includes(Number(salvas.limiteCommits)) ? Number(salvas.limiteCommits) : 8;
}

function salvarPreferenciasGithub() {
  localStorage.setItem(GITHUB_PREFS_KEY, JSON.stringify({
    periodoDias: githubState.periodoDias,
    limiteCommits: githubState.limiteCommits
  }));
  sincronizarEstadoPersistido();
}

function lerCacheGithub() {
  return JSON.parse(localStorage.getItem(GITHUB_CACHE_KEY)) || {};
}

function salvarCacheGithub(cache) {
  localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(cache));
  sincronizarEstadoPersistido();
}

function cacheValido(registro) {
  if (!registro || !registro.savedAt) return false;
  return Date.now() - Number(registro.savedAt) < GITHUB_CACHE_TTL_MS;
}

function definirStatusCache(mensagem) {
  const status = document.getElementById("github-cache-status");
  if (status) status.textContent = mensagem;
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
  if (!forceRefresh && cacheValido(cache.events)) {
    return { data: cache.events.data || [], origem: "cache", idadeMs: Date.now() - Number(cache.events.savedAt) };
  }

  const response = await fetch(GITHUB_EVENTS_API);
  if (!response.ok) throw new Error("Falha ao carregar eventos");
  const data = await response.json();

  cache.events = {
    savedAt: Date.now(),
    data
  };
  salvarCacheGithub(cache);

  return { data, origem: "api", idadeMs: 0 };
}

async function obterContribuicoesGithub(forceRefresh = false) {
  const cache = lerCacheGithub();
  if (!forceRefresh && cacheValido(cache.contributions)) {
    return { data: cache.contributions.data || null, origem: "cache", idadeMs: Date.now() - Number(cache.contributions.savedAt) };
  }

  const response = await fetch(GITHUB_CONTRIB_API);
  if (!response.ok) throw new Error("Falha ao carregar contribuicoes");
  const data = await response.json();

  cache.contributions = {
    savedAt: Date.now(),
    data
  };
  salvarCacheGithub(cache);

  return { data, origem: "api", idadeMs: 0 };
}

function obterJanelaDias(periodoDias) {
  const dias = [];
  const hoje = new Date();
  for (let i = periodoDias - 1; i >= 0; i -= 1) {
    const dia = new Date(hoje);
    dia.setDate(hoje.getDate() - i);
    dias.push(dia.toISOString().slice(0, 10));
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
      repo: evento.repo ? evento.repo.name : "Repositorio",
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
    lista.innerHTML = '<li class="github-empty">Nenhum commit publico no periodo selecionado.</li>';
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

  // Define quantidade de semanas exibidas; minimo 5 para nao colapsar visualmente.
  const colunas = Math.max(5, Math.ceil(dias.length / 7));
  container.style.setProperty("--graph-columns", String(colunas));
  mesesContainer.style.setProperty("--graph-columns", String(colunas));

  const formatterMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const mesesRenderizados = new Set();

  // Renderiza o nome do mes apenas quando entra em um novo mes no fluxo de dias.
  dias.forEach((day, idx) => {
    const data = new Date(day.date + "T00:00:00");
    const mesKey = data.getFullYear() + "-" + data.getMonth();
    const semanaColuna = Math.floor(idx / 7) + 1;

    if (!mesesRenderizados.has(mesKey)) {
      const label = document.createElement("span");
      label.className = "contribution-month-label";
      label.style.gridColumn = String(semanaColuna);
      label.textContent = formatterMes.format(data).replace(".", "");
      mesesContainer.appendChild(label);
      mesesRenderizados.add(mesKey);
    }
  });

  // Renderiza cada celula do heatmap com nivel de intensidade (0 a 4).
  dias.forEach(day => {
    const bloco = document.createElement("div");
    const level = Number(day.level) || 0;
    bloco.className = `contribution-day level-${Math.min(4, Math.max(0, level))}`;
    bloco.title = `${day.date} - ${day.count || 0} contribuicoes`;
    container.appendChild(bloco);
  });
}

function renderizarGraficoContribuicoes(dataContribuicoes) {
  // A API de contribuicoes vem por dia; aqui alinhamos esse mapa ao periodo selecionado.
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
    // Commits e contribuicoes sao buscados em paralelo para reduzir tempo de espera.
    const [eventosResp, contribuicoesResp] = await Promise.all([
      obterEventosGithub(forceRefresh),
      obterContribuicoesGithub(forceRefresh)
    ]);

    const commits = filtrarCommitsPorPeriodo(eventosResp.data, githubState.periodoDias);
    renderizarCommitsRecentes(commits);
    renderizarGraficoContribuicoes(contribuicoesResp.data);

    if (eventosResp.origem === "cache" && contribuicoesResp.origem === "cache") {
      const idade = Math.max(eventosResp.idadeMs, contribuicoesResp.idadeMs);
      definirStatusCache("Cache local em uso (" + formatarTempoRelativo(idade) + " atras).");
    } else {
      definirStatusCache("Dados atualizados da API.");
    }
  } catch {
    // Fallback seguro: UI continua funcional mesmo sem resposta da API.
    renderizarCommitsRecentes([]);
    renderizarGraficoContribuicoes({ contributions: [] });
    definirStatusCache("Nao foi possivel carregar GitHub agora.");
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

function initRepositorios() {
  // Ordem de inicializacao: cards/recentes -> preferencias -> controles -> painel.
  renderizarRepos();
  renderizarRecentes();
  carregarPreferenciasGithub();
  sincronizarControlesGithub();
  configurarControlesGithub();
  renderizarPainelGithub(false);
}

window.renderizarRecentes = renderizarRecentes;
window.initRepositorios = initRepositorios;

export { initRepositorios, renderizarRecentes };
