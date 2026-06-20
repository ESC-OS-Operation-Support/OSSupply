import { requireAuth } from '../auth.js';
import { getItem, getStockLogs, addStock, removeStock, sendToRepair, restoreRepair } from '../api.js';
import { h, formatDateTime } from '../ui.js';

const LOG_LABELS = { add: 'เพิ่ม', remove: 'ลด', send_to_repair: 'ส่งซ่อม', restore_from_repair: 'คืนจากซ่อม' };

async function init() {
  const user = await requireAuth(['staff', 'admin']);
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '/admin-items/'; return; }

  const app = document.getElementById('app');

  async function renderPage() {
    const [{ item }, { logs }] = await Promise.all([getItem(id), getStockLogs(id)]);

    app.innerHTML = `
      <button class="back-btn" onclick="history.back()">← กลับ</button>
      <h1 class="page-title">สต็อก: ${h(item.name)}</h1>
      <div class="admin-stats">
        <div class="admin-stat"><span class="admin-stat-label">ทั้งหมด</span><span class="admin-stat-value">${item.total_quantity}</span></div>
        <div class="admin-stat"><span class="admin-stat-label">พร้อมใช้</span><span class="admin-stat-value" style="color:var(--success)">${item.available_quantity}</span></div>
        <div class="admin-stat"><span class="admin-stat-label">กำลังซ่อม</span><span class="admin-stat-value" style="color:var(--error)">${item.repair_quantity}</span></div>
      </div>
      <div id="stock-error"></div>
      <div class="admin-grid">
        <div class="card">
          <div class="card-title">การดำเนินการสต็อก</div>
          ${stockAction('add',     'เพิ่มสต็อก',   'btn-add',     false)}
          ${stockAction('remove',  'ลดสต็อก',      'btn-remove',  false)}
          ${stockAction('repair',  'ส่งซ่อม',       'btn-repair',  true)}
          ${stockAction('restore', 'คืนจากซ่อม',   'btn-restore', false)}
        </div>
        <div class="card">
          <div class="card-title">ประวัติสต็อก</div>
          ${logs.length === 0 ? '<p class="empty-text">ยังไม่มีประวัติ</p>' : `
            <table class="data-table">
              <thead><tr><th>การดำเนินการ</th><th>จำนวน</th><th>โดย</th><th>หมายเหตุ</th><th>เวลา</th></tr></thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td class="log-action-${h(l.action)}">${h(LOG_LABELS[l.action] || l.action)}</td>
                    <td>${l.quantity}</td>
                    <td>${h(l.performed_by_name)}</td>
                    <td>${h(l.note || '-')}</td>
                    <td style="font-size:.78rem;white-space:nowrap">${formatDateTime(l.created_at)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
        </div>
      </div>`;

    function stockAction(type, label, btnId, noteRequired) {
      return `
        <div class="stock-action-section">
          <div class="stock-action-title">${label}</div>
          <div class="stock-action-row">
            <input type="number" class="stock-qty" id="${type}-qty" min="1" value="1">
            <input class="stock-note" id="${type}-note" placeholder="${noteRequired ? 'เหตุผล (จำเป็น)' : 'หมายเหตุ'}">
            <button class="btn btn-sm" id="${btnId}" style="${btnStyle(type)}">${label}</button>
          </div>
        </div>`;
    }

    function btnStyle(t) {
      const m = { add: 'background:var(--success);color:#fff', remove: 'background:var(--error);color:#fff', repair: 'background:var(--warning);color:#fff', restore: 'background:var(--info);color:#fff' };
      return m[t] || '';
    }

    async function doAction(fn, type) {
      const qty  = parseInt(document.getElementById(`${type}-qty`).value);
      const note = document.getElementById(`${type}-note`).value;
      if (type === 'repair' && !note) {
        document.getElementById('stock-error').innerHTML = '<div class="alert alert-error">กรุณาระบุเหตุผล</div>';
        return;
      }
      try {
        await fn(id, { quantity: qty, note: note || undefined });
        await renderPage();
      } catch (err) {
        document.getElementById('stock-error').innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
      }
    }

    document.getElementById('btn-add').addEventListener('click',     () => doAction(addStock,      'add'));
    document.getElementById('btn-remove').addEventListener('click',  () => doAction(removeStock,   'remove'));
    document.getElementById('btn-repair').addEventListener('click',  () => doAction(sendToRepair,  'repair'));
    document.getElementById('btn-restore').addEventListener('click', () => doAction(restoreRepair, 'restore'));
  }

  await renderPage();
}

init();
