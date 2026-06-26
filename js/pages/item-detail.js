import { requireAuth } from '../auth.js';
import { getItem, photoUrl } from '../api.js';
import { h } from '../ui.js';
import { openRequestModal } from '../request-modal.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '/items/'; return; }

  const app = document.getElementById('app');
  const { item } = await getItem(id);
  const avail = item.available_quantity > 0;
  const unit  = item.unit ? ` ${h(item.unit)}` : '';

  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← กลับ</button>
    <div class="card item-detail-card" style="padding:0;overflow:hidden;max-width:680px">
      ${item.image_r2_key
        ? `<img src="${photoUrl(item.image_r2_key)}" alt="${h(item.name)}" class="item-detail-img">`
        : `<div class="item-detail-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>`}
      <div class="item-detail-body">
        <h1 class="item-detail-name">${h(item.name)}</h1>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.1rem">
          ${item.category ? `<span class="item-tag">${h(item.category)}</span>` : ''}
          ${item.stock_location ? `<span class="item-tag" style="background:var(--bg);color:var(--text-muted)">📍 ${h(item.stock_location)}</span>` : ''}
        </div>
        ${item.description ? `<p class="item-description">${h(item.description)}</p>` : ''}
        <div class="item-stats">
          <div class="item-stat">
            <span class="item-stat-label">ทั้งหมด</span>
            <span class="item-stat-value">${item.total_quantity}${unit}</span>
          </div>
          <div class="item-stat">
            <span class="item-stat-label">พร้อมใช้</span>
            <span class="item-stat-value stat-green">${item.available_quantity}${unit}</span>
          </div>
          <div class="item-stat">
            <span class="item-stat-label">ส่งซ่อม</span>
            <span class="item-stat-value stat-red">${item.repair_quantity}${unit}</span>
          </div>
        </div>
        <div style="padding-top:1.25rem;border-top:1px solid var(--border);margin-top:.25rem">
          ${avail
            ? `<button class="btn btn-primary" id="btn-borrow-item">ยืมอุปกรณ์นี้</button>`
            : `<button class="btn btn-primary" disabled style="opacity:.45;cursor:default">ไม่มีในสต๊อก</button>`}
          <a href="/items/" class="btn btn-secondary" style="margin-left:.5rem">← กลับสต๊อก</a>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-borrow-item')?.addEventListener('click', () => openRequestModal({ itemId: id }));
}
init();
