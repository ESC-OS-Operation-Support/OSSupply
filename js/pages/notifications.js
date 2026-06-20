import { requireAuth } from '../auth.js';
import { getNotifications, markNotifRead, markAllRead } from '../api.js';
import { h, formatDateTime } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  let page = 1;

  async function renderPage() {
    const { notifications, pagination } = await getNotifications(page, 20);
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const hasUnread  = notifications.some(n => n.is_read === 0);

    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">การแจ้งเตือน</h1>
        ${hasUnread ? `<button class="btn btn-secondary btn-sm" id="mark-all-btn">อ่านทั้งหมด</button>` : ''}
      </div>
      ${notifications.length === 0
        ? '<p class="empty-text">ไม่มีการแจ้งเตือน</p>'
        : `<div class="notif-list">
            ${notifications.map(n => `
              <div class="notif-item ${n.is_read === 0 ? 'unread' : ''}"
                   data-id="${h(n.id)}" data-ref="${h(n.reference_id || '')}">
                <div class="notif-title">${h(n.title)}</div>
                <div class="notif-body">${h(n.body)}</div>
                <div class="notif-date">${formatDateTime(n.created_at)}</div>
              </div>`).join('')}
          </div>`}
      ${totalPages > 1 ? `
        <div class="pagination">
          <button class="btn btn-secondary btn-sm" id="prev-btn" ${page <= 1 ? 'disabled' : ''}>← ก่อนหน้า</button>
          <span>หน้า ${page} / ${totalPages}</span>
          <button class="btn btn-secondary btn-sm" id="next-btn" ${page >= totalPages ? 'disabled' : ''}>ถัดไป →</button>
        </div>` : ''}`;

    document.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        const nid = el.dataset.id;
        const ref = el.dataset.ref;
        if (el.classList.contains('unread')) {
          await markNotifRead(nid).catch(() => {});
          el.classList.remove('unread');
        }
        if (ref) window.location.href = `/request-detail/?id=${ref}`;
      });
    });

    document.getElementById('mark-all-btn')?.addEventListener('click', async () => {
      await markAllRead().catch(() => {});
      await renderPage();
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => { page--; renderPage(); });
    document.getElementById('next-btn')?.addEventListener('click', () => { page++; renderPage(); });
  }

  await renderPage();
}

init();
