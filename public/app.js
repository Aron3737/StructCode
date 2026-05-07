let allProjects = [];
let activeFilter = 'all';

async function scan() {
  const path = document.getElementById('pathInput').value.trim() || '~';
  const btn = document.getElementById('scanBtn');
  const results = document.getElementById('results');

  btn.disabled = true;
  btn.textContent = '스캔 중...';
  results.innerHTML = '<div class="message">폴더를 스캔하고 있습니다...</div>';
  document.getElementById('stats').classList.add('hidden');
  document.getElementById('filters').classList.add('hidden');

  try {
    const res = await fetch(`/api/scan?path=${encodeURIComponent(path)}`);
    const data = await res.json();

    if (!res.ok) {
      results.innerHTML = `<div class="message">오류: ${data.error}</div>`;
      return;
    }

    allProjects = data.projects;
    activeFilter = 'all';
    renderStats();
    renderFilters();
    renderCards();
  } catch (e) {
    results.innerHTML = `<div class="message">서버에 연결할 수 없습니다.</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '스캔';
  }
}

function renderStats() {
  const total = allProjects.length;
  const langs = {};
  allProjects.forEach(p => { langs[p.language] = (langs[p.language] || 0) + 1; });
  const gitCount = allProjects.filter(p => p.has_git).length;

  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = `
    <div class="stat-chip">전체 <span>${total}</span>개</div>
    <div class="stat-chip">Git 연동 <span>${gitCount}</span>개</div>
    ${Object.entries(langs).map(([l, n]) => `<div class="stat-chip">${l} <span>${n}</span></div>`).join('')}
  `;
  statsEl.classList.remove('hidden');
}

function renderFilters() {
  const langs = ['all', ...new Set(allProjects.map(p => p.language))];
  const filtersEl = document.getElementById('filters');
  filtersEl.innerHTML = langs.map(l =>
    `<button class="filter-btn ${l === activeFilter ? 'active' : ''}" onclick="setFilter('${l}')">
      ${l === 'all' ? '전체' : l}
    </button>`
  ).join('');
  filtersEl.classList.remove('hidden');
}

function setFilter(lang) {
  activeFilter = lang;
  renderFilters();
  renderCards();
}

function renderCards() {
  const filtered = activeFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.language === activeFilter);

  const results = document.getElementById('results');

  if (filtered.length === 0) {
    results.innerHTML = '<div class="message">프로젝트를 찾을 수 없습니다.</div>';
    return;
  }

  results.innerHTML = filtered.map(p => `
    <div class="card">
      <div class="card-header">
        <div class="card-name">${escHtml(p.name)}</div>
        ${p.has_git ? '<span class="git-badge">git</span>' : ''}
      </div>
      <div class="badges">
        <span class="badge badge-lang">${escHtml(p.language)}</span>
        ${p.framework ? `<span class="badge badge-fw">${escHtml(p.framework)}</span>` : ''}
      </div>
      <div class="card-path">${escHtml(p.path)}</div>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.getElementById('pathInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') scan();
});
