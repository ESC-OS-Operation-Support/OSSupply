import { requireAuth } from '../auth.js';
import {
  getRequest, getRequestReturns, getItems,
  addRequestItem, removeRequestItem, submitRequest, cancelRequest,
  rejectRequest, processRequest, tickItem, markReady, confirmPickup,
  submitReturn, uploadPhoto,
} from '../api.js';
import { h, statusBadge, formatDateTime, formatCountdown } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'requests.html'; return; }

  const app = document.getElementById('app');

  async function load() {
    const [{ request, items }, returnsData] = await Promise.all([
      getRequest(id),
      getRequestReturns(id).catch(() => ({ returns: [] })),
    ]);
    return { request, items, returns: returnsData.returns };
  }

  async function renderPage() {
    const { request, items, returns } = await load();
    const isStaff   = user.role === 'staff' || user.role === 'admin';
    const isOwner   = user.id === request.requester_id;
    const status    = request.status;
    const canCancel = isOwner && ['draft', 'pending', 'processing', 'ready_for_pickup'].includes(status);
    const allPrepared = items.filter(i => (i.quantity_approved ?? 0) > 0).every(i => i.is_prepared === 1);

    function itemRows() {
      const showApproved = ['processing', 'ready_for_pickup', 'in_lend', 'overdue', 'returned', 'completed'].includes(status);
      return items.map(it => `
        <tr data-item-id="${h(it.item_id)}">
          <td>${h(it.item_name)}</td>
          <td>${h(it.category || '-')}</td>
          <td>${it.quantity_requested}</td>
          ${showApproved ? `<td>${it.quantity_approved ?? '-'}</td>` : ''}
          ${isStaff && status === 'pending'
            ? `<td><input type="number" class="qty-input approve-qty" data-item="${h(it.item_id)}"
                  min="0" max="${it.quantity_requested}" value="${it.quantity_requested}"></td>` : ''}
          ${isStaff && status === 'processing'
            ? `<td><button class="tick-btn ${it.is_prepared ? 'ticked' : ''} do-tick" data-item="${h(it.item_id)}" title="คลิกเพื่อ${it.is_prepared ? 'ยกเลิก' : 'ทำเครื่องหมาย'}">
                ${it.is_prepared ? '✓' : ''}</button></td>` : ''}
          ${isOwner && status === 'draft'
            ? `<td><button class="remove-item-btn do-remove" data-item="${h(it.item_id)}" title="นำออก">✕</button></td>` : ''}
        </tr>`).join('');
    }

    function itemsTable() {
      const showApproved = ['processing', 'ready_for_pickup', 'in_lend', 'overdue', 'returned', 'completed'].includes(status);
      return `
        <table class="req-items-table">
          <thead>
            <tr>
              <th>อุปกรณ์</th><th>หมวดหมู่</th><th>จำนวนที่ขอ</th>
              ${showApproved ? '<th>จำนวนที่อนุมัติ</th>' : ''}
              ${isStaff && status === 'pending'    ? '<th>จำนวนอนุมัติ</th>' : ''}
              ${isStaff && status === 'processing' ? '<th>เตรียมแล้ว</th>'   : ''}
              ${isOwner && status === 'draft'      ? '<th></th>'              : ''}
            </tr>
          </thead>
          <tbody id="items-tbody">${itemRows()}</tbody>
        </table>`;
    }

    app.innerHTML = `
      <button class="back-btn" onclick="history.back()">← กลับ</button>
      <div class="req-header">
        <div class="req-title-row">
          <span class="req-id">#${h(id.slice(0, 8))}</span>
          ${statusBadge(status)}
        </div>
        <div class="actions-bar">
          ${isOwner && status === 'draft' && items.length > 0
            ? `<button class="btn btn-success" id="btn-submit">ส่งคำขอ</button>` : ''}
          ${(isOwner || isStaff) && status === 'ready_for_pickup'
            ? `<button class="btn btn-success" id="btn-pickup">ยืนยันการรับ</button>` : ''}
          ${isStaff && status === 'processing' && allPrepared
            ? `<button class="btn btn-success" id="btn-ready">พร้อมให้รับแล้ว</button>` : ''}
          ${canCancel
            ? `<button class="btn btn-danger" id="btn-cancel">ยกเลิกคำขอ</button>` : ''}
        </div>
      </div>

      <div id="action-error"></div>

      <div class="card">
        <div class="card-title">ข้อมูลคำขอ</div>
        <div class="req-info-grid">
          <div class="info-row"><span class="info-label">วันที่รับที่ขอ</span><span>${formatDateTime(request.requested_pickup_datetime)}</span></div>
          ${request.confirmed_pickup_datetime ? `<div class="info-row"><span class="info-label">วันที่รับยืนยัน</span><span>${formatDateTime(request.confirmed_pickup_datetime)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">วันที่คืน</span><span>${formatDateTime(request.requested_return_datetime)}</span></div>
          ${request.submitted_at ? `<div class="info-row"><span class="info-label">ส่งเมื่อ</span><span>${formatDateTime(request.submitted_at)}</span></div>` : ''}
          ${request.pickup_timeout_at && status === 'ready_for_pickup'
            ? `<div class="info-row"><span class="info-label">หมดเวลารับ</span><span class="countdown">${formatCountdown(request.pickup_timeout_at)}</span></div>` : ''}
        </div>
        ${request.admin_note ? `<div class="alert alert-info" style="margin-top:.75rem">หมายเหตุจากเจ้าหน้าที่: ${h(request.admin_note)}</div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">รายการอุปกรณ์</div>
        <div id="items-wrap">${itemsTable()}</div>

        ${isOwner && status === 'draft' ? `
          <div class="add-item-row" id="add-item-section">
            <select class="add-item-select" id="add-item-select">
              <option value="">-- เลือกอุปกรณ์ --</option>
            </select>
            <input type="number" class="add-item-qty" id="add-item-qty" min="1" value="1">
            <button class="btn btn-primary btn-sm" id="btn-add-item">+ เพิ่ม</button>
          </div>
          <div id="add-warnings"></div>` : ''}

        ${isStaff && status === 'pending' ? `
          <div class="process-section">
            <div class="form-group" style="margin-bottom:.75rem">
              <label class="form-label" style="font-size:.82rem">วันและเวลารับยืนยัน (ไม่บังคับ)</label>
              <input class="form-input" type="datetime-local" id="process-pickup" style="max-width:280px">
            </div>
            <div class="form-group" style="margin-bottom:.75rem">
              <label class="form-label" style="font-size:.82rem">หมายเหตุ (ไม่บังคับ)</label>
              <textarea class="form-textarea" id="process-note" style="min-height:60px"></textarea>
            </div>
            <div class="inline-row">
              <button class="btn btn-primary" id="btn-process">อนุมัติและเริ่มดำเนินการ</button>
              <input class="reject-input" id="reject-note" placeholder="เหตุผลการปฏิเสธ">
              <button class="btn btn-danger" id="btn-reject">ปฏิเสธ</button>
            </div>
          </div>` : ''}
      </div>

      ${isOwner && (status === 'in_lend' || status === 'overdue' || status === 'return_rejected') ? `
        <div class="card">
          <div class="card-title">คืนอุปกรณ์</div>
          ${status === 'return_rejected' ? '<div class="alert alert-error" style="margin-bottom:.75rem">การคืนก่อนหน้าถูกปฏิเสธ กรุณาส่งใหม่</div>' : ''}
          <div class="return-form">
            <div class="form-group">
              <label class="form-label">รูปถ่ายการคืน <span class="form-required">*</span></label>
              <input type="file" accept="image/*" id="return-photo">
            </div>
            <div class="form-group">
              <textarea class="form-textarea" id="return-note" placeholder="หมายเหตุ (ไม่บังคับ)" style="min-height:60px"></textarea>
            </div>
            <button class="btn btn-primary" id="btn-return">ส่งการคืน</button>
          </div>
        </div>` : ''}

      ${returns.length > 0 ? `
        <div class="card">
          <div class="card-title">ประวัติการคืน</div>
          <div style="display:flex;flex-direction:column;gap:.75rem">
            ${returns.map(r => `
              <div class="return-card">
                <div>ส่งโดย <strong>${h(r.submitted_by_name)}</strong> เมื่อ ${formatDateTime(r.submitted_at)}</div>
                <div>สถานะ: <strong>${r.status === 'confirmed' ? '✓ ยืนยันแล้ว' : r.status === 'rejected' ? '✗ ถูกปฏิเสธ' : 'รอยืนยัน'}</strong></div>
                ${r.note ? `<div>หมายเหตุ: ${h(r.note)}</div>` : ''}
                ${r.admin_note ? `<div class="alert alert-info">หมายเหตุเจ้าหน้าที่: ${h(r.admin_note)}</div>` : ''}
                ${r.photo_url ? `<img src="${h(r.photo_url)}" alt="รูปการคืน" class="return-photo">` : ''}
              </div>`).join('')}
          </div>
        </div>` : ''}`;

    function errBox(msg) {
      document.getElementById('action-error').innerHTML = `<div class="alert alert-error">${h(msg)}</div>`;
    }

    if (isOwner && status === 'draft') {
      getItems().then(({ items: all }) => {
        const sel = document.getElementById('add-item-select');
        if (!sel) return;
        all.filter(i => i.is_active === 1 && i.available_quantity > 0).forEach(i => {
          const opt = document.createElement('option');
          opt.value = i.id;
          opt.textContent = `${i.name} (พร้อม: ${i.available_quantity})`;
          sel.appendChild(opt);
        });
      });

      document.getElementById('btn-add-item').addEventListener('click', async () => {
        const itemId = document.getElementById('add-item-select').value;
        const qty    = parseInt(document.getElementById('add-item-qty').value);
        if (!itemId) return;
        try {
          const { warnings } = await addRequestItem(id, { item_id: itemId, quantity_requested: qty });
          if (warnings?.length) {
            document.getElementById('add-warnings').innerHTML =
              warnings.map(w => `<div class="alert alert-warning">⚠ ${h(w)}</div>`).join('');
          }
          await renderPage();
        } catch (err) { errBox(err.message); }
      });
    }

    document.querySelectorAll('.do-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await removeRequestItem(id, btn.dataset.item); await renderPage(); }
        catch (err) { errBox(err.message); }
      });
    });

    document.getElementById('btn-submit')?.addEventListener('click', async () => {
      if (!confirm('ยืนยันการส่งคำขอ?')) return;
      try { await submitRequest(id); await renderPage(); }
      catch (err) { errBox(err.message); }
    });

    document.getElementById('btn-cancel')?.addEventListener('click', async () => {
      if (!confirm('ยืนยันการยกเลิกคำขอ?')) return;
      try { await cancelRequest(id); await renderPage(); }
      catch (err) { errBox(err.message); }
    });

    document.getElementById('btn-pickup')?.addEventListener('click', async () => {
      try { await confirmPickup(id); await renderPage(); }
      catch (err) { errBox(err.message); }
    });

    document.getElementById('btn-ready')?.addEventListener('click', async () => {
      try { await markReady(id); await renderPage(); }
      catch (err) { errBox(err.message); }
    });

    document.querySelectorAll('.do-tick').forEach(btn => {
      btn.addEventListener('click', async () => {
        try { await tickItem(id, btn.dataset.item); await renderPage(); }
        catch (err) { errBox(err.message); }
      });
    });

    document.getElementById('btn-process')?.addEventListener('click', async () => {
      const qtys   = [...document.querySelectorAll('.approve-qty')].map(inp => ({
        item_id: inp.dataset.item,
        quantity_approved: parseInt(inp.value),
      }));
      const pickup = document.getElementById('process-pickup').value;
      const note   = document.getElementById('process-note').value;
      try {
        await processRequest(id, {
          items: qtys,
          confirmed_pickup_datetime: pickup || undefined,
          admin_note: note || undefined,
        });
        await renderPage();
      } catch (err) { errBox(err.message); }
    });

    document.getElementById('btn-reject')?.addEventListener('click', async () => {
      const note = document.getElementById('reject-note').value;
      if (!note) { errBox('กรุณาระบุเหตุผลการปฏิเสธ'); return; }
      try { await rejectRequest(id, { admin_note: note }); await renderPage(); }
      catch (err) { errBox(err.message); }
    });

    document.getElementById('btn-return')?.addEventListener('click', async () => {
      const file = document.getElementById('return-photo').files[0];
      if (!file) { errBox('กรุณาเลือกรูปถ่าย'); return; }
      const btn = document.getElementById('btn-return');
      btn.disabled = true; btn.textContent = 'กำลังอัปโหลด...';
      try {
        const r2Key = await uploadPhoto(file);
        const note  = document.getElementById('return-note').value;
        await submitReturn(id, { photo_r2_key: r2Key, note: note || undefined });
        await renderPage();
      } catch (err) {
        errBox(err.message);
        btn.disabled = false; btn.textContent = 'ส่งการคืน';
      }
    });
  }

  await renderPage();
}

init();
