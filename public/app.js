let allRepos = [];
let activeFilter = 'all';

async function fetchRepos() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) return;

  const btn = document.getElementById('searchBtn');
  const results = document.getElementById('results');

  btn.disabled = true;
  btn.textContent = '분석 중...';
  results.innerHTML = '<div class="message">저장소를 불러오는 중...</div>';
  document.getElementById('stats').classList.add('hidden');
  document.getElementById('filters').classList.add('hidden');

  try {
    let page = 1;
    let repos = [];
    while (true) {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}`);
      if (res.status === 404) {
        results.innerHTML = '<div class="message">사용자를 찾을 수 없습니다.</div>';
        return;
      }
      if (!res.ok) {
        results.innerHTML = `<div class="message">오류가 발생했습니다. (${res.status})</div>`;
        return;
      }
      const data = await res.json();
      if (data.length === 0) break;
      repos = repos.concat(data);
      if (data.length < 100) break;
      page++;
    }

    allRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    activeFilter = 'all';
    renderStats(username);
    renderFilters();
    renderCards();
  } catch (e) {
    results.innerHTML = '<div class="message">네트워크 오류가 발생했습니다.</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = '분석';
  }
}

function renderStats(username) {
  const total = allRepos.length;
  const stars = allRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const langs = {};
  allRepos.forEach(r => {
    if (r.language) langs[r.language] = (langs[r.language] || 0) + 1;
  });
  const topLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = `
    <div class="stat-chip">저장소 <span>${total}</span>개</div>
    <div class="stat-chip">총 스타 <span>${stars}</span></div>
    ${topLangs.map(([l, n]) => `<div class="stat-chip">${l} <span>${n}</span></div>`).join('')}
  `;
  statsEl.classList.remove('hidden');
}

function renderFilters() {
  const langs = ['all', ...new Set(allRepos.map(r => r.language).filter(Boolean))
    .values()].sort((a, b) => a === 'all' ? -1 : a.localeCompare(b));

  const filtersEl = document.getElementById('filters');
  filtersEl.innerHTML = langs.map(l =>
    `<button class="filter-btn ${l === activeFilter ? 'active' : ''}" onclick="setFilter('${esc(l)}')">
      ${l === 'all' ? '전체' : esc(l)}
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
    ? allRepos
    : allRepos.filter(r => r.language === activeFilter);

  const results = document.getElementById('results');

  if (filtered.length === 0) {
    results.innerHTML = '<div class="message">저장소가 없습니다.</div>';
    return;
  }

  results.innerHTML = filtered.map(r => `
    <div class="card">
      <div class="card-top">
        <a class="card-name" href="${esc(r.html_url)}" target="_blank">${esc(r.name)}</a>
        ${r.stargazers_count > 0 ? `<span class="card-stars">★ ${r.stargazers_count}</span>` : ''}
      </div>
      ${r.description ? `<div class="card-desc">${esc(r.description)}</div>` : ''}
      <div class="badges">
        ${r.language ? `<span class="badge badge-lang">${esc(r.language)}</span>` : ''}
        ${(r.topics || []).slice(0, 3).map(t => `<span class="badge badge-topic">${esc(t)}</span>`).join('')}
      </div>
      <div class="card-updated">업데이트: ${new Date(r.updated_at).toLocaleDateString('ko-KR')}</div>
    </div>
  `).join('');
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('usernameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchRepos();
});
