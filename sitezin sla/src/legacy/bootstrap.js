function initShellInteractions() {
  function bindNavigationBlocks() {
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

        if (target === 'red' && window.App && typeof window.App.renderRedNotes === 'function') {
          window.App.redSelectedNoteId = '';
          window.App.renderRedNotes();
        }

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
  }

  function bindWorkspaceSwitcher() {
    const workspaceSwitcher = document.getElementById('workspace-switcher');
    const workspaceSwitchStatus = document.getElementById('workspace-switch-status');
    if (!workspaceSwitcher || !window.Storage) return;

    const initialWorkspace = window.Storage.currentWorkspace || 'default';
    workspaceSwitcher.value = initialWorkspace;

    if (workspaceSwitchStatus) workspaceSwitchStatus.textContent = 'Espaco de trabalho: ' + initialWorkspace;

    if (workspaceSwitcher.dataset.boundChange !== '1') {
      workspaceSwitcher.dataset.boundChange = '1';
      workspaceSwitcher.addEventListener('change', async () => {
        const nextWorkspace = workspaceSwitcher.value || 'default';
        if (workspaceSwitchStatus) workspaceSwitchStatus.textContent = 'Trocando...';
        window.Storage.setWorkspace(nextWorkspace);
        await window.Storage.bootstrapPersistence();

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
      });
    }
  }

  bindNavigationBlocks();
  bindWorkspaceSwitcher();
  const DEFAULT_AVATAR = 'imagens, icons/Sidebar/user 3 1.svg';
  const avatarImg = document.getElementById('avatar-img');
  const topbarIcon = document.querySelector('.profile-icon');
  const topbarImg = document.querySelector('.profile-icon img');
  const editBtn = document.getElementById('avatar-edit-btn');
  const profileEditPhotoCta = document.getElementById('profile-edit-photo-cta');
  const settingsUploadBtn = document.getElementById('settings-upload-btn');
  const removeBtn = document.getElementById('avatar-remove-btn');
  const fileInput = document.getElementById('avatar-input');
  const profileCover = document.getElementById('profile-cover');
  const profileHeaderImage = document.getElementById('profile-header-image');
  const settingsHeaderPreview = document.getElementById('settings-header-preview');
  const settingsHeaderPreviewImage = document.getElementById('settings-header-preview-image');
  const headerEditBtn = document.getElementById('header-edit-btn');
  const headerRemoveBtn = document.getElementById('header-remove-btn');
  const headerInput = document.getElementById('header-input');
  const coverActionButtons = document.querySelectorAll('#modal-edit-profile .profile-edit-cover-cta[data-action]');
  const editPhotoModal = document.getElementById('modal-edit-photo');
  const editPhotoCloseBtn = document.getElementById('modal-edit-photo-close');
  const editPhotoApplyBtn = document.getElementById('edit-photo-apply');
  const editPhotoPreview = document.getElementById('edit-photo-preview');
  const editPhotoPreviewWrap = document.getElementById('edit-photo-preview-wrap');
  const editPhotoEmpty = document.getElementById('edit-photo-empty');
  const editPhotoZoom = document.getElementById('edit-photo-zoom');
  const editPhotoZoomValue = document.getElementById('edit-photo-zoom-value');
  const editProfileModal = document.getElementById('modal-edit-profile');
  const editProfileModalContent = editProfileModal
    ? editProfileModal.querySelector('.profile-edit-modal-content')
    : null;
  const editProfileScroll = editProfileModal
    ? editProfileModal.querySelector('.profile-edit-scroll')
    : null;
  const discardProfileModal = document.getElementById('modal-discard-profile');
  const discardProfileCancel = document.getElementById('discard-profile-cancel');
  const discardProfileConfirm = document.getElementById('discard-profile-confirm');
  const editProfileClose = document.getElementById('modal-edit-profile-close');
  const editProfileCancel = document.getElementById('profile-edit-cancel');
  const birthTriggerBtn = document.getElementById('profile-edit-birth-trigger');
  const birthPanel = document.getElementById('profile-edit-birth-panel');
  const birthCancelBtn = document.getElementById('profile-edit-birth-cancel');
  const birthRemoveBtn = document.getElementById('profile-edit-birth-remove');
  const birthSummaryEl = document.getElementById('profile-edit-birth-summary');
  const birthMonthSelect = document.getElementById('settings-birth-month');
  const birthDaySelect = document.getElementById('settings-birth-day');
  const birthYearSelect = document.getElementById('settings-birth-year');
  const birthVisibilityDateSelect = document.getElementById('profile-edit-birth-visibility-date');
  const birthVisibilityYearSelect = document.getElementById('profile-edit-birth-visibility-year');
  let birthOriginalValue = '';
  let birthVisibilityDateOriginalValue = 'only-you';
  let birthVisibilityYearOriginalValue = 'only-you';
  let isBirthdateExpanded = false;
  let isEditPhotoModalOpen = false;
  let photoToEdit = '';
  let editingPhotoType = 'profile';
  let photoEditZoom = 1;
  let photoEditPosition = { x: 0, y: 0 };
  let photoEditIsDragging = false;
  let photoEditDragStart = { x: 0, y: 0 };
  let profileEditOriginalSnapshot = null;

  function resetProfileEditScroll() {
    if (editProfileScroll) editProfileScroll.scrollTop = 0;
    if (editProfileModalContent) editProfileModalContent.scrollTop = 0;
  }

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

  function refreshAvatar() {
    if (!window.Storage) return;
    const saved = window.Storage.getAvatar();
    if (saved) applyAvatar(saved);
    else resetAvatar();
  }
  function applyProfileHeader(dataUrl) {
    if (profileHeaderImage) {
      profileHeaderImage.src = dataUrl;
      if (profileCover) profileCover.classList.add('has-image');
    }
    if (settingsHeaderPreviewImage) settingsHeaderPreviewImage.src = dataUrl;
    if (settingsHeaderPreview) settingsHeaderPreview.classList.add('has-image');
    if (headerRemoveBtn) headerRemoveBtn.style.display = 'inline-flex';
  }

  function resetProfileHeader() {
    if (profileHeaderImage) {
      profileHeaderImage.src = '';
      if (profileCover) profileCover.classList.remove('has-image');
    }
    if (settingsHeaderPreviewImage) settingsHeaderPreviewImage.src = '';
    if (settingsHeaderPreview) settingsHeaderPreview.classList.remove('has-image');
    if (headerRemoveBtn) headerRemoveBtn.style.display = 'none';
  }

  function refreshProfileHeader() {
    if (!window.Storage || typeof window.Storage.getProfileHeader !== 'function') return;
    const saved = window.Storage.getProfileHeader();
    if (saved) applyProfileHeader(saved);
    else resetProfileHeader();
  }

  function openDiscardProfileModal() {
    if (discardProfileModal) discardProfileModal.classList.add('visible');
  }

  function closeDiscardProfileModal() {
    if (discardProfileModal) discardProfileModal.classList.remove('visible');
  }

  function getCurrentProfileEditSnapshot() {
    const snapshot = {
      name: profileFields.name ? String(profileFields.name.value || '') : '',
      username: profileFields.username ? String(profileFields.username.value || '') : '',
      bio: profileFields.bio ? String(profileFields.bio.value || '') : '',
      city: profileFields.city ? String(profileFields.city.value || '') : '',
      website: profileFields.website ? String(profileFields.website.value || '') : '',
      birthDate: profileFields.birthDate ? String(profileFields.birthDate.value || '') : '',
      birthVisibilityDate: birthVisibilityDateSelect ? String(birthVisibilityDateSelect.value || 'only-you') : 'only-you',
      birthVisibilityYear: birthVisibilityYearSelect ? String(birthVisibilityYearSelect.value || 'only-you') : 'only-you',
      avatar: window.Storage && typeof window.Storage.getAvatar === 'function'
        ? String(window.Storage.getAvatar() || '')
        : '',
      header: window.Storage && typeof window.Storage.getProfileHeader === 'function'
        ? String(window.Storage.getProfileHeader() || '')
        : ''
    };
    return snapshot;
  }

  function isDefaultAvatarSrc(src) {
    const value = String(src || '');
    if (!value) return true;
    return value.includes('user 3 1.svg') || value.includes('user%203%201.svg');
  }

  function persistProfileMediaFromModal() {
    if (!window.Storage) return;

    const currentAvatarSrc = avatarImg ? String(avatarImg.src || '') : '';
    if (isDefaultAvatarSrc(currentAvatarSrc)) {
      if (typeof window.Storage.removeAvatar === 'function') {
        window.Storage.removeAvatar();
      }
      resetAvatar();
    } else {
      if (typeof window.Storage.saveAvatar === 'function') {
        window.Storage.saveAvatar(currentAvatarSrc);
      }
      applyAvatar(currentAvatarSrc);
    }

    const currentHeaderSrc = settingsHeaderPreviewImage ? String(settingsHeaderPreviewImage.src || '') : '';
    const hasHeaderImage = !!settingsHeaderPreview
      && settingsHeaderPreview.classList.contains('has-image')
      && !!currentHeaderSrc;

    if (hasHeaderImage) {
      if (typeof window.Storage.saveProfileHeader === 'function') {
        window.Storage.saveProfileHeader(currentHeaderSrc);
      }
      applyProfileHeader(currentHeaderSrc);
    } else {
      if (typeof window.Storage.removeProfileHeader === 'function') {
        window.Storage.removeProfileHeader();
      }
      resetProfileHeader();
    }
  }

  function hasProfileEditUnsavedChanges() {
    if (!profileEditOriginalSnapshot) return false;
    const current = getCurrentProfileEditSnapshot();
    return Object.keys(current).some((key) => current[key] !== profileEditOriginalSnapshot[key]);
  }

  function restoreProfileFromSnapshot() {
    if (!profileEditOriginalSnapshot) return;
    Object.keys(profileFields).forEach((key) => {
      const el = profileFields[key];
      if (!el) return;
      el.value = profileEditOriginalSnapshot[key] || '';
    });

    if (window.Storage) {
      if (profileEditOriginalSnapshot.avatar) {
        if (typeof window.Storage.saveAvatar === 'function') window.Storage.saveAvatar(profileEditOriginalSnapshot.avatar);
        applyAvatar(profileEditOriginalSnapshot.avatar);
      } else {
        if (typeof window.Storage.removeAvatar === 'function') window.Storage.removeAvatar();
        resetAvatar();
      }

      if (profileEditOriginalSnapshot.header) {
        if (typeof window.Storage.saveProfileHeader === 'function') window.Storage.saveProfileHeader(profileEditOriginalSnapshot.header);
        applyProfileHeader(profileEditOriginalSnapshot.header);
      } else {
        if (typeof window.Storage.removeProfileHeader === 'function') window.Storage.removeProfileHeader();
        resetProfileHeader();
      }
    }

    refreshProfileModalUi();
    setBirthSelectorsFromInput();
    forceCloseBirthdatePanel();
  }

  function setEditPhotoModalOpen(isOpen) {
    isEditPhotoModalOpen = !!isOpen;
    if (editPhotoModal) {
      editPhotoModal.classList.toggle('visible', isEditPhotoModalOpen);
    }
    if (!isEditPhotoModalOpen) {
      photoEditZoom = 1;
      photoEditPosition = { x: 0, y: 0 };
      photoEditIsDragging = false;
      if (editPhotoZoom) editPhotoZoom.value = '1';
      if (editPhotoZoomValue) editPhotoZoomValue.textContent = '1.0x';
      applyEditPhotoTransform();
    }
  }

  function applyEditPhotoTransform() {
    if (!editPhotoPreview) return;
    editPhotoPreview.style.transform = 'scale(' + photoEditZoom + ') translate(' + (photoEditPosition.x / photoEditZoom) + 'px, ' + (photoEditPosition.y / photoEditZoom) + 'px)';
    editPhotoPreview.style.transition = photoEditIsDragging ? 'none' : 'transform 0.2s ease';
    editPhotoPreview.style.cursor = photoEditZoom > 1 ? 'move' : 'default';
  }

  function getEditPhotoViewportSize() {
    const fallback = editingPhotoType === 'cover'
      ? { width: 600, height: 200 }
      : { width: 500, height: 500 };
    if (!editPhotoPreviewWrap) return fallback;
    const width = editPhotoPreviewWrap.clientWidth || fallback.width;
    const height = editPhotoPreviewWrap.clientHeight || fallback.height;
    return { width, height };
  }

  function renderEditedPhotoDataUrl(sourceUrl, outputWidth, outputHeight) {
    return new Promise((resolve, reject) => {
      if (!sourceUrl) {
        reject(new Error('Imagem vazia'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const { width: viewportWidth, height: viewportHeight } = getEditPhotoViewportSize();
        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponivel'));
          return;
        }

        const baseScale = Math.max(viewportWidth / img.naturalWidth, viewportHeight / img.naturalHeight);
        const baseWidth = img.naturalWidth * baseScale;
        const baseHeight = img.naturalHeight * baseScale;
        const drawWidth = baseWidth * photoEditZoom;
        const drawHeight = baseHeight * photoEditZoom;
        const drawX = (viewportWidth - drawWidth) / 2 + photoEditPosition.x;
        const drawY = (viewportHeight - drawHeight) / 2 + photoEditPosition.y;

        const scaleX = outputWidth / viewportWidth;
        const scaleY = outputHeight / viewportHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          drawX * scaleX,
          drawY * scaleY,
          drawWidth * scaleX,
          drawHeight * scaleY
        );

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem para edicao'));
      img.src = sourceUrl;
    });
  }

  function handlePhotoDragStart(e) {
    if (photoEditZoom <= 1) return;
    photoEditIsDragging = true;
    photoEditDragStart = {
      x: e.clientX - photoEditPosition.x,
      y: e.clientY - photoEditPosition.y
    };
    applyEditPhotoTransform();
  }

  function handlePhotoDragMove(e) {
    if (!photoEditIsDragging || photoEditZoom <= 1) return;
    let newX = e.clientX - photoEditDragStart.x;
    let newY = e.clientY - photoEditDragStart.y;
    const { width, height } = getEditPhotoViewportSize();
    const maxMoveX = ((photoEditZoom - 1) / photoEditZoom) * (width / 2);
    const maxMoveY = ((photoEditZoom - 1) / photoEditZoom) * (height / 2);
    newX = Math.max(-maxMoveX, Math.min(maxMoveX, newX));
    newY = Math.max(-maxMoveY, Math.min(maxMoveY, newY));
    photoEditPosition = { x: newX, y: newY };
    applyEditPhotoTransform();
  }

  function handlePhotoDragEnd() {
    if (!photoEditIsDragging) return;
    photoEditIsDragging = false;
    applyEditPhotoTransform();
  }

  function handleEditPhotoZoomChange(nextZoom) {
    photoEditZoom = Math.max(1, Number(nextZoom || 1));
    if (photoEditZoom <= 1) photoEditPosition = { x: 0, y: 0 };
    if (editPhotoZoomValue) editPhotoZoomValue.textContent = photoEditZoom.toFixed(1) + 'x';
    applyEditPhotoTransform();
  }

  function updateEditPhotoPreview() {
    if (!editPhotoPreview) return;
    editPhotoPreview.src = photoToEdit || '';
    editPhotoPreview.draggable = false;
    const hasImage = Boolean(photoToEdit);
    if (editPhotoPreviewWrap) editPhotoPreviewWrap.classList.toggle('has-image', hasImage);
    if (editPhotoPreviewWrap) editPhotoPreviewWrap.dataset.type = editingPhotoType;
    if (editPhotoEmpty) editPhotoEmpty.style.display = hasImage ? 'none' : 'block';
    applyEditPhotoTransform();
  }

  function handleEditPhoto(type, sourceOverride = '') {
    editingPhotoType = type === 'cover' ? 'cover' : 'profile';
    const profileImage = avatarImg ? avatarImg.src : '';
    const coverImage = (settingsHeaderPreviewImage && settingsHeaderPreviewImage.src) || (profileHeaderImage && profileHeaderImage.src) || '';
    photoToEdit = sourceOverride || (editingPhotoType === 'profile' ? profileImage : coverImage);
    photoEditZoom = 1;
    photoEditPosition = { x: 0, y: 0 };
    photoEditIsDragging = false;
    updateEditPhotoPreview();
    if (editPhotoZoom) editPhotoZoom.value = '1';
    handleEditPhotoZoomChange(1);
    setEditPhotoModalOpen(true);
  }

  async function handleApplyPhoto(zoomLevel) {
    try {
      const output = editingPhotoType === 'cover'
        ? { width: 1500, height: 500 }
        : { width: 800, height: 800 };
      const editedDataUrl = await renderEditedPhotoDataUrl(photoToEdit, output.width, output.height);
      if (editingPhotoType === 'cover') {
        if (window.Storage && typeof window.Storage.saveProfileHeader === 'function') {
          window.Storage.saveProfileHeader(editedDataUrl);
        }
        applyProfileHeader(editedDataUrl);
      } else {
        if (window.Storage && typeof window.Storage.saveAvatar === 'function') {
          window.Storage.saveAvatar(editedDataUrl);
        }
        applyAvatar(editedDataUrl);
      }
      console.log('Zoom aplicado:', zoomLevel);
      if (saveStatus) {
        saveStatus.textContent = '';
        saveStatus.className = 'import-status';
      }
      setEditPhotoModalOpen(false);
    } catch {
      if (saveStatus) {
        saveStatus.textContent = 'Nao foi possivel aplicar a imagem agora.';
        saveStatus.className = 'import-status error';
      }
    }
  }
  function bindBackupAndVersionControls() {
    function refreshLocalVersions() {
      const versionsList = document.getElementById('local-versions-list');
      const versionsStatus = document.getElementById('versions-status');
      if (!versionsList || !window.Storage || typeof window.Storage.listLocalVersions !== 'function') return;

      const versions = window.Storage.listLocalVersions();
      if (!versions.length) {
        versionsList.innerHTML = '<li class="local-version-empty">Nenhuma versao local encontrada.</li>';
        return;
      }

      versionsList.innerHTML = versions.map((v) => {
        const label = v.label || 'auto-local';
        const when = new Date(v.createdAt).toLocaleString('pt-BR');
        return '<li class="local-version-item">' +
          '<div class="local-version-meta"><strong>' + label + '</strong><small>' + when + '</small></div>' +
          '<button type="button" class="btn-import local-restore-btn" data-version-id="' + v.id + '">Restaurar</button>' +
        '</li>';
      }).join('');

      versionsList.querySelectorAll('.local-restore-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const versionId = btn.dataset.versionId;
          try {
            window.Storage.restoreLocalVersion(versionId);

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

            refreshAvatar();
            refreshProfileHeader();
            refreshLocalVersions();

            if (versionsStatus) {
              versionsStatus.textContent = 'Versao restaurada com sucesso.';
              versionsStatus.className = 'import-status success';
            }
          } catch {
            if (versionsStatus) {
              versionsStatus.textContent = 'Nao foi possivel restaurar essa versao.';
              versionsStatus.className = 'import-status error';
            }
          }
        });
      });
    }

    const btnExport = document.getElementById('btn-export');
    if (btnExport && btnExport.dataset.boundClick !== '1') {
      btnExport.dataset.boundClick = '1';
      btnExport.addEventListener('click', (e) => {
        e.preventDefault();
        const status = document.getElementById('import-status');
        try {
          window.Storage.exportData();
          if (status) {
            status.textContent = 'Backup exportado com sucesso.';
            status.className = 'import-status success';
          }
        } catch {
          if (status) {
            status.textContent = 'Nao foi possivel exportar o backup.';
            status.className = 'import-status error';
          }
        }
      });
    }

    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    if (btnImport && importFile && btnImport.dataset.boundClick !== '1') {
      btnImport.dataset.boundClick = '1';
      btnImport.addEventListener('click', (e) => {
        e.preventDefault();
        importFile.click();
      });
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

          refreshAvatar();
          refreshProfileHeader();
          refreshLocalVersions();

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

    const refreshVersionsBtn = document.getElementById('btn-refresh-versions');
    if (refreshVersionsBtn && refreshVersionsBtn.dataset.boundClick !== '1') {
      refreshVersionsBtn.dataset.boundClick = '1';
      refreshVersionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        refreshLocalVersions();
      });
    }

    refreshAvatar();
    refreshProfileHeader();
    refreshLocalVersions();

    return { refreshLocalVersions };
  }

  const { refreshLocalVersions } = bindBackupAndVersionControls();

  function bindAvatarHeaderPhotoControls() {
  if (editBtn && editBtn.dataset.boundClick !== '1') {
    editBtn.dataset.boundClick = '1';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (fileInput) fileInput.click();
    });
  }

  if (profileEditPhotoCta && profileEditPhotoCta.dataset.boundClick !== '1') {
    profileEditPhotoCta.dataset.boundClick = '1';
    profileEditPhotoCta.addEventListener('click', (e) => {
      e.preventDefault();
      handleEditPhoto('profile');
    });
  }

  if (settingsUploadBtn && fileInput && settingsUploadBtn.dataset.boundClick !== '1') {
    settingsUploadBtn.dataset.boundClick = '1';
    settingsUploadBtn.addEventListener('click', (e) => {
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
        handleEditPhoto('profile');
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
  if (headerEditBtn && headerEditBtn.dataset.boundClick !== '1') {
    headerEditBtn.dataset.boundClick = '1';
    headerEditBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (headerInput) headerInput.click();
    });
  }

  if (editPhotoCloseBtn && editPhotoCloseBtn.dataset.boundClick !== '1') {
    editPhotoCloseBtn.dataset.boundClick = '1';
    editPhotoCloseBtn.addEventListener('click', () => setEditPhotoModalOpen(false));
  }

  if (editPhotoModal && editPhotoModal.dataset.boundOverlay !== '1') {
    editPhotoModal.dataset.boundOverlay = '1';
    editPhotoModal.addEventListener('click', (e) => {
      if (e.target === editPhotoModal) setEditPhotoModalOpen(false);
    });
  }

  if (editPhotoZoom && editPhotoZoom.dataset.boundInput !== '1') {
    editPhotoZoom.dataset.boundInput = '1';
    editPhotoZoom.addEventListener('input', () => {
      handleEditPhotoZoomChange(editPhotoZoom.value);
    });
  }

  if (editPhotoPreview && editPhotoPreview.dataset.boundDrag !== '1') {
    editPhotoPreview.dataset.boundDrag = '1';
    editPhotoPreview.addEventListener('mousedown', handlePhotoDragStart);
  }

  if (editPhotoPreviewWrap && editPhotoPreviewWrap.dataset.boundDrag !== '1') {
    editPhotoPreviewWrap.dataset.boundDrag = '1';
    editPhotoPreviewWrap.addEventListener('mousemove', handlePhotoDragMove);
    editPhotoPreviewWrap.addEventListener('mouseup', handlePhotoDragEnd);
    editPhotoPreviewWrap.addEventListener('mouseleave', handlePhotoDragEnd);
  }

  if (editPhotoApplyBtn && editPhotoApplyBtn.dataset.boundClick !== '1') {
    editPhotoApplyBtn.dataset.boundClick = '1';
    editPhotoApplyBtn.addEventListener('click', () => {
      const zoomLevel = editPhotoZoom ? Number(editPhotoZoom.value || 1) : 1;
      handleApplyPhoto(zoomLevel);
    });
  }

  if (headerInput && headerInput.dataset.boundChange !== '1') {
    headerInput.dataset.boundChange = '1';
    headerInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        alert('Imagem muito grande. Maximo: 4 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        handleEditPhoto('cover', dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  if (headerRemoveBtn && headerRemoveBtn.dataset.boundClick !== '1') {
    headerRemoveBtn.dataset.boundClick = '1';
    headerRemoveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Storage && typeof window.Storage.removeProfileHeader === 'function') {
        window.Storage.removeProfileHeader();
      }
      resetProfileHeader();
    });
  }

  coverActionButtons.forEach((btn) => {
    if (btn.dataset.boundClick === '1') return;
    btn.dataset.boundClick = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.action || '';
      if (action === 'edit-cover') {
        if (headerInput) headerInput.click();
        return;
      }
      if (action === 'remove-cover') {
        if (window.Storage && typeof window.Storage.removeProfileHeader === 'function') {
          window.Storage.removeProfileHeader();
        }
        resetProfileHeader();
      }
    });
  });

  }

  bindAvatarHeaderPhotoControls();

  const saveBtn = document.getElementById('settings-save-btn');
  const saveStatus = document.getElementById('settings-save-status');
  const profileFields = {
    name: document.getElementById('settings-name'),
    username: document.getElementById('settings-username'),
    birthDate: document.getElementById('settings-birthdate'),
    birthVisibilityDate: birthVisibilityDateSelect,
    birthVisibilityYear: birthVisibilityYearSelect,
    city: document.getElementById('settings-city'),
    website: document.getElementById('settings-website'),
    bio: document.getElementById('settings-bio'),
  };
  const profileFieldDefaults = {
    birthVisibilityDate: 'only-you',
    birthVisibilityYear: 'only-you',
  };

  function loadProfileForm() {
    if (!window.Storage || typeof window.Storage.getProfileSettings !== 'function') return;
    const data = window.Storage.getProfileSettings();
    Object.keys(profileFields).forEach((key) => {
      const el = profileFields[key];
      if (!el) return;
      const fallback = Object.prototype.hasOwnProperty.call(profileFieldDefaults, key)
        ? profileFieldDefaults[key]
        : '';
      el.value = data[key] || fallback;
    });
    refreshProfileModalUi();
    setBirthSelectorsFromInput();
  }

  function bindCounter(fieldId, counterId, max) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(counterId);
    if (!field || !counter) return;
    const update = () => {
      const len = String(field.value || '').length;
      counter.textContent = len + '/' + max;
    };
    update();
    if (field.dataset.boundInputCounter !== '1') {
      field.dataset.boundInputCounter = '1';
      field.addEventListener('input', update);
    }
  }

  function refreshProfileModalUi() {
    bindCounter('settings-name', 'counter-settings-name', 50);
    bindCounter('settings-city', 'counter-settings-city', 30);
    bindCounter('settings-bio', 'counter-settings-bio', 160);
    bindCounter('settings-website', 'counter-settings-website', 100);
  }

  function parseBirthDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return { y, m, d };
  }

  function formatBirthDatePt(value) {
    const parsed = parseBirthDate(value);
    if (!parsed) return '-';
    const dt = new Date(parsed.y, parsed.m - 1, parsed.d);
    return dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function normalizeWebsiteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://' + raw;
  }

  function formatWebsiteDisplay(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const noProtocol = raw.replace(/^https?:\/\//i, '');
    const noWww = noProtocol.replace(/^www\./i, '');
    const hostLike = noWww.split(/[/?#]/)[0];
    if (!hostLike) return raw;
    if (/\.xn--[a-z0-9-]+$/i.test(hostLike)) {
      return hostLike.replace(/\.xn--[a-z0-9-]+$/i, '.');
    }
    return hostLike;
  }

  function getWebsiteHref(value) {
    const normalized = normalizeWebsiteUrl(value);
    if (!normalized) return '';
    try {
      // So retorna href quando a URL e valida no parser nativo.
      // Alguns dominios "xn--" invalidos para o parser ainda exibem texto curto.
      new URL(normalized);
      return normalized;
    } catch {
      return '';
    }
  }

  function formatBirthDateForProfile(value) {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    const parsed = parseBirthDate(raw);
    if (parsed) {
      const dt = new Date(parsed.y, parsed.m - 1, parsed.d);
      return dt.toLocaleDateString('pt-BR');
    }
    const maybeDate = new Date(raw);
    if (!Number.isNaN(maybeDate.getTime())) {
      return maybeDate.toLocaleDateString('pt-BR');
    }
    return raw;
  }

  function getGithubContributionTotalFromCache() {
    const cacheKey = (window.Storage && window.Storage.GITHUB_CACHE_KEY) || 'githubDashboardCache';
    const prefsKey = (window.Storage && window.Storage.GITHUB_PREFS_KEY) || 'githubDashboardPrefs';

    let cache;
    try {
      cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    } catch {
      cache = {};
    }

    const contributionsData = cache && cache.contributions && cache.contributions.data;
    const days = contributionsData && Array.isArray(contributionsData.contributions)
      ? contributionsData.contributions
      : [];
    if (!days.length) return 0;

    let prefs;
    try {
      prefs = JSON.parse(localStorage.getItem(prefsKey) || '{}');
    } catch {
      prefs = {};
    }
    const periodoDias = [30, 90, 365].includes(Number(prefs.periodoDias)) ? Number(prefs.periodoDias) : 90;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - (periodoDias - 1));

    const inicioMs = inicio.getTime();
    const hojeMs = hoje.getTime();

    return days.reduce((acc, day) => {
      const dateValue = String(day.date || '').trim();
      if (!dateValue) return acc;
      const ms = new Date(dateValue + 'T00:00:00').getTime();
      if (Number.isNaN(ms) || ms < inicioMs || ms > hojeMs) return acc;
      return acc + (Number(day.count) || 0);
    }, 0);
  }

  function getProfileContributionTotal() {
    const totalEl = document.getElementById('github-total-contributions');
    if (totalEl) {
      const direct = Number(String(totalEl.textContent || '').replace(/[^\d]/g, ''));
      if (!Number.isNaN(direct) && direct > 0) return direct;
    }
    return getGithubContributionTotalFromCache();
  }

  function fillSelect(select, values, selected) {
    if (!select) return;
    select.innerHTML = values.map((v) => '<option value="' + v.value + '">' + v.label + '</option>').join('');
    if (selected != null) select.value = String(selected);
  }

  function ensureBirthSelectors() {
    if (!birthMonthSelect || !birthDaySelect || !birthYearSelect) return;
    if (birthMonthSelect.dataset.filled === '1') return;

    const months = [
      'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ].map((label, idx) => ({ value: idx + 1, label }));
    fillSelect(birthMonthSelect, months, 1);

    const nowYear = new Date().getFullYear();
    const years = [];
    for (let y = nowYear - 13; y >= nowYear - 90; y -= 1) years.push({ value: y, label: y });
    fillSelect(birthYearSelect, years, nowYear - 20);

    birthMonthSelect.dataset.filled = '1';
  }

  function refreshBirthDays() {
    if (!birthMonthSelect || !birthYearSelect || !birthDaySelect) return;
    const m = Number(birthMonthSelect.value || 1);
    const y = Number(birthYearSelect.value || new Date().getFullYear());
    const maxDays = new Date(y, m, 0).getDate();
    const currentDay = Number(birthDaySelect.value || 1);
    const days = [];
    for (let d = 1; d <= maxDays; d += 1) days.push({ value: d, label: d });
    fillSelect(birthDaySelect, days, Math.min(currentDay, maxDays));
  }

  function syncBirthInputFromSelectors() {
    const birthInput = document.getElementById('settings-birthdate');
    if (!birthInput || !birthMonthSelect || !birthDaySelect || !birthYearSelect) return;
    const y = String(birthYearSelect.value).padStart(4, '0');
    const m = String(birthMonthSelect.value).padStart(2, '0');
    const d = String(birthDaySelect.value).padStart(2, '0');
    birthInput.value = y + '-' + m + '-' + d;
    if (birthSummaryEl) birthSummaryEl.textContent = formatBirthDatePt(birthInput.value);
  }

  function setBirthSelectorsFromInput() {
    const birthInput = document.getElementById('settings-birthdate');
    if (!birthInput || !birthMonthSelect || !birthDaySelect || !birthYearSelect) return;
    ensureBirthSelectors();
    const parsed = parseBirthDate(birthInput.value);
    if (!parsed) {
      const fallbackYear = new Date().getFullYear() - 20;
      birthMonthSelect.value = '1';
      birthYearSelect.value = String(fallbackYear);
      refreshBirthDays();
      birthDaySelect.value = '1';
      if (birthSummaryEl) birthSummaryEl.textContent = '-';
      return;
    }
    birthMonthSelect.value = String(parsed.m);
    birthYearSelect.value = String(parsed.y);
    refreshBirthDays();
    birthDaySelect.value = String(parsed.d);
    if (birthSummaryEl) birthSummaryEl.textContent = formatBirthDatePt(birthInput.value);
  }

  function cancelBirthdateEditor() {
    const birthInput = document.getElementById('settings-birthdate');
    if (birthInput) birthInput.value = birthOriginalValue || '';
    if (birthVisibilityDateSelect) birthVisibilityDateSelect.value = birthVisibilityDateOriginalValue || 'only-you';
    if (birthVisibilityYearSelect) birthVisibilityYearSelect.value = birthVisibilityYearOriginalValue || 'only-you';
    setBirthSelectorsFromInput();
    forceCloseBirthdatePanel();
  }

  function primeBirthdateEditor() {
    const birthInput = document.getElementById('settings-birthdate');
    birthOriginalValue = birthInput ? String(birthInput.value || '') : '';
    birthVisibilityDateOriginalValue = birthVisibilityDateSelect ? String(birthVisibilityDateSelect.value || 'only-you') : 'only-you';
    birthVisibilityYearOriginalValue = birthVisibilityYearSelect ? String(birthVisibilityYearSelect.value || 'only-you') : 'only-you';
    setBirthSelectorsFromInput();
    forceCloseBirthdatePanel();
  }

  function forceCloseBirthdatePanel() {
    if (!birthPanel) return;
    birthPanel.classList.remove('is-open');
    birthPanel.style.display = '';
    if (birthTriggerBtn) {
      birthTriggerBtn.style.display = '';
      birthTriggerBtn.setAttribute('aria-expanded', 'false');
    }
    isBirthdateExpanded = false;
  }

  let openEditProfileModal = null;

  function bindProfileEditModalControls() {
  loadProfileForm();
  forceCloseBirthdatePanel();

  function openEditProfileModal() {
    loadProfileForm();
    refreshAvatar();
    refreshProfileHeader();
    primeBirthdateEditor();
    closeDiscardProfileModal();
    profileEditOriginalSnapshot = getCurrentProfileEditSnapshot();
    resetProfileEditScroll();
    if (editProfileModal) editProfileModal.classList.add('visible');
    window.setTimeout(() => {
      resetProfileEditScroll();
    }, 0);
  }

  function performCloseEditProfileModal() {
    closeDiscardProfileModal();
    cancelBirthdateEditor();
    resetProfileEditScroll();
    if (editProfileModal) editProfileModal.classList.remove('visible');
    // Garante fechamento mesmo com conflitos de clique/reflow
    window.setTimeout(() => {
      forceCloseBirthdatePanel();
      resetProfileEditScroll();
    }, 0);
  }

  function closeEditProfileModal() {
    if (hasProfileEditUnsavedChanges()) {
      openDiscardProfileModal();
      return;
    }
    performCloseEditProfileModal();
  }

  if (editProfileClose && editProfileClose.dataset.boundClick !== '1') {
    editProfileClose.dataset.boundClick = '1';
    editProfileClose.addEventListener('click', closeEditProfileModal);
  }

  if (editProfileCancel && editProfileCancel.dataset.boundClick !== '1') {
    editProfileCancel.dataset.boundClick = '1';
    editProfileCancel.addEventListener('click', closeEditProfileModal);
  }

  if (editProfileModal && editProfileModal.dataset.boundOverlay !== '1') {
    editProfileModal.dataset.boundOverlay = '1';
    editProfileModal.addEventListener('click', (e) => {
      if (e.target === editProfileModal) closeEditProfileModal();
    });
  }

  if (discardProfileModal && discardProfileModal.dataset.boundOverlay !== '1') {
    discardProfileModal.dataset.boundOverlay = '1';
    discardProfileModal.addEventListener('click', (e) => {
      if (e.target === discardProfileModal) closeDiscardProfileModal();
    });
  }

  if (discardProfileCancel && discardProfileCancel.dataset.boundClick !== '1') {
    discardProfileCancel.dataset.boundClick = '1';
    discardProfileCancel.addEventListener('click', closeDiscardProfileModal);
  }

  if (discardProfileConfirm && discardProfileConfirm.dataset.boundClick !== '1') {
    discardProfileConfirm.dataset.boundClick = '1';
    discardProfileConfirm.addEventListener('click', () => {
      restoreProfileFromSnapshot();
      performCloseEditProfileModal();
    });
  }

  if (editProfileModal && editProfileModal.dataset.boundBirthObserver !== '1') {
    editProfileModal.dataset.boundBirthObserver = '1';
    const birthModalObserver = new MutationObserver(() => {
      const isVisible = editProfileModal.classList.contains('visible');
      if (isVisible) {
        forceCloseBirthdatePanel();
        return;
      }
      cancelBirthdateEditor();
    });
    birthModalObserver.observe(editProfileModal, { attributes: true, attributeFilter: ['class'] });
  }

  if (birthMonthSelect && birthMonthSelect.dataset.boundChange !== '1') {
    birthMonthSelect.dataset.boundChange = '1';
    birthMonthSelect.addEventListener('change', () => {
      refreshBirthDays();
      syncBirthInputFromSelectors();
    });
  }

  if (birthYearSelect && birthYearSelect.dataset.boundChange !== '1') {
    birthYearSelect.dataset.boundChange = '1';
    birthYearSelect.addEventListener('change', () => {
      refreshBirthDays();
      syncBirthInputFromSelectors();
    });
  }

  if (birthDaySelect && birthDaySelect.dataset.boundChange !== '1') {
    birthDaySelect.dataset.boundChange = '1';
    birthDaySelect.addEventListener('change', syncBirthInputFromSelectors);
  }

  if (birthTriggerBtn && birthPanel && birthTriggerBtn.dataset.boundClick !== '1') {
    birthTriggerBtn.dataset.boundClick = '1';
    birthTriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isBirthdateExpanded) {
        forceCloseBirthdatePanel();
        return;
      }
      birthPanel.classList.add('is-open');
      birthPanel.style.display = '';
      if (birthTriggerBtn) {
        birthTriggerBtn.style.display = 'none';
        birthTriggerBtn.setAttribute('aria-expanded', 'true');
      }
      isBirthdateExpanded = true;
    });
  }

  if (birthCancelBtn && birthPanel && birthCancelBtn.dataset.boundClick !== '1') {
    birthCancelBtn.dataset.boundClick = '1';
    birthCancelBtn.addEventListener('click', cancelBirthdateEditor);
  }

  if (birthRemoveBtn && birthPanel && birthRemoveBtn.dataset.boundClick !== '1') {
    birthRemoveBtn.dataset.boundClick = '1';
    birthRemoveBtn.addEventListener('click', () => {
      const birthInput = document.getElementById('settings-birthdate');
      if (birthInput) birthInput.value = '';
      if (birthSummaryEl) birthSummaryEl.textContent = '-';
      forceCloseBirthdatePanel();
    });
  }

  if (saveBtn && saveBtn.dataset.boundClick !== '1') {
    saveBtn.dataset.boundClick = '1';
    saveBtn.addEventListener('click', async () => {
      const payload = {};
      Object.keys(profileFields).forEach((key) => {
        const el = profileFields[key];
        if (!el) return;
        payload[key] = String(el.value || '').trim();
      });

      try {
        if (typeof window.Storage.saveProfileSettings === 'function') {
          window.Storage.saveProfileSettings(payload);
        }
        persistProfileMediaFromModal();
        refreshLocalVersions();
        updateProfilePage();
        profileEditOriginalSnapshot = getCurrentProfileEditSnapshot();
        if (saveStatus) {
          saveStatus.textContent = 'Perfil e dados gerais salvos com sucesso!';
          saveStatus.className = 'import-status success';
        }
        performCloseEditProfileModal();
      } catch {
        if (saveStatus) {
          saveStatus.textContent = 'Nao foi possivel salvar o perfil agora.';
          saveStatus.className = 'import-status error';
        }
        return;
      }

      try {
        if (typeof window.Storage.pushStateToServer === 'function') {
          await window.Storage.pushStateToServer();
        }
        if (typeof window.Storage.createServerVersion === 'function') {
          await window.Storage.createServerVersion('settings-profile-save');
        }
      } catch {
        // Sync remota nao bloqueia o salvamento local nem o fechamento do modal.
      }
    });
  }
    return { openEditProfileModal };
  }

  const profileEditModalControls = bindProfileEditModalControls();
  openEditProfileModal = profileEditModalControls.openEditProfileModal;

  // ===== PERFIL (EVERMORE) =====
  function updateProfilePage() {
    if (!window.Storage) return;
    refreshProfileHeader();

    // Obter dados do perfil
    const profileData = window.Storage.getProfileSettings();
    const avatar = window.Storage.getAvatar() || 'imagens, icons/Sidebar/user 3 1.svg';
    
    // Atualizar avatar
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) profileAvatar.src = avatar;

    // Atualizar nome e username
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = profileData.name || 'Seu Nome';

    const profileNameTop = document.getElementById('profile-name-top');
    if (profileNameTop) profileNameTop.textContent = profileData.name || 'Seu Nome';

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
    const profileWebsite = document.getElementById('profile-website');
    if (profileWebsite) {
      const websiteText = String(profileData.website || '').trim();
      if (websiteText) {
        profileWebsite.textContent = formatWebsiteDisplay(websiteText);
        const href = getWebsiteHref(websiteText);
        if (href) {
          profileWebsite.href = href;
        } else {
          profileWebsite.removeAttribute('href');
        }
        profileWebsite.classList.remove('is-empty');
      } else {
        profileWebsite.textContent = '-';
        profileWebsite.removeAttribute('href');
        profileWebsite.classList.add('is-empty');
      }
    }

    const profileLocation = document.getElementById('profile-location');
    if (profileLocation) {
      const location = profileData.city || profileData.presentAddress || '-';
      profileLocation.textContent = location;
    }

    const profileBirthdate = document.getElementById('profile-birthdate');
    if (profileBirthdate) profileBirthdate.textContent = formatBirthDateForProfile(profileData.birthDate);

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

    const profileHeadlineCount = document.getElementById('profile-headline-count');
    if (profileHeadlineCount) {
      const contributionsTotal = getProfileContributionTotal();
      profileHeadlineCount.textContent = contributionsTotal + ' contribuicoes';
    }

    const statPlaylists = document.getElementById('stat-playlists');
    if (statPlaylists) statPlaylists.textContent = playlists;

    const statRepos = document.getElementById('stat-repos');
    if (statRepos) statRepos.textContent = repos;

    const statTags = document.getElementById('stat-tags');
    if (statTags) statTags.textContent = tagsCount;
  }

  function refreshAllUiFromStorage() {
    if (window.App && typeof window.App.renderAllEras === 'function') {
      window.App.renderAllEras();
    }
    if (window.App && typeof window.App.renderDebutHighlights === 'function') {
      window.App.renderDebutHighlights();
    }
    if (typeof window.renderizarRecentes === 'function') {
      window.renderizarRecentes();
    }
    refreshAvatar();
    refreshProfileHeader();
    refreshLocalVersions();
    updateProfilePage();
  }

  function bindRemoteStateRefresh() {
    if (!window.Storage || typeof window.Storage.refreshFromServer !== 'function') return;
    if (document.body && document.body.dataset.boundRemoteRefresh === '1') return;
    if (document.body) document.body.dataset.boundRemoteRefresh = '1';

    let refreshInFlight = false;
    let refreshIntervalId = null;

    const canHydrateRemoteNow = () => {
      const isProfileModalOpen = !!editProfileModal && editProfileModal.classList.contains('visible');
      const isDiscardModalOpen = !!discardProfileModal && discardProfileModal.classList.contains('visible');
      return !isProfileModalOpen && !isDiscardModalOpen && !isEditPhotoModalOpen;
    };

    const attemptRemoteRefresh = async () => {
      if (refreshInFlight || !canHydrateRemoteNow()) return;
      refreshInFlight = true;
      try {
        const changed = await window.Storage.refreshFromServer();
        if (changed) {
          refreshAllUiFromStorage();
        }
      } catch {
        // Falhas de sync remoto nao devem quebrar a shell.
      } finally {
        refreshInFlight = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        attemptRemoteRefresh();
      }
    };

    const onWindowFocus = () => {
      attemptRemoteRefresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    refreshIntervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        attemptRemoteRefresh();
      }
    }, 15000);

    window.__shellRemoteRefreshCleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
    };
  }

  // Atualizar perfil ao carregar
  updateProfilePage();
  bindRemoteStateRefresh();


  function bindProfileNavigationControls() {
  const profileBackBtn = document.querySelector('.x-profile-back');
  if (profileBackBtn && profileBackBtn.dataset.boundClick !== '1') {
    profileBackBtn.dataset.boundClick = '1';
    profileBackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const debutLink = document.querySelector('.era-link[data-target="debut"]');
      if (debutLink) debutLink.click();
    });
  }

  // Botao de editar perfil (Evermore)
  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile && btnEditProfile.dataset.boundClick !== '1') {
    btnEditProfile.dataset.boundClick = '1';
    btnEditProfile.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openEditProfileModal === 'function') openEditProfileModal();
    });
  }

  const settingsGoProfileBtn = document.getElementById('settings-go-profile-btn');
  if (settingsGoProfileBtn && settingsGoProfileBtn.dataset.boundClick !== '1') {
    settingsGoProfileBtn.dataset.boundClick = '1';
    settingsGoProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const evermoreLink = document.querySelector('.era-link[data-target="evermore"]');
      if (evermoreLink) {
        evermoreLink.click();
        updateProfilePage();
      }
    });
  }

  const settingsCloseBtn = document.getElementById('settings-close-btn');
  if (settingsCloseBtn && settingsCloseBtn.dataset.boundClick !== '1') {
    settingsCloseBtn.dataset.boundClick = '1';
    settingsCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const debutLink = document.querySelector('.era-link[data-target="debut"]');
      if (debutLink) debutLink.click();
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

  }

  bindProfileNavigationControls();

  function bindBioInlineEditorControls() {
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

  }

  bindBioInlineEditorControls();

  // Expor funcao para atualizar perfil
  window.updateProfilePage = updateProfilePage;
}

export default initShellInteractions;



