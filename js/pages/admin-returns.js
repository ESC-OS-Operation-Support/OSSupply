import { requireAuth } from '../auth.js';
import { getAllReturns, confirmReturn, rejectReturn } from '../api.js';
import { h, formatDateTime } from '../ui.js';

async function init() {
  const user = await requireAuth(['staff', 'admin']);
  if (!user) return;

  const app = document.getElementById('app');

  async function renderPage(statusFilter = 'pending') {
    const { returns } = await getAllReturns(statusFilter || undefined);

    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">การคืนอุปกรณ์</h1>
        <select class="filter-select" id="status-filter">
          <option value="">ทั้งหมด</option>
          <option value="pending"   ${statusFilter === 'pending'   ? 'selected' : ''}>รอยืนยัน</option>
          <option value="confirmed" ${statusFilter === 'confirmed' ? 'selected' : ''}>ยืนยันแล้ว</option>
          <option value="rejected"  ${statusFilter === 'rejected'  ? 'selected' : ''}>ถูกปฏิเสธ</option>
        </select>
      </div>
      ${returns.length === 0
        ? '<p class="empty-text">ไม่มีรายการคืน</p>'
        : `<div style="display:flex;flex-direction:column;gap:.75rem">
            ${returns.map(r => `
              <div class="return-admin-card">
                ${r.photo_url ? `<img src="${h(r.photo_url)}" alt="รูปการคืน" class="return-admin-photo">` : ''}
                <div style="flex:1">
                  <div class="info-row">
                    <span class="info-label">คำขอ:</span>
                    <a href="/request-detail/?id=${h(r.borrow_request_id)}" style="color:var(--primary)">
                      #${h(r.borrow_request_id.slice(0, 8))}
                    </a>
                  </div>
                  <div class="info-row"><span class="info-label">ส่งโดย:</span>${h(r.submitted_by_name)}</div>
                  <div class="info-row"><span class="info-label">เวลา:</span>${formatDateTime(r.submitted_at)}</div>
                  ${r.note ? `<div class="info-row"><span class="info-label">หมายเหตุ:</span>${h(r.note)}</div>` : ''}
                  <div class="info-row">
                    <span class="info-label">สถานะ:</span>
                    <span class="status-pill status-pill-${h(r.status)}">
                      ${r.status === 'confirmed' ? 'ยืนยันแล้ว' : r.status === 'rejected' ? 'ถูกปฏิเสธ' : 'รอยืนยัน'}
                    </span>
                  </div>
                  ${r.admin_note ? `<div class="info-row"><span class="info-label">หมายเหตุเจ้าหน้าที่:</span>${h(r.admin_note)}</div>` : ''}
                </div>
                <div class="actions-bar" style="flex-direction:column;align-items:flex-start;gap:.5rem">
                  <a href="/request-detail/?id=${h(r.borrow_request_id)}" class="btn btn-outline-primary btn-sm">ดูคำขอ</a>
                  ${r.status === 'pending' ? `
                    <button class="btn btn-success btn-sm do-confirm" data-id="${h(r.id)}">ยืนยันการคืน</button>
                    <div style="display:flex;flex-direction:column;gap:.3rem;width:100%">
                      <input class="stock-note reject-note-input" data-id="${h(r.id)}" placeholder="เหตุผลการปฏิเสธ" style="font-size:.82rem">
                      <button class="btn btn-danger btn-sm do-reject" data-id="${h(r.id)}">ปฏิเสธ</button>
                    </div>` : ''}
                </div>
              </div>`).join('')}
          </div>`}`;

    document.getElementById('status-filter').value = statusFilter;
    document.getElementById('status-filter').addEventListener('change', (e) => renderPage(e.target.value));

    document.querySelectorAll('.do-confirm').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await confirmReturn(btn.dataset.id); await renderPage(statusFilter); }
        catch (err) { alert(err.message); btn.disabled = false; }
      });
    });

    document.querySelectorAll('.do-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const noteInput = document.querySelector(`.reject-note-input[data-id="${btn.dataset.id}"]`);
        const note = noteInput?.value?.trim();
        if (!note) { alert('กรุณาระบุเหตุผลการปฏิเสธ'); return; }
        btn.disabled = true;
        try { await rejectReturn(btn.dataset.id, { admin_note: note }); await renderPage(statusFilter); }
        catch (err) { alert(err.message); btn.disabled = false; }
      });
    });
  }

  await renderPage();
}

init();
