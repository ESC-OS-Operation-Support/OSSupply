import { requireAuth } from '../auth.js';
import { getItems, photoUrl } from '../api.js';
import { h } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const { items } = await getItems();
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  function renderGrid(list) {
    if (list.length === 0) return '<p class="empty-text">ไม่พบอุปกรณ์</p>';
    return `<div class="items-grid">
      ${list.map(item => `
        <a href="/item-detail/?id=${h(item.id)}" class="item-card">
          ${item.image_r2_key
            ? `<img src="${photoUrl(item.image_r2_key)}" alt="${h(item.name)}" class="item-card-img">`
            : `<div class="item-card-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>`}
          <div class="item-card-body">
            <div class="item-card-name">${h(item.name)}</div>
            ${item.category ? `<div class="item-card-cat">${h(item.category)}</div>` : ''}
            <div class="item-card-qty">
              พร้อมใช้: <span class="qty-available">${item.available_quantity}</span> / ${item.total_quantity}
            </div>
          </div>
        </a>`).join('')}
    </div>`;
  }

  app.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">อุปกรณ์ทั้งหมด</h1>
      <div class="filter-row">
        <select class="filter-select" id="cat-filter">
          <option value="">ทุกหมวดหมู่</option>
          ${categories.map(c => `<option value="${h(c)}">${h(c)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="items-container">${renderGrid(items)}</div>`;

  document.getElementById('cat-filter').addEventListener('change', async (e) => {
    const cat = e.target.value;
    const container = document.getElementById('items-container');
    container.innerHTML = '<div class="spinner">กำลังโหลด...</div>';
    const { items: filtered } = await getItems(cat || undefined);
    container.innerHTML = renderGrid(filtered);
  });
}

init();
