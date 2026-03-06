function initShellInteractions() {
  document.querySelectorAll('.era-link').forEach((link) => {
    if (link.dataset.boundClick === '1') return;
    link.dataset.boundClick = '1';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      const eraColor = link.dataset.eraColor;

      document.querySelectorAll('.era-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      document.body.setAttribute('data-era', eraColor);

      document.querySelectorAll('.era-page').forEach((p) => p.classList.remove('active'));
      const nextPage = document.getElementById('page-' + target);
      if (nextPage) nextPage.classList.add('active');

      const topTitle = document.getElementById('topbar-title');
      if (topTitle) topTitle.textContent = link.textContent.trim();
    });
  });

  const verMais = document.getElementById('ver-mais-repos');
  if (verMais && verMais.dataset.boundClick !== '1') {
    verMais.dataset.boundClick = '1';
    verMais.addEventListener('click', (e) => {
      e.preventDefault();
      const fearlessLink = document.querySelector('.era-link[data-target="fearless"]');
      if (fearlessLink) fearlessLink.click();
    });
  }

  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const link = document.querySelector('.era-link[data-target="' + CSS.escape(hash) + '"]');
    if (link) link.click();
  }

  const settingsBtn = document.querySelector('.topbar-settings-btn');
  if (settingsBtn && settingsBtn.dataset.boundClick !== '1') {
    settingsBtn.dataset.boundClick = '1';
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const settingsLink = document.querySelector('.era-link[data-target="settings"]');
      if (settingsLink) settingsLink.click();
    });
  }

  document.querySelectorAll('.settings-tabs .tab').forEach((tab) => {
    if (tab.dataset.boundClick === '1') return;
    tab.dataset.boundClick = '1';
    tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tabs .tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const nextTab = document.getElementById('tab-' + tab.dataset.tab);
      if (nextTab) nextTab.classList.add('active');
    });
  });

  const btnExport = document.getElementById('btn-export');
  if (btnExport && btnExport.dataset.boundClick !== '1') {
    btnExport.dataset.boundClick = '1';
    btnExport.addEventListener('click', () => window.Storage.exportData());
  }

  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');
  if (btnImport && importFile && btnImport.dataset.boundClick !== '1') {
    btnImport.dataset.boundClick = '1';
    btnImport.addEventListener('click', () => importFile.click());
  }

  if (importFile && importFile.dataset.boundChange !== '1') {
    importFile.dataset.boundChange = '1';
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const status = document.getElementById('import-status');
      try {
        const count = await window.Storage.importData(file);

        if (window.App && typeof window.App.renderAllEras === 'function') {
          window.App.renderAllEras();
        }
        if (window.App && typeof window.App.renderDebutHighlights === 'function') {
          window.App.renderDebutHighlights();
        }
        if (typeof window.renderizarRecentes === 'function') {
          window.renderizarRecentes();
        }

        if (status) {
          status.textContent = count + ' itens importados com sucesso!';
          status.className = 'import-status success';
        }
      } catch {
        if (status) {
          status.textContent = 'Erro ao importar. Verifique o arquivo.';
          status.className = 'import-status error';
        }
      }
      e.target.value = '';
    });
  }

  const DEFAULT_AVATAR = 'imagens, icons/Sidebar/user 3 1.svg';
  const avatarImg = document.getElementById('avatar-img');
  const topbarIcon = document.querySelector('.profile-icon');
  const topbarImg = document.querySelector('.profile-icon img');
  const editBtn = document.getElementById('avatar-edit-btn');
  const removeBtn = document.getElementById('avatar-remove-btn');
  const fileInput = document.getElementById('avatar-input');

  function applyAvatar(dataUrl) {
    if (!avatarImg || !removeBtn) return;
    avatarImg.src = dataUrl;
    if (topbarImg) topbarImg.src = dataUrl;
    if (topbarIcon) topbarIcon.classList.add('has-avatar');
    removeBtn.style.display = 'flex';
  }

  function resetAvatar() {
    if (!avatarImg || !removeBtn) return;
    avatarImg.src = DEFAULT_AVATAR;
    if (topbarImg) topbarImg.src = DEFAULT_AVATAR;
    if (topbarIcon) topbarIcon.classList.remove('has-avatar');
    removeBtn.style.display = 'none';
  }

  if (window.Storage) {
    const saved = window.Storage.getAvatar();
    if (saved) applyAvatar(saved);
  }

  if (editBtn && fileInput && editBtn.dataset.boundClick !== '1') {
    editBtn.dataset.boundClick = '1';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput && fileInput.dataset.boundChange !== '1') {
    fileInput.dataset.boundChange = '1';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('Imagem muito grande. Maximo: 2 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        window.Storage.saveAvatar(dataUrl);
        applyAvatar(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  if (removeBtn && removeBtn.dataset.boundClick !== '1') {
    removeBtn.dataset.boundClick = '1';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.Storage.removeAvatar();
      resetAvatar();
    });
  }

  const saveBtn = document.getElementById('settings-save-btn');
  const saveStatus = document.getElementById('settings-save-status');
  const profileFields = {
    name: document.getElementById('settings-name'),
    username: document.getElementById('settings-username'),
    email: document.getElementById('settings-email'),
    password: document.getElementById('settings-password'),
    birthDate: document.getElementById('settings-birthdate'),
    presentAddress: document.getElementById('settings-present-address'),
    permanentAddress: document.getElementById('settings-permanent-address'),
    city: document.getElementById('settings-city'),
    postalCode: document.getElementById('settings-postal-code'),
    country: document.getElementById('settings-country')
  };

  function loadProfileForm() {
    if (!window.Storage || typeof window.Storage.getProfileSettings !== 'function') return;
    const data = window.Storage.getProfileSettings();
    Object.keys(profileFields).forEach((key) => {
      const el = profileFields[key];
      if (!el) return;
      el.value = data[key] || '';
    });
  }

  loadProfileForm();

  if (saveBtn && saveBtn.dataset.boundClick !== '1') {
    saveBtn.dataset.boundClick = '1';
    saveBtn.addEventListener('click', async () => {
      const payload = {};
      Object.keys(profileFields).forEach((key) => {
        const el = profileFields[key];
        if (!el) return;
        payload[key] = String(el.value || '').trim();
      });

      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        if (saveStatus) {
          saveStatus.textContent = 'Informe um email valido para salvar.';
          saveStatus.className = 'import-status error';
        }
        return;
      }

      try {
        if (typeof window.Storage.saveProfileAndAllData === 'function') {
          await window.Storage.saveProfileAndAllData(payload);
        } else {
          window.Storage.saveProfileSettings(payload);
          if (typeof window.Storage.pushStateToServer === 'function') {
            await window.Storage.pushStateToServer();
          }
          if (typeof window.Storage.createServerVersion === 'function') {
            await window.Storage.createServerVersion('settings-profile-save');
          }
        }
        if (saveStatus) {
          saveStatus.textContent = 'Perfil e dados gerais salvos com sucesso!';
          saveStatus.className = 'import-status success';
        }
      } catch {
        if (saveStatus) {
          saveStatus.textContent = 'Salvo localmente. Nao foi possivel sincronizar com o servidor agora.';
          saveStatus.className = 'import-status error';
        }
      }
    });
  }

  // ===== PERFIL (EVERMORE) =====
  function updateProfilePage() {
    if (!window.Storage) return;

    // Obter dados do perfil
    const profileData = window.Storage.getProfileSettings();
    const avatar = window.Storage.getAvatar() || 'imagens, icons/Sidebar/user 3 1.svg';
    
    // Atualizar avatar
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) profileAvatar.src = avatar;

    // Atualizar nome e username
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = profileData.name || 'Seu Nome';

    const profileUsername = document.getElementById('profile-username');
    if (profileUsername) profileUsername.textContent = '@' + (profileData.username || 'seu_usuario');

    // Atualizar bio
    const profileBio = document.getElementById('profile-bio');
    if (profileBio) {
      const bio = profileData.bio || '';
      if (bio) {
        profileBio.textContent = bio;
        profileBio.classList.remove('is-placeholder');
      } else {
        profileBio.textContent = 'Clique para adicionar uma descricao...';
        profileBio.classList.add('is-placeholder');
      }
    }

    // Atualizar informacoes
    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) profileEmail.textContent = profileData.email || '-';

    const profileLocation = document.getElementById('profile-location');
    if (profileLocation) {
      const location = profileData.city || profileData.presentAddress || '-';
      profileLocation.textContent = location;
    }

    const profileBirthdate = document.getElementById('profile-birthdate');
    if (profileBirthdate) profileBirthdate.textContent = profileData.birthDate || '-';

    // Data de inscricao (primeira vez que acessou)
    const profileJoined = document.getElementById('profile-joined');
    if (profileJoined) {
      const joined = localStorage.getItem('profileJoinedDate');
      if (!joined) {
        const now = new Date().toLocaleDateString('pt-BR');
        localStorage.setItem('profileJoinedDate', now);
        profileJoined.textContent = now;
      } else {
        profileJoined.textContent = joined;
      }
    }

    // Contar itens e estatisticas
    const allItems = window.Storage.getAll() || [];
    const playlists = allItems.filter(item => item.type === 'playlist').length;
    const repos = allItems.filter(item => item.type === 'repo').length;
    const localItems = allItems.length;

    // Contar tags unicas
    let allTags = new Set();
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => allTags.add(tag));
      }
    });
    const tagsCount = allTags.size;

    // Atualizar estatisticas
    const statItems = document.getElementById('stat-items');
    if (statItems) statItems.textContent = localItems;

    const statPlaylists = document.getElementById('stat-playlists');
    if (statPlaylists) statPlaylists.textContent = playlists;

    const statRepos = document.getElementById('stat-repos');
    if (statRepos) statRepos.textContent = repos;

    const statTags = document.getElementById('stat-tags');
    if (statTags) statTags.textContent = tagsCount;
  }

  // Atualizar perfil ao carregar
  updateProfilePage();

  // Botao de editar perfil - redireciona para settings
  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile && btnEditProfile.dataset.boundClick !== '1') {
    btnEditProfile.dataset.boundClick = '1';
    btnEditProfile.addEventListener('click', (e) => {
      e.preventDefault();
      const settingsLink = document.querySelector('.era-link[data-target="settings"]');
      if (settingsLink) settingsLink.click();
    });
  }

  // Clique no icone de perfil (topbar) - redireciona para evermore
  const profileIcon = document.querySelector('.profile-icon');
  if (profileIcon && profileIcon.dataset.boundClick !== '1') {
    profileIcon.dataset.boundClick = '1';
    profileIcon.addEventListener('click', (e) => {
      e.preventDefault();
      const evermoreLink = document.querySelector('.era-link[data-target="evermore"]');
      if (evermoreLink) {
        evermoreLink.click();
        // Atualizar dados do perfil quando navegar para evermore
        updateProfilePage();
      }
    });
  }

  // ===== BIO INLINE EDIT =====
  const bioText = document.getElementById('profile-bio');
  const bioEdit = document.getElementById('profile-bio-edit');
  const bioFooter = document.getElementById('profile-bio-footer');
  const bioCharCount = document.getElementById('bio-char-count');
  const bioCancel = document.getElementById('bio-cancel');
  const bioSave = document.getElementById('bio-save');

  function openBioEditor() {
    if (!bioText || !bioEdit || !bioFooter) return;
    const currentProfile = window.Storage ? window.Storage.getProfileSettings() : {};
    const currentBio = currentProfile.bio || '';
    bioEdit.value = currentBio;
    bioText.style.display = 'none';
    bioEdit.style.display = 'block';
    bioFooter.style.display = 'flex';
    updateCharCount();
    bioEdit.focus();
  }

  function closeBioEditor() {
    if (!bioText || !bioEdit || !bioFooter) return;
    bioText.style.display = '';
    bioEdit.style.display = 'none';
    bioFooter.style.display = 'none';
  }

  function updateCharCount() {
    if (!bioCharCount || !bioEdit) return;
    const len = bioEdit.value.length;
    bioCharCount.textContent = len + '/160';
    bioCharCount.classList.toggle('over-limit', len >= 150);
  }

  async function saveBio() {
    if (!bioEdit || !window.Storage) return;
    const newBio = bioEdit.value.trim().slice(0, 160);
    window.Storage.saveProfileSettings({ bio: newBio });
    closeBioEditor();
    updateProfilePage();
    try {
      if (typeof window.Storage.pushStateToServer === 'function') {
        await window.Storage.pushStateToServer();
      }
    } catch { /* sync silenciosa */ }
  }

  if (bioText && bioText.dataset.boundClick !== '1') {
    bioText.dataset.boundClick = '1';
    bioText.addEventListener('click', openBioEditor);
  }

  if (bioEdit && bioEdit.dataset.boundInput !== '1') {
    bioEdit.dataset.boundInput = '1';
    bioEdit.addEventListener('input', updateCharCount);
    bioEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeBioEditor();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveBio();
      }
    });
  }

  if (bioCancel && bioCancel.dataset.boundClick !== '1') {
    bioCancel.dataset.boundClick = '1';
    bioCancel.addEventListener('click', closeBioEditor);
  }

  if (bioSave && bioSave.dataset.boundClick !== '1') {
    bioSave.dataset.boundClick = '1';
    bioSave.addEventListener('click', saveBio);
  }

  // Expor funcao para atualizar perfil
  window.updateProfilePage = updateProfilePage;
}

export default initShellInteractions;
