import { useEffect } from 'react';
import './styles/style.css';
import Storage from './legacy/storage.js';
import { initLegacyApp } from './legacy/app.js';
import { initRepositorios } from './legacy/repositorios.js';
import initShellInteractions from './legacy/bootstrap.js';

function App() {
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      await Storage.bootstrapPersistence();
      if (cancelled) return;

      initLegacyApp();
      initShellInteractions();
      initRepositorios();
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand-row">
          <a href="#" className="brand-icon-slot"></a>
          <h1 className="brand">TaylorSwift.</h1>
        </div>
        <nav className="menu">
          <a href="#" className="era-link active" data-target="debut" data-era-color="debut"><span className="menu-icon"><i data-lucide="home"></i></span>Debut</a>
          <a href="#" className="era-link" data-target="fearless" data-era-color="fearless"><span className="menu-icon"><img src="imagens, icons/Sidebar/hand.png" alt="Fearless" className="sidebar-custom-icon" /></span>Fearless</a>
          <a href="#" className="era-link" data-target="speak-now" data-era-color="speak-now"><span className="menu-icon"><i data-lucide="mic-2"></i></span>Speak Now</a>
          <a href="#" className="era-link" data-target="red" data-era-color="red"><span className="menu-icon"><img src="imagens, icons/Sidebar/scarf.png" alt="Red" className="sidebar-custom-icon" /></span>Red</a>
          <a href="#" className="era-link" data-target="1989" data-era-color="1989"><span className="menu-icon"><img src="imagens, icons/Sidebar/statue-of-liberty.png" alt="1989" className="sidebar-custom-icon" /></span>1989</a>
          <a href="#" className="era-link" data-target="reputation" data-era-color="reputation"><span className="menu-icon"><img src="imagens, icons/Sidebar/snake.png" alt="Reputation" className="sidebar-custom-icon" /></span>Reputation</a>
          <a href="#" className="era-link" data-target="lover" data-era-color="lover"><span className="menu-icon"><img src="imagens, icons/Sidebar/archer.png" alt="Lover" className="sidebar-custom-icon" /></span>Lover</a>
          <a href="#" className="era-link" data-target="folklore" data-era-color="folklore"><span className="menu-icon"><img src="imagens, icons/Sidebar/ball.png" alt="Folklore" className="sidebar-custom-icon" /></span>Folklore</a>
          <a href="#" className="era-link" data-target="evermore" data-era-color="evermore"><span className="menu-icon"><i data-lucide="user-circle"></i></span>Evermore</a>
          <a href="#" className="era-link" data-target="settings" data-era-color="settings"><span className="menu-icon"><i data-lucide="settings"></i></span>Settings</a>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <h2 id="topbar-title">Debut</h2>
          <div className="topbar-right">
            <div className="search">
              <span className="search-icon"><img src="imagens, icons/topbar/magnifying-glass.svg" alt="" /></span>
              <input type="text" className="search-input" id="search-input" placeholder="Pesquisar algo..." autoComplete="off" />
              <div className="search-results" id="search-results"></div>
            </div>
            <div className="topbar-icons">
              <a href="#" className="icon topbar-settings-btn"><img src="imagens, icons/topbar/settings.svg" alt="Configuracoes" /></a>
              <a href="#" className="icon"><img src="imagens, icons/topbar/notification.svg" alt="Notificacoes" /></a>
              <a href="#" className="icon profile-icon"><img src="imagens, icons/Sidebar/user 3 1.svg" alt="Perfil" /></a>
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
              <h3>Itens Fixados</h3>
              <div className="painel-superficie">
                <ul id="debut-pinned" className="highlight-list">
                  <li><span><i data-lucide="pin"></i></span><b className="plus">Fixe itens nas eras</b></li>
                </ul>
              </div>
            </div>
            <div className="highlight-section">
              <h3>Mais Acessados</h3>
              <div className="painel-superficie">
                <ul id="debut-accessed" className="highlight-list">
                  <li><span><i data-lucide="bar-chart-3"></i></span><b className="plus">Acesse itens para ver aqui</b></li>
                </ul>
              </div>
            </div>
          </section>

          <section className="charts-grid">
            <div className="painel-contribuicoes-github">
              <h3>Contribuicoes GitHub</h3>
              <div className="painel-superficie">
                <div className="github-graph-header">
                  <div className="github-total-wrap">
                    <strong id="github-total-contributions">-</strong>
                    <small>contribuicoes no periodo</small>
                  </div>
                  <div className="github-controls">
                    <label>Periodo</label>
                    <div className="github-chip-group" id="github-period-group">
                      <button type="button" className="github-chip github-period-btn" data-period="30">30d</button>
                      <button type="button" className="github-chip github-period-btn active" data-period="90">90d</button>
                      <button type="button" className="github-chip github-period-btn" data-period="365">365d</button>
                    </div>
                  </div>
                </div>
                <div className="contribution-body">
                  <div className="contribution-weekdays" aria-hidden="true">
                    <span className="weekday-mon">Mon</span>
                    <span className="weekday-wed">Wed</span>
                    <span className="weekday-fri">Fri</span>
                  </div>
                  <div className="contribution-graph-wrap">
                    <div className="contribution-months" id="contribution-months"></div>
                    <div className="contribution-graph" id="contribution-graph"></div>
                  </div>
                </div>
                <div className="contribution-footer">
                  <small className="contribution-help">Contributions calendar</small>
                  <div className="contribution-legend" aria-label="Contribution intensity legend">
                    <span>Less</span>
                    <span className="contribution-day level-0 legend-cell"></span>
                    <span className="contribution-day level-1 legend-cell"></span>
                    <span className="contribution-day level-2 legend-cell"></span>
                    <span className="contribution-day level-3 legend-cell"></span>
                    <span className="contribution-day level-4 legend-cell"></span>
                    <span>More</span>
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
        <div className="era-page" id="page-red"><div className="era-toolbar"><div className="era-tags" id="tags-red"></div><button className="btn-add-item" data-era="red">+ Novo Item</button></div><div className="era-items" id="items-red"></div></div>
        <div className="era-page" id="page-1989"><div className="era-toolbar"><div className="era-tags" id="tags-1989"></div><button className="btn-add-item" data-era="1989">+ Novo Item</button></div><div className="era-items" id="items-1989"></div></div>
        <div className="era-page" id="page-reputation"><div className="era-toolbar"><div className="era-tags" id="tags-reputation"></div><button className="btn-add-item" data-era="reputation">+ Novo Item</button></div><div className="era-items" id="items-reputation"></div></div>
        <div className="era-page" id="page-lover"><div className="era-toolbar"><div className="era-tags" id="tags-lover"></div><button className="btn-add-item" data-era="lover">+ Novo Item</button></div><div className="era-items" id="items-lover"></div></div>
        <div className="era-page" id="page-folklore"><div className="era-toolbar"><div className="era-tags" id="tags-folklore"></div><button className="btn-add-item" data-era="folklore">+ Novo Item</button></div><div className="era-items" id="items-folklore"></div></div>

        <div className="era-page" id="page-evermore">
          <section className="profile-page">
            <div className="profile-header">
              <div className="profile-avatar-large">
                <img src="imagens, icons/Sidebar/user 3 1.svg" alt="Avatar" className="avatar-img-large" id="profile-avatar" />
              </div>
              <div className="profile-header-info">
                <h2 id="profile-name">Seu Nome</h2>
                <p className="profile-username" id="profile-username">@seu_usuario</p>
                <div className="profile-bio-wrap">
                  <p className="profile-bio" id="profile-bio">Clique para adicionar uma descricao...</p>
                  <textarea className="profile-bio-edit" id="profile-bio-edit" maxLength="160" placeholder="Escreva algo sobre voce..." style={{ display: 'none' }}></textarea>
                  <div className="profile-bio-footer" id="profile-bio-footer" style={{ display: 'none' }}>
                    <span className="bio-char-count" id="bio-char-count">0/160</span>
                    <div className="bio-footer-actions">
                      <button className="bio-btn bio-btn-cancel" id="bio-cancel">Cancelar</button>
                      <button className="bio-btn bio-btn-save" id="bio-save">Salvar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <div className="stat-number" id="stat-items">0</div>
                <div className="stat-label">Itens</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" id="stat-playlists">0</div>
                <div className="stat-label">Playlists</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" id="stat-repos">0</div>
                <div className="stat-label">Repositorios</div>
              </div>
              <div className="stat-card">
                <div className="stat-number" id="stat-tags">0</div>
                <div className="stat-label">Tags</div>
              </div>
            </div>

            <div className="profile-details">
              <div className="painel-superficie">
                <h3>Informacoes</h3>
                <div className="profile-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value" id="profile-email">-</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Localizacao</span>
                    <span className="detail-value" id="profile-location">-</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Aniversario</span>
                    <span className="detail-value" id="profile-birthdate">-</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Este Usuário desde</span>
                    <span className="detail-value" id="profile-joined">-</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <a href="#" className="btn-edit-profile" id="btn-edit-profile">Editar Perfil</a>
            </div>
          </section>
        </div>

        <div className="era-page" id="page-settings">
          <section className="settings-page">
            <div className="painel-superficie settings-card">
              <nav className="settings-tabs">
                <button className="tab active" data-tab="profile">Edit Profile</button>
                <button className="tab" data-tab="preferences">Preferences</button>
                <button className="tab" data-tab="security">Security</button>
              </nav>

              <div className="tab-content active" id="tab-profile">
                <div className="settings-form-layout">
                  <div className="profile-avatar">
                    <img src="imagens, icons/Sidebar/user 3 1.svg" alt="Avatar" className="avatar-img" id="avatar-img" />
                    <button className="avatar-edit" id="avatar-edit-btn"><img src="imagens, icons/Settings/editorFoto.svg" alt="Editar foto" /></button>
                    <button className="avatar-remove" id="avatar-remove-btn" title="Remover foto" style={{ display: 'none' }}>&times;</button>
                    <input type="file" id="avatar-input" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} />
                  </div>
                  <div className="settings-form">
                    <div className="form-grid">
                      <div className="form-group"><label>Your Name</label><input id="settings-name" type="text" placeholder="Charlene Reed" /></div>
                      <div className="form-group"><label>User Name</label><input id="settings-username" type="text" placeholder="Charlene Reed" /></div>
                      <div className="form-group"><label>Email</label><input id="settings-email" type="email" placeholder="charlenereed@gmail.com" /></div>
                      <div className="form-group"><label>Password</label><input id="settings-password" type="password" placeholder="**********" /></div>
                      <div className="form-group"><label>Date of Birth</label><input id="settings-birthdate" type="date" /></div>
                      <div className="form-group"><label>Present Address</label><input id="settings-present-address" type="text" placeholder="San Jose, California, USA" /></div>
                      <div className="form-group"><label>Permanent Address</label><input id="settings-permanent-address" type="text" placeholder="San Jose, California, USA" /></div>
                      <div className="form-group"><label>City</label><input id="settings-city" type="text" placeholder="San Jose" /></div>
                      <div className="form-group"><label>Postal Code</label><input id="settings-postal-code" type="text" placeholder="45962" /></div>
                      <div className="form-group"><label>Country</label><input id="settings-country" type="text" placeholder="USA" /></div>
                    </div>
                    <div className="form-actions"><button className="btn-save" id="settings-save-btn" type="button">Save</button></div>
                    <p className="import-status" id="settings-save-status"></p>
                  </div>
                </div>
              </div>

              <div className="tab-content" id="tab-preferences">
                <div className="settings-section">
                  <h4>Dados</h4>
                  <p className="settings-desc">Exporte um backup dos seus itens ou importe de um arquivo anterior.</p>
                  <div className="settings-actions-row">
                    <button className="btn-export" id="btn-export">Exportar Backup (.json)</button>
                    <div className="import-wrapper">
                      <button className="btn-import" id="btn-import">Importar Backup</button>
                      <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} />
                    </div>
                  </div>
                  <p className="import-status" id="import-status"></p>
                </div>
              </div>

              <div className="tab-content" id="tab-security">
                <p className="tab-placeholder">Security em breve.</p>
              </div>
            </div>
          </section>
        </div>
      </section>

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
              </select>
            </div>
            <div className="form-group">
              <label>Titulo</label>
              <input type="text" id="item-title" required placeholder="Nome do item" />
            </div>
            <div className="form-group field-url">
              <label>URL</label>
              <input type="url" id="item-url" placeholder="https://..." />
            </div>
            <div className="form-group field-content" style={{ display: 'none' }}>
              <label>Conteudo</label>
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
                <option value="red">Red</option>
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
