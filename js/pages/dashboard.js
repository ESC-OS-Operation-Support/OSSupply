import { requireAuth } from '../auth.js';
import { getRequests, getNotifications } from '../api.js';
import { h, statusBadge, formatDate, formatDateTime } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');

  const [reqData, notifData] = await Promise.all([
    getRequests(),
    getNotifications(1, 5),
  ]);

  const active = reqData.requests.filter(r =>
    !['completed', 'rejected', 'cancelled'].includes(r.status)
  );

  app.innerHTML = `
    <h1 class="dash-greeting">ยินดีต้อนรับ, ${h(user.name)}</h1>
    <div class="dash-grid">
      <section class="card">
        <div class="card-header">
          <h2>คำขอที่ดำเนินการอยู่</h2>
          <a href="requests.html">ดูทั้งหมด</a>
        </div>
        ${active.length === 0
          ? '<p class="empty-text">ไม่มีคำขอที่ดำเนินการอยู่</p>'
          : `<ul class="dash-list">
              ${active.map(r => `
                <li>
                  <a href="request-detail.html?id=${h(r.id)}" class="dash-request-item">
                    <span class="mono muted">#${h(r.id.slice(0, 8))}</span>
                    ${statusBadge(r.status)}
                    <span class="muted">${formatDate(r.requested_pickup_datetime)}</span>
                  </a>
                </li>`).join('')}
            </ul>`}
      </section>

      <section class="card">
        <div class="card-header">
          <h2>การแจ้งเตือนล่าสุด</h2>
          <a href="notifications.html">ดูทั้งหมด</a>
        </div>
        ${notifData.notifications.length === 0
          ? '<p class="empty-text">ไม่มีการแจ้งเตือน</p>'
          : `<div style="display:flex;flex-direction:column;gap:.5rem">
              ${notifData.notifications.map(n => `
                <div class="dash-notif-item ${n.is_read === 0 ? 'unread' : ''}">
                  <strong>${h(n.title)}</strong>
                  <p>${h(n.body)}</p>
                  <span class="muted" style="font-size:.78rem">${formatDateTime(n.created_at)}</span>
                </div>`).join('')}
            </div>`}
      </section>
    </div>`;
}

init();
