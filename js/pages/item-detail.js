import { requireAuth } from '../auth.js';
import { getItem, photoUrl } from '../api.js';
import { h } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'items.html'; return; }

  const app = document.getElementById('app');
  const { item } = await getItem(id);

  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← กลับ</button>
    <div class="card item-detail-card" style="padding:0;overflow:hidden">
      ${item.image_r2_key
        ? `<img src="${photoUrl(item.image_r2_key)}" alt="${h(item.name)}" class="item-detail-img">`
        : `<div class="item-detail-placeholder">📦</div>`}
      <div class="item-detail-body">
        <h1 class="item-detail-name">${h(item.name)}</h1>
        ${item.category ? `<span class="item-tag">${h(item.category)}</span>` : ''}
        ${item.description ? `<p class="item-description">${h(item.description)}</p>` : ''}
        <div class="item-stats">
          <div class="item-stat">
            <span class="item-stat-label">ทั้งหมด</span>
            <span class="item-stat-value">${item.total_quantity}</span>
          </div>
          <div class="item-stat">
            <span class="item-stat-label">พร้อมใช้</span>
            <span class="item-stat-value stat-green">${item.available_quantity}</span>
          </div>
          <div class="item-stat">
            <span class="item-stat-label">ส่งซ่อม</span>
            <span class="item-stat-value stat-red">${item.repair_quantity}</span>
          </div>
        </div>
      </div>
    </div>`;
}

init();
