import { useEffect } from 'react';
import './styles/style.css';
import { useAuth } from './hooks/useAuth.js';
import LoginPage from './components/LoginPage.jsx';
import brandVector from './assets/brand-vector.svg';

const ENABLE_WORKSPACES = import.meta.env.VITE_ENABLE_WORKSPACES === 'true';

function App() {
  const {
    user,
    loading,
    authStatus,
    isRecoveryMode,
    signIn,
    signUp,
    signOut: authSignOut,
    requestPasswordReset,
    updatePassword
  } = useAuth();

  const handleSignOut = async () => {
    document.body.setAttribute('data-era', 'debut');
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    await authSignOut();
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let cancelled = false;

    const boot = async () => {
      const [{ default: Storage }, { initLegacyApp }, { initRepositorios }, { default: initShellInteractions }] = await Promise.all([
        import('./legacy/storage.js'),
        import('./legacy/app.js'),
        import('./legacy/repositorios.js'),
        import('./legacy/bootstrap.js')
      ]);

      if (cancelled) return;

      Storage.setUser(user.id, ENABLE_WORKSPACES);
      if (ENABLE_WORKSPACES) {
        const activeWorkspace = localStorage.getItem(`${user.id}_activeWorkspace`) || 'default';
        Storage.setWorkspace(activeWorkspace);
      }
      document.body.setAttribute('data-era', 'debut');
      if (window.location.hash !== '#debut') {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#debut');
      }

      initLegacyApp();
      initShellInteractions();
      initRepositorios();
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }

      Storage.bootstrapPersistence()
        .then(() => {
          if (cancelled) return;
          if (window.App && typeof window.App.renderAllEras === 'function') {
            window.App.renderAllEras();
          }
          if (window.App && typeof window.App.renderDebutHighlights === 'function') {
            window.App.renderDebutHighlights();
          }
          if (typeof window.renderizarRecentes === 'function') {
            window.renderizarRecentes();
          }
          if (typeof window.updateProfilePage === 'function') {
            window.updateProfilePage();
          }
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        })
        .catch(() => {
          // Mantem interface responsiva mesmo se a hidratacao remota falhar.
        });
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  if (loading) {
    return <div className="login-page"><div className="login-card"><p style={{textAlign:'center',color:'#8a93b2'}}>Carregando sessao...</p></div></div>;
  }

  if (!user) {
    return (
      <LoginPage
        signIn={signIn}
        signUp={signUp}
        requestPasswordReset={requestPasswordReset}
        updatePassword={updatePassword}
        isRecoveryMode={isRecoveryMode}
        authStatus={authStatus}
      />
    );
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-icon-slot" aria-hidden="true">
            <img src={brandVector} alt="" className="brand-icon-image" />
          </span>
          <h1 className="brand">TaylorSwift.</h1>
        </div>
        <nav className="menu">
          <a href="#" className="era-link active" data-target="debut" data-era-color="debut"><span className="menu-icon"><i data-lucide="home"></i></span>Debut</a>
          <a href="#" className="era-link" data-target="fearless" data-era-color="fearless"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/hand.png" alt="Fearless" className="sidebar-custom-icon" /></span>Fearless</a>
          <a href="#" className="era-link" data-target="speak-now" data-era-color="speak-now"><span className="menu-icon"><i data-lucide="mic-2"></i></span>Speak Now</a>
          <a href="#" className="era-link" data-target="red" data-era-color="red"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/scarf.png" alt="Red" className="sidebar-custom-icon" /></span>Red</a>
          <a href="#" className="era-link" data-target="1989" data-era-color="1989"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/statue-of-liberty.png" alt="1989" className="sidebar-custom-icon" /></span>1989</a>
          <a href="#" className="era-link" data-target="reputation" data-era-color="reputation"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/snake.png" alt="Reputation" className="sidebar-custom-icon" /></span>Reputation</a>
          <a href="#" className="era-link" data-target="lover" data-era-color="lover"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/archer.png" alt="Lover" className="sidebar-custom-icon" /></span>Lover</a>
          <a href="#" className="era-link" data-target="folklore" data-era-color="folklore"><span className="menu-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/ball.png" alt="Folklore" className="sidebar-custom-icon" /></span>Folklore</a>
          <a href="#" className="era-link" data-target="evermore" data-era-color="evermore"><span className="menu-icon"><i data-lucide="user-circle"></i></span>Evermore</a>
          <a href="#" className="era-link" data-target="settings" data-era-color="settings"><span className="menu-icon"><i data-lucide="settings"></i></span>Configurações</a>
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-email">{user.email}</span>
          <button className="logout-btn" onClick={handleSignOut}><i data-lucide="log-out"></i>Sair</button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <h2 id="topbar-title">Debut</h2>
          <div className="topbar-right">
            <div className="search">
              <span className="search-icon"><img loading="lazy" decoding="async" src="imagens, icons/topbar/magnifying-glass.svg" alt="" /></span>
              <input type="text" className="search-input" id="search-input" placeholder="Pesquisar algo..." autoComplete="off" />
              <div className="search-results" id="search-results"></div>
            </div>
            {ENABLE_WORKSPACES && (
              <div className="workspace-switcher-wrap">
                <label htmlFor="workspace-switcher">Workspace</label>
                <select id="workspace-switcher" className="workspace-switcher" defaultValue="default">
                  <option value="default">Main</option>
                  <option value="dev">Dev</option>
                  <option value="reading">Reading</option>
                  <option value="ideas">Ideas</option>
                </select>
                <small id="workspace-switch-status" className="workspace-switch-status"></small>
              </div>
            )}
            <div className="topbar-icons">
              <a href="#" className="icon topbar-settings-btn"><img loading="lazy" decoding="async" src="imagens, icons/topbar/settings.svg" alt="Configurações" /></a>
              <a href="#" className="icon"><img loading="lazy" decoding="async" src="imagens, icons/topbar/notification.svg" alt="Notificacoes" /></a>
              <a href="#" className="icon profile-icon"><img loading="lazy" decoding="async" src="imagens, icons/Sidebar/user 3 1.svg" alt="Perfil" /></a>
            </div>
          </div>
        </header>

        <div className="era-page active" id="page-debut">
          <section className="repos-grid">
            <div className="credit-cards">
              <div className="card-header">
                <h3>Meus repositorios</h3>
                <a href="#" className="ver-mais-link" id="ver-mais-repos">Ver mais</a>
              </div>
              <div className="cards-row"></div>
              <a href="https://github.com/hrrymnz" target="_blank" rel="noopener noreferrer" className="btn-todos-repos">Github -&gt;</a>
            </div>
            <div className="recent">
              <h3>Paginas Recentes</h3>
              <div className="painel-superficie">
                <ul></ul>
              </div>
            </div>
          </section>

          <section className="highlights-grid">
            <div className="highlight-section">
              <div className="card-header">
                <h3>Itens Fixados</h3>
                <a href="#" className="ver-mais-link" id="ver-mais-pinned">Ver mais</a>
              </div>
              <div className="painel-superficie">
                <ul id="debut-pinned" className="highlight-list">
                  <li><span><i data-lucide="pin"></i></span><b className="plus">Fixe itens nas eras</b></li>
                </ul>
              </div>
            </div>
            <div className="highlight-section">
              <div className="card-header">
                <h3>Mais Acessados</h3>
                <a href="#" className="ver-mais-link" id="ver-mais-accessed">Ver mais</a>
              </div>
              <div className="painel-superficie">
                <ul id="debut-accessed" className="highlight-list">
                  <li><span><i data-lucide="bar-chart-3"></i></span><b className="plus">Acesse itens para ver aqui</b></li>
                </ul>
              </div>
            </div>
          </section>

          <section className="charts-grid">
            <div className="painel-contribuições-github">
              <h3>Contribuições GitHub</h3>
              <div className="painel-superficie">
                <div className="github-graph-header">
                  <div className="github-total-wrap">
                    <strong id="github-total-contributions">-</strong>
                    <small>Contribuições no período</small>
                  </div>
                  <div className="github-controls">
                    <label>Período</label>
                    <div className="github-chip-group" id="github-period-group">
                      <button type="button" className="github-chip github-period-btn" data-period="30">30d</button>
                      <button type="button" className="github-chip github-period-btn active" data-period="90">90d</button>
                      <button type="button" className="github-chip github-period-btn" data-period="365">365d</button>
                    </div>
                  </div>
                </div>
                <div className="contribution-body">
                  <div className="contribution-weekdays" aria-hidden="true">
                    <span className="weekday-mon">Seg</span>
                    <span className="weekday-wed">Qua</span>
                    <span className="weekday-fri">Sex</span>
                  </div>
                  <div className="contribution-graph-wrap">
                    <div className="contribution-months" id="contribution-months"></div>
                    <div className="contribution-graph" id="contribution-graph"></div>
                  </div>
                </div>
                <div className="contribution-footer">
                  <small className="contribution-help">Calendário de contribuições</small>
                  <div className="contribution-legend" aria-label="Contribution intensity legend">
                    <span>Menos</span>
                    <span className="contribution-day level-0 legend-cell"></span>
                    <span className="contribution-day level-1 legend-cell"></span>
                    <span className="contribution-day level-2 legend-cell"></span>
                    <span className="contribution-day level-3 legend-cell"></span>
                    <span className="contribution-day level-4 legend-cell"></span>
                    <span>Mais</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="painel-commits-github">
              <h3>Ultimos Commits</h3>
              <div className="painel-superficie">
                <div className="github-commits-header">
                  <div className="github-controls">
                    <label>Mostrar</label>
                    <div className="github-chip-group" id="github-limit-group">
                      <button type="button" className="github-chip github-limit-btn" data-limit="3">3</button>
                      <button type="button" className="github-chip github-limit-btn" data-limit="5">5</button>
                      <button type="button" className="github-chip github-limit-btn active" data-limit="8">8</button>
                      <button type="button" className="github-chip github-limit-btn" data-limit="12">12</button>
                    </div>
                  </div>
                  <button className="github-refresh-btn" id="github-refresh-btn" type="button">Atualizar</button>
                </div>
                <p className="github-cache-status" id="github-cache-status">Aguardando carga...</p>
                <ul className="github-commits-list" id="github-commits-list">
                  <li className="github-empty">Carregando commits...</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="era-page" id="page-fearless"><div className="era-toolbar"><div className="era-tags" id="tags-fearless"></div><button className="btn-add-item" data-era="fearless">+ Novo Item</button></div><div className="era-items" id="items-fearless"></div></div>
        <div className="era-page" id="page-speak-now"><div className="era-toolbar"><div className="era-tags" id="tags-speak-now"></div><button className="btn-add-item" data-era="speak-now">+ Novo Item</button></div><div className="era-items" id="items-speak-now"></div></div>
        <div className="era-page" id="page-red">
          <div className="era-toolbar">
            <div className="era-tags" id="tags-red">
              <button type="button" className="tag-btn" id="red-notes-filter-all" data-filter="all">Todos</button>
              <button type="button" className="tag-btn" id="red-notes-filter-notes" data-filter="notes">Notas</button>
              <button type="button" className="tag-btn" id="red-notes-filter-checklists" data-filter="checklists">Checklist</button>
            </div>
          </div>

          <section className="red-notes-shell red-notes-shell--list-only" id="red-notes-shell">
            <aside className="red-notes-list-panel">
              <div className="red-notes-head">
                <div className="red-notes-head-actions">
                  <div className="red-notes-view-toggle" aria-label="Visualizacao">
                    <button type="button" className="red-notes-view-btn active" id="red-notes-view-list" title="Lista"><i data-lucide="list"></i></button>
                    <button type="button" className="red-notes-view-btn" id="red-notes-view-grid" title="Grade"><i data-lucide="layout-grid"></i></button>
                  </div>
                  <button type="button" className="red-notes-fab" id="red-notes-new-btn" title="Nova nota ou checklist"><i data-lucide="plus"></i></button>
                </div>
              </div>
              <div className="red-notes-search-wrap">
                <i data-lucide="search"></i>
                <input type="text" id="red-notes-search" placeholder="Buscar..." />
              </div>
              <ul className="red-notes-list" id="red-notes-list"></ul>
            </aside>

            <div id="red-note-editor-wrap" className="red-note-editor-wrap">
              <article className="red-note-editor folklore-md-shell" id="red-note-editor">
                <div className="red-note-empty" id="red-note-empty" style={{ display: 'none' }}>
                  <p id="red-note-empty-text">Clique em + para criar uma nota ou checklist.</p>
                </div>
                <div className="red-note-form" id="red-note-form" style={{ display: 'none' }}>
                  <header className="folklore-md-topbar red-note-topbar">
                    <button type="button" className="folklore-md-back-btn" id="red-note-back-btn"><i data-lucide="arrow-left"></i> Voltar</button>
                    <input type="text" id="red-note-title" className="folklore-md-title-input" placeholder="Titulo da nota" />
                    <div className="folklore-md-toolbar-actions">
                      <button type="button" className="folklore-md-mode-btn active" id="red-note-mode-preview">Preview</button>
                      <button type="button" className="folklore-md-mode-btn" id="red-note-mode-split">Editar</button>
                      <button type="button" className="folklore-md-save-btn" id="red-note-save-btn"><i data-lucide="save"></i> Salvar</button>
                      <button type="button" className="folklore-md-delete-btn" id="red-note-delete-btn"><i data-lucide="trash-2"></i></button>
                    </div>
                  </header>
                  <small id="red-note-meta" className="folklore-md-meta"></small>
                  <div className="folklore-md-layout red-note-md-layout is-preview" id="red-note-md-layout">
                    <textarea id="red-note-content" className="folklore-md-editor" placeholder="Escreva sua nota..."></textarea>
                    <article id="red-note-preview" className="red-note-markdown-body folklore-markdown-body"></article>
                  </div>
                </div>
                <div className="red-checklist-form" id="red-checklist-form" style={{ display: 'none' }}>
                  <header className="folklore-md-topbar red-note-topbar">
                    <button type="button" className="folklore-md-back-btn" id="red-checklist-back-btn"><i data-lucide="arrow-left"></i> Voltar</button>
                    <input type="text" id="red-checklist-title" className="folklore-md-title-input" placeholder="Titulo da checklist" />
                    <div className="folklore-md-toolbar-actions">
                      <button type="button" className="folklore-md-save-btn" id="red-checklist-save-btn"><i data-lucide="save"></i> Salvar</button>
                      <button type="button" className="folklore-md-delete-btn" id="red-checklist-delete-btn"><i data-lucide="trash-2"></i></button>
                    </div>
                  </header>
                  <small id="red-checklist-meta" className="folklore-md-meta"></small>
                  <div className="folklore-md-layout red-checklist-layout is-preview">
                    <div className="red-checklist-body">
                      <div className="red-checklist-progress" id="red-checklist-progress"></div>
                      <ul className="red-checklist-items" id="red-checklist-items"></ul>
                      <button type="button" className="red-checklist-add-btn" id="red-checklist-add-btn"><i data-lucide="plus"></i> Adicionar item</button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <div className="era-items" id="items-red"></div>
        </div>
        <div className="era-page" id="page-1989"><div className="era-toolbar"><div className="era-tags" id="tags-1989"></div><button className="btn-add-item" data-era="1989">+ Novo Item</button></div><div className="era-items" id="items-1989"></div></div>
        <div className="era-page" id="page-reputation"><div className="era-toolbar"><div className="era-tags" id="tags-reputation"></div><button className="btn-add-item" data-era="reputation">+ Novo Item</button></div><div className="era-items" id="items-reputation"></div></div>
        <div className="era-page" id="page-lover"><div className="era-toolbar"><div className="era-tags" id="tags-lover"></div><button className="btn-add-item" data-era="lover">+ Novo Item</button></div><div className="era-items" id="items-lover"></div></div>
        <div className="era-page" id="page-folklore">
          <div className="era-toolbar">
            <div className="era-tags" id="tags-folklore"></div>
            <button className="btn-add-item btn-upload-md" id="btn-upload-folklore-md" data-era="folklore">Carregar.md</button>
            <input type="file" id="input-upload-folklore-md" accept=".md,.txt,text/markdown,text/plain" style={{ display: 'none' }} />
            <button className="btn-add-item" data-era="folklore">+ Novo Item</button>
          </div>
          <div className="era-items" id="items-folklore"></div>
        </div>

        <div className="era-page" id="page-evermore">
          <section className="profile-page x-profile-shell">
            <header className="x-profile-topbar">
              <button type="button" className="x-profile-back" aria-label="Voltar">
                <i data-lucide="arrow-left"></i>
              </button>
              <div className="x-profile-top-title">
                <strong id="profile-name-top">Seu Nome</strong>
                <small id="profile-headline-count">0 Contribuições</small>
              </div>
            </header>

            <div className="profile-cover" id="profile-cover">
              <img loading="lazy" decoding="async" src="" alt="Header do perfil" className="profile-header-image" id="profile-header-image" />
            </div>

            <div className="x-profile-main">
              <div className="profile-avatar-large x-avatar-floating">
                <img loading="lazy" decoding="async" src="imagens, icons/Sidebar/user 3 1.svg" alt="Avatar" className="avatar-img-large" id="profile-avatar" />
              </div>
              <div className="x-profile-actions">
                <a href="#" className="btn-edit-profile x-edit-profile" id="btn-edit-profile">Editar Perfil</a>
              </div>
            </div>

            <div className="x-profile-content">
              <div className="x-profile-header-info">
                <h2 id="profile-name">Seu Nome</h2>
                <p className="profile-username" id="profile-username">@seu_usuario</p>
                <div className="profile-bio-wrap">
                  <p className="profile-bio" id="profile-bio">Clique para adicionar uma descricao...</p>
                  <textarea className="profile-bio-edit" id="profile-bio-edit" maxLength="160" placeholder="Escreva algo sobre voce..." style={{ display: 'none' }}></textarea>
                  <div className="profile-bio-footer" id="profile-bio-footer" style={{ display: 'none' }}>
                    <span className="bio-char-count" id="bio-char-count">0/160</span>
                    <div className="bio-footer-actions">
                      <button className="bio-btn bio-btn-cancel" id="bio-cancel" type="button">Cancelar</button>
                      <button className="bio-btn bio-btn-save" id="bio-save" type="button">Salvar</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="x-profile-meta">
                <span className="x-meta-item"><i data-lucide="map-pin"></i><span id="profile-location">-</span></span>
                <span className="x-meta-item"><i data-lucide="cake"></i><span id="profile-birthdate">-</span></span>
                <span className="x-meta-item"><i data-lucide="link-2"></i><a href="#" id="profile-website" className="detail-value is-empty">-</a></span>
                <span className="x-meta-item"><i data-lucide="calendar-days"></i><span id="profile-joined">-</span></span>
              </div>

              <div className="x-profile-follow-row">
                <span><strong id="stat-items">0</strong> Itens</span>
                <span><strong id="stat-playlists">0</strong> Playlists</span>
                <span><strong id="stat-repos">0</strong> Repositorios</span>
                <span><strong id="stat-tags">0</strong> Tags</span>
              </div>
            </div>

            <div className="x-profile-tabs" role="tablist" aria-label="Resumo do perfil">
              <button type="button" className="x-tab active">Itens</button>
              <button type="button" className="x-tab">Tags</button>
              <button type="button" className="x-tab">Playlists</button>
              <button type="button" className="x-tab">Repositorios</button>
            </div>
          </section>
        </div>

        <div className="era-page" id="page-settings">
          <section className="settings-page">
            <div className="painel-superficie settings-card settings-modern">
              <header className="settings-modern-header">
                <h3>Configurações do Perfil</h3>
                <p>Preferências, backup e histórico local. A edição do perfil fica na aba Perfil (Evermore).</p>
              </header>

              <section className="settings-modern-section">
                <h4>Dados</h4>
                <div className="settings-pref-list">
                  <div className="settings-pref-item">
                    <div className="settings-pref-copy">
                      <strong>Backup de dados</strong>
                      <span>Exporte e importe seus dados sem perder informacoes.</span>
                    </div>
                    <div className="settings-pref-actions">
                      <button type="button" className="btn-export" id="btn-export">Exportar Backup (.json)</button>
                      <div className="import-wrapper">
                        <button type="button" className="btn-import" id="btn-import">Importar Backup</button>
                        <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="import-status" id="import-status"></p>
              </section>

              <section className="settings-modern-section">
                <h4>Histórico local</h4>
                <div className="settings-pref-list">
                  <div className="settings-pref-item">
                    <div className="settings-pref-copy">
                      <strong>Versões locais</strong>
                      <span>Últimas 10 versões para restauração rápida.</span>
                    </div>
                    <div className="settings-pref-actions">
                      <button type="button" className="btn-export" id="btn-refresh-versions">Atualizar lista</button>
                    </div>
                  </div>
                </div>
                <ul id="local-versions-list" className="local-versions-list">
                  <li className="local-version-empty">Nenhuma versão local encontrada.</li>
                </ul>
                <p className="import-status" id="versions-status"></p>
              </section>

              <div className="settings-modern-actions">
                <button type="button" className="settings-cancel-btn" id="settings-close-btn">Fechar</button>
                <button type="button" className="btn-save" id="settings-go-profile-btn">Ir para perfil</button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="modal-overlay" id="modal-edit-profile">
        <div className="modal-content profile-edit-modal-content profile-edit-twitter-shell">
          <div className="modal-header profile-edit-topbar">
            <div className="profile-edit-topbar-left">
              <button type="button" className="modal-close profile-edit-close-ghost" id="modal-edit-profile-close"><i data-lucide="x"></i></button>
              <h3>Editar perfil</h3>
            </div>
            <button type="button" className="btn-save profile-edit-save-top" id="settings-save-btn">Salvar</button>
          </div>

          <div className="profile-edit-scroll">
            <section className="profile-edit-cover-wrap">
              <div className="settings-header-preview" id="settings-header-preview">
                <img loading="lazy" decoding="async" src="" alt="Previa do header" className="settings-header-preview-image" id="settings-header-preview-image" />
                <div className="settings-header-actions profile-edit-cover-overlay-actions">
                  <button type="button" className="btn-import profile-edit-cover-cta profile-edit-cover-icon-btn" data-action="edit-cover" id="header-edit-btn" title="Alterar header"><i data-lucide="camera"></i></button>
                  <button type="button" className="btn-import profile-edit-cover-cta profile-edit-cover-icon-btn" data-action="remove-cover" id="header-remove-btn" style={{ display: 'none' }} title="Remover header"><i data-lucide="x"></i></button>
                </div>
              </div>
              <input type="file" id="header-input" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} />
            </section>

            <section className="profile-edit-avatar-row">
              <div className="profile-avatar profile-edit-avatar-floating">
                <img loading="lazy" decoding="async" src="imagens, icons/Sidebar/user 3 1.svg" alt="Avatar" className="avatar-img" id="avatar-img" />
                <button className="avatar-edit" id="avatar-edit-btn" type="button" title="Trocar foto"><img loading="lazy" decoding="async" src="imagens, icons/Settings/editorFoto.svg" alt="Editar foto" /></button>
                <button className="avatar-remove" id="avatar-remove-btn" type="button" title="Remover foto" style={{ display: 'none' }}>
                  <img loading="lazy" decoding="async" src="/remove-transparent.png" alt="" aria-hidden="true" />
                </button>
                <input type="file" id="avatar-input" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} />
              </div>
            </section>

            <section className="profile-edit-form-grid">
              <div className="form-group">
                <label>Nome</label>
                <input id="settings-name" type="text" placeholder="Seu nome" maxLength="50" />
                <small id="counter-settings-name">0/50</small>
              </div>
              <div className="form-group">
                <label>Usuário</label>
                <input id="settings-username" type="text" placeholder="seu_usuario" />
              </div>
              <div className="form-group">
                <label>Localização</label>
                <input id="settings-city" type="text" placeholder="Sao Paulo" maxLength="30" />
                <small id="counter-settings-city">0/30</small>
              </div>
              <div className="form-group">
                <label>Website</label>
                <input id="settings-website" type="text" placeholder="seusite.com" maxLength="100" />
                <small id="counter-settings-website">0/100</small>
              </div>
              <div className="form-group form-group-full">
                <label>Bio</label>
                <textarea id="settings-bio" rows="4" maxLength="160" placeholder="Fale um pouco sobre voce..."></textarea>
                <small id="counter-settings-bio">0/160</small>
              </div>
            </section>

            <section className="profile-edit-birthdate-shell">
              <input id="settings-birthdate" type="hidden" />
              <button type="button" className="profile-edit-birth-trigger" id="profile-edit-birth-trigger" aria-expanded="false">
                <div className="profile-edit-birth-trigger-row">
                  <div>
                    <div className="profile-edit-birth-trigger-label">Data de nascimento</div>
                    <div className="profile-edit-birth-trigger-value" id="profile-edit-birth-summary">-</div>
                  </div>
                  <div className="profile-edit-birth-trigger-edit">Editar</div>
                </div>
              </button>
              <div className="profile-edit-birth-panel" id="profile-edit-birth-panel">
                <div className="profile-edit-birth-expanded">
                  <div className="profile-edit-birth-expanded-head">
                    <div className="profile-edit-birth-expanded-label">Data de nascimento</div>
                    <button type="button" className="profile-edit-birth-expanded-cancel" id="profile-edit-birth-cancel">Cancelar</button>
                  </div>

                  <p className="profile-edit-birth-expanded-copy">
                    Essa deve ser a data de nascimento da pessoa que usa a conta, seja a conta para uma empresa, para um evento ou para um gatinho.
                  </p>

                  <div className="profile-edit-birth-select-grid">
                    <div className="profile-edit-select-wrap">
                      <label className="profile-edit-select-label" htmlFor="settings-birth-month">Mês</label>
                      <select id="settings-birth-month" className="profile-edit-select"></select>
                      <span className="profile-edit-select-chevron" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
                    </div>
                    <div className="profile-edit-select-wrap">
                      <label className="profile-edit-select-label" htmlFor="settings-birth-day">Dia</label>
                      <select id="settings-birth-day" className="profile-edit-select"></select>
                      <span className="profile-edit-select-chevron" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
                    </div>
                    <div className="profile-edit-select-wrap">
                      <label className="profile-edit-select-label" htmlFor="settings-birth-year">Ano</label>
                      <select id="settings-birth-year" className="profile-edit-select"></select>
                      <span className="profile-edit-select-chevron" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
                    </div>
                  </div>

                  <div className="profile-edit-birth-visibility">
                    <div>
                      <h3 className="profile-edit-birth-visibility-title">Quem pode ver isso?</h3>
                      <p className="profile-edit-birth-visibility-copy">
                        Você pode controlar quem vê seu aniversario.{" "}
                        <a href="#" className="profile-edit-birth-more" onClick={(e) => e.preventDefault()}>Saiba mais</a>
                      </p>
                    </div>

                    <div className="profile-edit-select-wrap">
                      <label className="profile-edit-select-label" htmlFor="profile-edit-birth-visibility-date">Mês e dia</label>
                      <select id="profile-edit-birth-visibility-date" className="profile-edit-select" defaultValue="only-you">
                        <option value="only-you">Somente voce</option>
                        <option value="followers">Seus seguidores</option>
                        <option value="everyone">Todos</option>
                      </select>
                      <span className="profile-edit-select-chevron" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
                    </div>

                    <div className="profile-edit-select-wrap">
                      <label className="profile-edit-select-label" htmlFor="profile-edit-birth-visibility-year">Ano</label>
                      <select id="profile-edit-birth-visibility-year" className="profile-edit-select" defaultValue="only-you">
                        <option value="only-you">Somente voce</option>
                        <option value="followers">Seus seguidores</option>
                        <option value="everyone">Todos</option>
                      </select>
                      <span className="profile-edit-select-chevron" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
                    </div>
                  </div>
                </div>

                <div className="profile-edit-birth-actions">
                  <button type="button" className="profile-edit-birth-remove-link" id="profile-edit-birth-remove">Remover data de nascimento</button>
                </div>
              </div>
            </section>

            <p className="import-status" id="settings-save-status"></p>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-edit-photo">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Editar foto</h3>
            <button type="button" className="modal-close" id="modal-edit-photo-close"><i data-lucide="x"></i></button>
          </div>
          <div className="edit-photo-preview-wrap" id="edit-photo-preview-wrap" data-type="profile">
            <img src="" alt="Previa de edicao" id="edit-photo-preview" />
            <div className="edit-photo-empty" id="edit-photo-empty">Selecione uma imagem para editar.</div>
          </div>
          <div className="edit-photo-controls">
            <label htmlFor="edit-photo-zoom">Zoom</label>
            <input id="edit-photo-zoom" type="range" min="1" max="3" step="0.1" defaultValue="1" />
            <span id="edit-photo-zoom-value">1.0x</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="modal-btn-confirm-delete" id="edit-photo-apply">Aplicar</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-discard-profile">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Descartar alterações?</h3>
          </div>
          <p className="modal-delete-note-message">Você tem alterações não salvas no perfil.</p>
          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" id="discard-profile-cancel">Continuar editando</button>
            <button type="button" className="modal-btn-confirm-delete" id="discard-profile-confirm">Descartar</button>
          </div>
        </div>
      </div>
      <div className="modal-overlay" id="modal-edit-repo">
        <div className="modal-content">
          <div className="modal-header">
            <div className="repo-edit-title">
              <div className="repo-edit-header-icon" aria-hidden="true">
                <i data-lucide="folder-sync"></i>
              </div>
              <h3>Editar Repositorio Fixo</h3>
            </div>
            <button className="modal-close" id="modal-edit-repo-close"><i data-lucide="x"></i></button>
          </div>
          <form id="form-edit-repo" className="repo-edit-form">
            <input type="hidden" id="edit-repo-index" />

            <div className="form-group">
              <label>Slot</label>
              <input type="text" id="edit-repo-slot" placeholder="Selecione o Slot (1 ou 2)" disabled />
            </div>

            <div className="form-group">
              <label>Repositorio do Fearless</label>
              <select id="edit-repo-source" required>
                <option value="">Selecione um repositorio de Fearless</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nome exibido</label>
              <input type="text" id="edit-repo-name" />
            </div>

            <div className="form-group form-group-note">
              <label>Descrição</label>
              <textarea id="edit-repo-description" rows="4"></textarea>
              <small className="repo-modal-hint">Somente repositorios criados na era Fearless podem ser fixados aqui.</small>
            </div>

            <div className="repo-edit-actions">
              <button type="submit" className="btn-save-item repo-edit-save">Salvar Repositorio</button>
              <button type="button" className="repo-edit-cancel" id="edit-repo-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div className="modal-overlay" id="modal-create-red">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Criar novo</h3>
            <button type="button" className="modal-close" id="modal-create-red-close"><i data-lucide="x"></i></button>
          </div>
          <p className="modal-create-red-desc">Escolha o que deseja criar</p>
          <div className="modal-create-red-options">
            <button type="button" className="modal-create-red-card" id="modal-create-red-note">
              <span className="modal-create-red-icon modal-create-red-icon-note"><i data-lucide="file-text"></i></span>
              <div>
                <strong>Nota</strong>
                <span>Criar uma nova nota de texto</span>
              </div>
            </button>
            <button type="button" className="modal-create-red-card" id="modal-create-red-checklist">
              <span className="modal-create-red-icon modal-create-red-icon-checklist"><i data-lucide="check-square"></i></span>
              <div>
                <strong>Checklist</strong>
                <span>Criar lista com itens e checkboxes</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-delete-note">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Excluir item</h3>
            <button type="button" className="modal-close" id="modal-delete-note-close"><i data-lucide="x"></i></button>
          </div>
          <p className="modal-delete-note-message">Excluir este item? Esta ação não pode ser desfeita.</p>
          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" id="modal-delete-note-cancel">Cancelar</button>
            <button type="button" className="modal-btn-confirm-delete" id="modal-delete-note-confirm">Excluir</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="modal-add-item">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Novo Item</h3>
            <button className="modal-close"><i data-lucide="x"></i></button>
          </div>
          <form id="form-add-item">
            <div className="form-group">
              <label>Tipo</label>
              <select id="item-type">
                <option value="link">Link</option>
                <option value="repo">Repositorio</option>
                <option value="playlist">Playlist</option>
                <option value="note">Nota</option>
                <option value="markdown">Markdown (Folklore)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Título</label>
              <input type="text" id="item-title" required placeholder="Nome do item" />
            </div>
            <div className="form-group field-url">
              <label>URL</label>
              <input type="url" id="item-url" placeholder="https://..." />
            </div>
            <div className="form-group field-content" style={{ display: 'none' }}>
              <label>Conteúdo</label>
              <textarea id="item-content" rows="4" placeholder="Sua nota..."></textarea>
            </div>
            <div className="form-group">
              <label>Tags <small>(separadas por virgula)</small></label>
              <input type="text" id="item-tags" placeholder="tag1, tag2, tag3" />
            </div>
            <div className="form-group">
              <label>Era / Categoria</label>
              <select id="item-category">
                <option value="fearless">Fearless</option>
                <option value="speak-now">Speak Now</option>
                <option value="1989">1989</option>
                <option value="reputation">Reputation</option>
                <option value="lover">Lover</option>
                <option value="folklore">Folklore</option>
              </select>
            </div>
            <div className="form-group form-group-inline">
              <label><input type="checkbox" id="item-pinned" /> Fixar no topo</label>
            </div>
            <button type="submit" className="btn-save-item">Salvar</button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default App;







