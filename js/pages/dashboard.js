import { requireAuth } from '../auth.js';
import { getRequests, getProjects } from '../api.js';
import { h, statusBadge, formatDate, projectStatusBadge } from '../ui.js';
import { openProjectModal } from '../project-modal.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');

  const [{ requests }, { projects }] = await Promise.all([getRequests(), getProjects()]);

  const active       = requests.filter(r => !['completed','rejected','cancelled'].includes(r.status));
  const hasOverdue   = active.some(r => r.status === 'overdue');
  const readyItems   = active.filter(r => r.status === 'ready_for_pickup');
  const draftItems   = active.filter(r => r.status === 'draft');

  // Smart banner — most urgent first
  let banner = '';
  if (hasOverdue) {
    banner = `
      <div class="flow-banner flow-banner-error">
        <div class="flow-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="flow-banner-body">
          <div class="flow-banner-title">มีอุปกรณ์ที่เกินกำหนดคืน</div>
          <div class="flow-banner-desc">กรุณาส่งคืนอุปกรณ์โดยด่วน มิฉะนั้นอาจมีผลต่อสิทธิ์การยืมในอนาคต</div>
        </div>
        <a href="/requests/?status=overdue" class="btn btn-sm" style="background:#fff;color:var(--error);border:1.5px solid var(--error)">ดูคำขอ</a>
      </div>`;
  } else if (readyItems.length > 0) {
    banner = `
      <div class="flow-banner flow-banner-success">
        <div class="flow-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="flow-banner-body">
          <div class="flow-banner-title">อุปกรณ์พร้อมให้รับ${readyItems.length > 1 ? ` (${readyItems.length} รายการ)` : ''}</div>
          <div class="flow-banner-desc">ไปรับอุปกรณ์ได้เลย ก่อนหมดเวลา 7 วัน</div>
        </div>
        <a href="/request-detail/?id=${h(readyItems[0].id)}" class="btn btn-sm" style="background:#fff;color:var(--success);border:1.5px solid var(--success)">ดูคำขอ</a>
      </div>`;
  } else if (draftItems.length > 0) {
    banner = `
      <div class="flow-banner flow-banner-warning">
        <div class="flow-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </div>
        <div class="flow-banner-body">
          <div class="flow-banner-title">มีคำขอที่ยังเป็นร่าง${draftItems.length > 1 ? ` (${draftItems.length} รายการ)` : ''}</div>
          <div class="flow-banner-desc">เพิ่มอุปกรณ์และส่งคำขอเพื่อดำเนินการต่อ</div>
        </div>
        <a href="/request-detail/?id=${h(draftItems[0].id)}" class="btn btn-sm" style="background:#fff;color:var(--warning);border:1.5px solid #fde3b4">ดำเนินการต่อ</a>
      </div>`;
  }

  // Project list — exclude archived; they live in the /projects/ archived tab
  const visibleProjects = projects.filter(p => p.status !== 'archived');

  const projectList = visibleProjects.length === 0
    ? `<div class="dash-empty">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <p>ยังไม่มีโครงการ</p>
        <button class="btn btn-primary btn-sm do-create-project">+ สร้างโครงการ</button>
      </div>`
    : `<div class="project-list">
        ${visibleProjects.map(p => {
          const projectRequests = active.filter(r => r.project_id === p.id);
          const hasProjectOverdue = projectRequests.some(r => r.status === 'overdue');
          const hasProjectReady   = projectRequests.some(r => r.status === 'ready_for_pickup');
          const activeCount       = projectRequests.length;

          return `
            <a href="/project-detail/?id=${h(p.id)}" class="project-card">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.2rem">
                  <span class="project-card-name" style="margin:0">${h(p.name)}</span>
                  ${projectStatusBadge(p.status)}
                </div>
                <div class="project-card-meta">
                  ${formatDate(p.start_date)} – ${formatDate(p.end_date)}
                  ${p.in_charge_person ? ` · ${h(p.in_charge_person)}` : ''}
                </div>
                ${activeCount > 0 ? `
                  <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap">
                    ${hasProjectOverdue ? `${statusBadge('overdue')}` : ''}
                    ${hasProjectReady   ? `${statusBadge('ready_for_pickup')}` : ''}
                    <span style="font-size:.75rem;color:var(--text-muted)">${activeCount} คำขอที่ดำเนินการอยู่</span>
                  </div>` : ''}
              </div>
              <div style="font-size:.75rem;color:var(--text-subtle);text-align:right;white-space:nowrap;flex-shrink:0">
                ${h(p.owner_name)}
              </div>
            </a>`;
        }).join('')}
      </div>`;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'อรุณสวัสดิ์' : now.getHours() < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  app.innerHTML = `
    <div class="dash-greeting-row">
      <div>
        <p class="dash-sub">${greeting}</p>
        <h1 class="dash-greeting">${h(user.name)}</h1>
      </div>
      <button class="btn btn-primary do-create-project">+ สร้างโครงการ</button>
    </div>

    ${banner}

    <div class="page-header" style="margin-bottom:1rem">
      <h2 style="font-size:1.1rem;font-weight:700">โครงการของฉัน</h2>
      <span style="font-size:.85rem;color:var(--text-muted)">${visibleProjects.length} โครงการ</span>
    </div>

    ${projectList}`;

  document.querySelectorAll('.do-create-project').forEach(btn => {
    btn.addEventListener('click', () =>
      openProjectModal(null, project => { window.location.href = `/project-detail/?id=${project.id}`; })
    );
  });
}

init();
