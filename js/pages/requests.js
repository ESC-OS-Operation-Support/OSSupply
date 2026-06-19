import { requireAuth } from '../auth.js';
import { getRequests } from '../api.js';
import { h, statusBadge, formatDateTime } from '../ui.js';

const STATUS_OPTS = [
  ['', 'ทุกสถานะ'], ['draft', 'ร่าง'], ['pending', 'รอดำเนินการ'],
  ['processing', 'กำลังดำเนินการ'], ['ready_for_pickup', 'พร้อมรับ'],
  ['in_lend', 'กำลังยืม'], ['overdue', 'เกินกำหนด'], ['returned', 'คืนแล้ว'],
  ['completed', 'เสร็จสิ้น'], ['rejected', 'ถูกปฏิเสธ'], ['cancelled', 'ยกเลิกแล้ว'], ['return_rejected', 'คืนถูกปฏิเสธ'],
];

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');

  function renderTable(requests) {
    if (requests.length === 0) return '<p class="empty-text">ไม่มีคำขอยืม</p>';
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>รหัส</th><th>สถานะ</th><th>วันที่รับ</th><th>วันที่คืน</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => `
              <tr>
                <td><a href="request-detail.html?id=${h(r.id)}" style="color:var(--primary);font-family:monospace;font-weight:600">
                  #${h(r.id.slice(0, 8))}
                </a></td>
                <td>${statusBadge(r.status)}</td>
                <td>${formatDateTime(r.requested_pickup_datetime)}</td>
                <td>${formatDateTime(r.requested_return_datetime)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const { requests } = await getRequests();

  app.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">คำขอยืมอุปกรณ์</h1>
      <div class="filter-row">
        <select class="filter-select" id="status-filter">
          ${STATUS_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <a href="new-request.html" class="btn btn-primary">+ สร้างคำขอ</a>
      </div>
    </div>
    <div id="req-container">${renderTable(requests)}</div>`;

  document.getElementById('status-filter').addEventListener('change', async (e) => {
    const status    = e.target.value;
    const container = document.getElementById('req-container');
    container.innerHTML = '<div class="spinner">กำลังโหลด...</div>';
    const { requests: filtered } = await getRequests(status || undefined);
    container.innerHTML = renderTable(filtered);
  });
}

init();
