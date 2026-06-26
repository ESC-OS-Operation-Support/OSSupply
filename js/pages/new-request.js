import { requireAuth } from '../auth.js';
import { getProjects, createRequest, addRequestItem } from '../api.js';
import { h, formatDate } from '../ui.js';
import { openProjectModal } from '../project-modal.js';
import { renderSelect, initSelect } from '../select.js';
import { renderPicker, initPicker } from '../datepicker.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const params     = new URLSearchParams(window.location.search);
  const preItemId  = params.get('item_id');
  const preProject = params.get('project_id');

  const app = document.getElementById('app');
  const { projects } = await getProjects();

  if (projects.length === 0) {
    app.innerHTML = `
      <button class="back-btn" onclick="history.back()">← กลับ</button>
      <div class="card" style="max-width:520px;text-align:center;padding:2.5rem 2rem">
        <div style="margin-bottom:1rem;color:var(--border-strong)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <h2 style="font-size:1.05rem;font-weight:700;margin-bottom:.5rem">ต้องสร้างโครงการก่อน</h2>
        <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:1.5rem;line-height:1.7">
          คำขอยืมอุปกรณ์ต้องผูกกับโครงการ<br>
          สร้างโครงการก่อนแล้วค่อยกลับมายืม
        </p>
        <button class="btn btn-primary" id="btn-create-proj-first">สร้างโครงการ</button>
      </div>`;
    document.getElementById('btn-create-proj-first').addEventListener('click', () =>
      openProjectModal(null, () => init())
    );
    return;
  }

  function renderForm(selectedProjectId = '') {
    const sel = projects.find(p => p.id === selectedProjectId);
    const locked = Boolean(preProject && selectedProjectId === preProject);

    const projectField = locked
      ? `<div class="form-group">
           <label class="form-label">โครงการ</label>
           <div class="form-input" style="background:var(--bg);color:var(--text-muted);cursor:default">
             ${h(sel?.name ?? '')} (${formatDate(sel?.start_date)} – ${formatDate(sel?.end_date)})
           </div>
           <input type="hidden" name="project_id" value="${h(selectedProjectId)}">
         </div>`
      : `<div class="form-group">
           <label class="form-label">โครงการ <span class="form-required">*</span></label>
           ${renderSelect({
             id: 'project-select', name: 'project_id', value: selectedProjectId, variant: 'form',
             options: [['', '-- เลือกโครงการ --'], ...projects.map(p => [p.id, `${p.name} (${formatDate(p.start_date)} – ${formatDate(p.end_date)})`])],
           })}
           ${sel ? `<span class="form-hint">ช่วงโครงการ: ${formatDate(sel.start_date)} → ${formatDate(sel.end_date)}</span>` : ''}
         </div>`;

    return `
      <div class="form-group">
        <label class="form-label">ชื่อคำขอ <span class="form-required">*</span></label>
        <input class="form-input" name="name" required placeholder="เช่น ยืมอุปกรณ์สำหรับกิจกรรม..." autocomplete="off">
      </div>
      ${projectField}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">วันที่รับ <span class="form-required">*</span></label>
          ${renderPicker({ id: 'pickup-input', name: 'requested_pickup_datetime', withTime: true, restricted: true,
            min: sel ? `${sel.start_date}T00:00` : '', max: sel ? `${sel.end_date}T23:59` : '' })}
        </div>
        <div class="form-group">
          <label class="form-label">วันที่คืน <span class="form-required">*</span></label>
          ${renderPicker({ id: 'return-input', name: 'requested_return_datetime', withTime: true, restricted: true,
            min: sel ? `${sel.start_date}T00:00` : '', max: sel ? `${sel.end_date}T23:59` : '' })}
        </div>
      </div>`;
  }

  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← กลับ</button>
    <h1 class="page-title">สร้างคำขอยืมอุปกรณ์</h1>
    <div class="card" style="max-width:600px">
      <div id="form-error"></div>
      <form id="req-form" class="form">
        <div id="form-body">${renderForm(preProject || '')}</div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">สร้างคำขอ</button>
          <button type="button" class="btn btn-secondary" onclick="history.back()">ยกเลิก</button>
        </div>
      </form>
    </div>`;

  function initPickers() {
    initPicker('pickup-input');
    initPicker('return-input');
  }

  function onProjectChange(selectedId) {
    document.getElementById('form-body').innerHTML = renderForm(selectedId);
    initSelect('project-select', onProjectChange);
    initPickers();
  }
  initSelect('project-select', onProjectChange);
  initPickers();

  document.getElementById('req-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd    = new FormData(e.target);
    const btn   = document.getElementById('submit-btn');
    const errEl = document.getElementById('form-error');
    errEl.innerHTML = '';

    const projectId = fd.get('project_id');
    const pickup    = fd.get('requested_pickup_datetime');
    const ret       = fd.get('requested_return_datetime');
    const sel       = projects.find(p => p.id === projectId);

    if (!pickup || !ret) {
      errEl.innerHTML = `<div class="alert alert-error">กรุณาเลือกวันที่รับและวันที่คืน</div>`;
      return;
    }

    if (sel) {
      const start   = new Date(sel.start_date + 'T00:00');
      const end     = new Date(sel.end_date + 'T23:59');
      const pickupD = new Date(pickup);
      const retD    = new Date(ret);
      if (pickupD < start || pickupD > end) {
        errEl.innerHTML = `<div class="alert alert-error">วันที่รับต้องอยู่ภายในช่วงโครงการ (${formatDate(sel.start_date)} – ${formatDate(sel.end_date)})</div>`;
        return;
      }
      if (retD < start || retD > end) {
        errEl.innerHTML = `<div class="alert alert-error">วันที่คืนต้องอยู่ภายในช่วงโครงการ (${formatDate(sel.start_date)} – ${formatDate(sel.end_date)})</div>`;
        return;
      }
      if (retD <= pickupD) {
        errEl.innerHTML = `<div class="alert alert-error">วันที่คืนต้องหลังจากวันที่รับ</div>`;
        return;
      }
    }

    btn.disabled = true; btn.textContent = 'กำลังสร้าง...';
    try {
      const { request } = await createRequest({ name: fd.get('name'), project_id: projectId, requested_pickup_datetime: pickup, requested_return_datetime: ret });
      if (preItemId) {
        try { await addRequestItem(request.id, { item_id: preItemId, quantity_requested: 1 }); } catch {}
      }
      window.location.href = `/request-detail/?id=${request.id}`;
    } catch (err) {
      errEl.innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
      btn.disabled = false; btn.textContent = 'สร้างคำขอ';
    }
  });
}
init();
