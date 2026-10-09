(() => {
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme) {
    const isNight = theme === 'night';
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(isNight));
    const action = isNight ? '切换到日间模式' : '切换到夜间模式';
    themeToggle.setAttribute('aria-label', action);
    themeToggle.title = action;
    themeToggle.querySelector('i').className = isNight ? 'fa-regular fa-moon' : 'fa-regular fa-sun';
    themeToggle.querySelector('span').textContent = isNight ? '夜间' : '日间';
  }
  applyTheme(document.documentElement.dataset.theme === 'day' ? 'day' : 'night');
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    applyTheme(theme);
    try { localStorage.setItem('CAMPUS_HOME_THEME', theme); } catch (_) { /* Theme still works without storage. */ }
  });

  const app = window.App;
  const originalRefresh = app.refresh.bind(app);
  const latestSection = document.getElementById('featuredSection');
  const latestGrid = document.getElementById('featuredGrid');
  const latestCount = document.getElementById('featuredCount');
  const itemsGrid = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');

  // One-time removal of the user-requested local example, with a recovery copy.
  function removeVehicleExample() {
    const migrationKey = 'CAMPUS_REMOVE_NINEBOT_EXAMPLE_V1';
    try {
      const storage = DataManager.getStorage();
      if (storage.getItem(migrationKey)) return;
      const items = DataManager.getItems();
      const matches = item => /九号.*电动车/.test(String(item.title || '').replace(/\s/g, ''));
      const removed = items.filter(matches);
      if (removed.length) {
        storage.setItem(migrationKey + '_BACKUP', JSON.stringify(removed));
        if (!DataManager.saveItems(items.filter(item => !matches(item)))) return;
      }
      storage.setItem(migrationKey, 'done');
    } catch (error) {
      console.error('清理电动车示例记录失败', error);
    }
  }

  removeVehicleExample();

  function itemTime(item) {
    const timestamp = Number(item.timestamp);
    if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
    const date = new Date(item.date).getTime();
    return Number.isFinite(date) ? date : 0;
  }

  function featureMarkup(item, index) {
    const isLost = item.type === 'lost';
    const image = item.img && item.img.trim()
      ? `<img src="${Utils.escapeHtml(item.img)}" alt="${Utils.escapeHtml(item.title)}" loading="lazy">`
      : '<div class="dark-feature-placeholder"><i class="fa-regular fa-image"></i></div>';
    return `<article class="dark-feature-card feature-position-${index + 1}" onclick="App.openDetail(${item.id})" tabindex="0" role="button" aria-label="查看${Utils.escapeHtml(item.title)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.openDetail(${item.id})}">
      ${image}<div class="dark-feature-shade"></div>
      <div class="dark-feature-content"><div class="dark-feature-meta"><span class="dark-feature-type ${isLost ? 'is-lost' : ''}">${isLost ? '正在寻找' : '等待认领'}</span><span>${Utils.escapeHtml(item.category)}</span></div>
      <h3>${Utils.escapeHtml(item.title)}</h3><p><i class="fa-solid fa-location-dot"></i> ${Utils.escapeHtml(item.location)}</p>
      <span class="dark-feature-action">查看信息 <i class="fa-solid fa-arrow-up-right-from-square"></i></span></div>
    </article>`;
  }

  function render() {
    const allItems = DataManager.getItems();
    const filtered = Utils.filterItems(allItems, app.filters);
    const kw = (app.filters.keyword || '').trim();
    if (!kw) {
      filtered.sort((a, b) => Number(a.status === 'solved') - Number(b.status === 'solved') || itemTime(b) - itemTime(a));
    }
    const isSearching = Boolean(kw);
    const latest = !isSearching ? filtered.filter(item => item.status !== 'solved').slice(0, 3) : [];

    const latestHeading = latestSection.querySelector('h2');
    if (latestHeading) {
      let typeLabel = '最新线索';
      if (app.filters.type === 'lost') typeLabel = '最新寻物';
      else if (app.filters.type === 'found') typeLabel = '最新招领';
      const campusText = (app.filters.campus && app.filters.campus !== 'all') ? ` · ${app.filters.campus}` : '';
      latestHeading.textContent = `${typeLabel}${campusText}`;
    }

    latestSection.classList.toggle('is-empty', latest.length === 0);
    latestCount.textContent = latest.length ? `共 ${latest.length} 条` : '';
    latestGrid.dataset.count = String(latest.length);
    latestGrid.innerHTML = latest.map(featureMarkup).join('');

    // 计算分页切片并渲染卡片网格
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / app.pageSize));
    if (app.currentPage > totalPages) {
      app.currentPage = totalPages;
    }
    if (app.currentPage < 1) {
      app.currentPage = 1;
    }
    const startIndex = (app.currentPage - 1) * app.pageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + app.pageSize);

    itemsGrid.innerHTML = pagedItems.map(item => app.createCardHtml(item)).join('');
    itemsGrid.classList.toggle('is-empty', pagedItems.length === 0);
    emptyState.classList.toggle('hidden', totalItems > 0);

    const countNotice = document.getElementById('resultCountNotice');
    if (countNotice) {
      if (totalItems === 0) {
        countNotice.innerHTML = `正在展示共 <span id="displayCount" class="font-bold text-emerald-600 text-sm">0</span> 条相关失物招领`;
      } else if (totalItems <= app.pageSize) {
        countNotice.innerHTML = `正在展示共 <span id="displayCount" class="font-bold text-emerald-600 text-sm">${totalItems}</span> 条相关失物招领`;
      } else {
        const endIndex = Math.min(startIndex + app.pageSize, totalItems);
        countNotice.innerHTML = `正在展示第 <span class="font-bold text-emerald-600">${startIndex + 1}-${endIndex}</span> 条（共 <span id="displayCount" class="font-bold text-emerald-600 text-sm">${totalItems}</span> 条相关失物招领）`;
      }
    }

    const displayCount = document.getElementById('displayCount');
    if (displayCount) displayCount.textContent = totalItems;

    app.renderPagination(totalItems, totalPages);
  }

  app.refresh = function refreshDarkHome() {
    originalRefresh();
    render();
  };

  app.setTypeFilter = function setDarkTypeFilter(type) {
    this.filters.type = type;
    this.currentPage = 1;
    const tabAll = document.getElementById('tabTypeAll');
    const tabLost = document.getElementById('tabTypeLost');
    const tabFound = document.getElementById('tabTypeFound');
    if (tabAll) tabAll.classList.toggle('selected', type === 'all');
    if (tabLost) tabLost.classList.toggle('selected', type === 'lost');
    if (tabFound) tabFound.classList.toggle('selected', type === 'found');
    this.refresh();
  };

  render();
})();
