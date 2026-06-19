import { requireAuth } from '../auth.js';
import { getProjects, createRequest } from '../api.js';
import { h } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const { projects } = await getProjects();

  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← กลับ</button>
    <h1 class="page-title">สร้างคำขอยืมอุปกรณ์</h1>
    <div class="card" style="max-width:560px">
      <div id="form-error"></div>
      <form id="req-form" class="form">
        <div class="form-group">
          <label class="form-label">โครงการ <span class="form-required">*</span></label>
          <select class="form-select" name="project_id" id="project-select" required>
            <option value="">-- เลือกโครงการ --</option>
            ${projects.map(p => `<option value="${h(p.id)}"
              data-start="${h(p.start_date)}" data-end="${h(p.end_date)}">
              ${h(p.name)}
            </option>`).join('')}
          </select>
          <span class="form-hint" id="project-hint"></span>
        </div>
        <div class="form-group">
          <label class="form-label">วันและเวลาที่ต้องการรับ <span class="form-required">*</span></label>
          <input class="form-input" type="datetime-local" name="requested_pickup_datetime" required>
          <span class="form-hint" id="pickup-hint"></span>
        </div>
        <div class="form-group">
          <label class="form-label">วันและเวลาที่จะคืน <span class="form-required">*</span></label>
          <input class="form-input" type="datetime-local" name="requested_return_datetime" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">สร้างคำขอ</button>
          <button type="button" class="btn btn-secondary" onclick="history.back()">ยกเลิก</button>
        </div>
      </form>
    </div>`;

  document.getElementById('project-select').addEventListener('change', (e) => {
    const opt  = e.target.selectedOptions[0];
    const hint = document.getElementById('project-hint');
    if (opt && opt.dataset.start) {
      hint.textContent = `ช่วงโครงการ: ${opt.dataset.start} → ${opt.dataset.end}`;
    } else {
      hint.textContent = '';
    }
  });

  document.getElementById('req-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd    = new FormData(e.target);
    const btn   = document.getElementById('submit-btn');
    const errEl = document.getElementById('form-error');
    errEl.innerHTML = '';
    btn.disabled = true;
    btn.textContent = 'กำลังสร้าง...';
    try {
      const { request } = await createRequest({
        project_id:                fd.get('project_id'),
        requested_pickup_datetime: fd.get('requested_pickup_datetime'),
        requested_return_datetime: fd.get('requested_return_datetime'),
      });
      window.location.href = `request-detail.html?id=${request.id}`;
    } catch (err) {
      errEl.innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'สร้างคำขอ';
    }
  });
}

init();
