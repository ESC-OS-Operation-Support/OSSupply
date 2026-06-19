import { requireAuth } from '../auth.js';
import { getProject, deleteProject, getRequests } from '../api.js';
import { h, statusBadge, formatDate } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'projects.html'; return; }

  const [{ project, members }, reqData] = await Promise.all([
    getProject(id),
    getRequests(),
  ]);

  const canEdit = user.role === 'admin' || user.id === project.owner_id;
  const linked  = reqData.requests.filter(r => r.project_id === id);

  app.innerHTML = `
    <button class="back-btn" onclick="history.back()">← กลับ</button>
    <div class="page-header">
      <h1 class="page-title">${h(project.name)}</h1>
      ${canEdit ? `
        <div class="actions-bar">
          <a href="project-form.html?id=${h(id)}" class="btn btn-primary">แก้ไข</a>
          <button class="btn btn-danger" id="delete-btn">ลบ</button>
        </div>` : ''}
    </div>
    <div id="delete-error"></div>
    <div class="project-detail-grid">
      <div>
        <div class="card">
          <div class="card-title">รายละเอียดโครงการ</div>
          <div class="info-row"><span class="info-label">วัตถุประสงค์</span><span>${h(project.purpose)}</span></div>
          ${project.description ? `<div class="info-row"><span class="info-label">คำอธิบาย</span><span>${h(project.description)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">เจ้าของ</span><span>${h(project.owner_name)}</span></div>
          <div class="info-row"><span class="info-label">ช่วงเวลา</span><span>${formatDate(project.start_date)} → ${formatDate(project.end_date)}</span></div>
        </div>
        ${linked.length > 0 ? `
          <div class="card" style="margin-top:1.25rem">
            <div class="card-title">คำขอยืมที่เชื่อมโยง</div>
            <div style="display:flex;flex-direction:column;gap:.5rem">
              ${linked.map(r => `
                <a href="request-detail.html?id=${h(r.id)}" class="request-link-row">
                  <span class="mono">#${h(r.id.slice(0, 8))}</span>
                  ${statusBadge(r.status)}
                  <span class="muted">${formatDate(r.requested_pickup_datetime)}</span>
                </a>`).join('')}
            </div>
          </div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">สมาชิก (${members.length})</div>
        <ul class="member-list">
          ${members.map(m => `
            <li class="member-item">
              ${m.avatar_url
                ? `<img src="${h(m.avatar_url)}" alt="${h(m.name)}" class="member-avatar">`
                : `<div class="member-avatar-ph">${h(m.name.charAt(0))}</div>`}
              <div style="flex:1">
                <div>${h(m.name)}</div>
                <div style="font-size:.78rem;color:var(--text-muted)">${h(m.email)}</div>
              </div>
              <span class="member-role">${m.role === 'leader' ? 'หัวหน้า' : 'สมาชิก'}</span>
            </li>`).join('')}
        </ul>
      </div>
    </div>`;

  document.getElementById('delete-btn')?.addEventListener('click', async () => {
    if (!confirm(`ยืนยันการลบโครงการ "${project.name}"?`)) return;
    try {
      await deleteProject(id);
      window.location.href = 'projects.html';
    } catch (err) {
      document.getElementById('delete-error').innerHTML =
        `<div class="alert alert-error">${h(err.message)}</div>`;
    }
  });
}

init();
