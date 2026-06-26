import { requireAuth } from '../auth.js';
import { getItems, getItemCategories, photoUrl } from '../api.js';
import { h } from '../ui.js';
import { renderSelect, initSelect } from '../select.js';

const PLACEHOLDER_SVG = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');

  const { categories } = await getItemCategories();

  let currentPage     = 1;
  let currentSearch   = '';
  let currentCategory = '';
  let debounceTimer;

  function renderCard(item) {
    const unitLabel = item.unit ? ` ${h(item.unit)}` : '';
    return `
      <a href="/item-detail/?id=${h(item.id)}" class="item-card">
        ${item.image_r2_key
          ? `<img src="${photoUrl(item.image_r2_key)}" alt="${h(item.name)}" class="item-card-img">`
          : `<div class="item-card-placeholder">${PLACEHOLDER_SVG}</div>`}
        <div class="item-card-body">
          <div class="item-card-name">${h(item.name)}</div>
          ${item.category ? `<div class="item-card-cat">${h(item.category)}</div>` : ''}
          <div class="item-card-qty">
            พร้อมใช้: <span class="qty-available">${item.available_quantity}</span>${unitLabel} / ${item.total_quantity}${unitLabel}
          </div>
          <div class="item-card-id mono">#${h(String(item.id).slice(0, 8))}</div>
        </div>
      </a>`;
  }

  function renderPagination(pg) {
    if (!pg || pg.pages <= 1) return '';
    const { page, pages, total, limit } = pg;
    const from = (page - 1) * limit + 1;
    const to   = Math.min(page * limit, total);

    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
    }
    const buttons = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) buttons.push(`<span class="pagination-gap">…</span>`);
      buttons.push(`<button class="btn btn-sm page-btn ${n === page ? 'btn-primary' : 'btn-secondary'}" data-page="${n}">${n}</button>`);
      prev = n;
    }

    return `
      <div class="pagination-info">แสดง ${from}–${to} จาก ${total} รายการ</div>
      <div class="pagination">
        <button class="btn btn-secondary btn-sm page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>← ก่อนหน้า</button>
        ${buttons.join('')}
        <button class="btn btn-secondary btn-sm page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>ถัดไป →</button>
      </div>`;
  }

  async function load() {
    const container = document.getElementById('items-container');
    container.innerHTML = '<div class="spinner">กำลังโหลด...</div>';

    const { items, pagination } = await getItems({
      page: currentPage, limit: 20,
      search:   currentSearch   || undefined,
      category: currentCategory || undefined,
    });

    if (items.length === 0) {
      container.innerHTML = '<p class="empty-text">ไม่พบอุปกรณ์</p>';
      return;
    }

    container.innerHTML = `
      <div class="items-grid">${items.map(renderCard).join('')}</div>
      ${renderPagination(pagination)}`;

    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  app.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">อุปกรณ์ทั้งหมด</h1>
      <div class="filter-row">
        <input class="filter-select search-input" id="search-input" placeholder="ค้นหาชื่ออุปกรณ์..." autocomplete="off">
        ${renderSelect({ id: 'cat-filter', value: '', options: [['', 'ทุกหมวดหมู่'], ...categories.map(c => [c, c])] })}
      </div>
    </div>
    <div id="items-container"></div>`;

  await load();

  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage   = 1;
      load();
    }, 300);
  });

  initSelect('cat-filter', v => { currentCategory = v; currentPage = 1; load(); });
}

init();
