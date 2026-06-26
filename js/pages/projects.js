import { requireAuth } from '../auth.js';
import { getProjects } from '../api.js';
import { h, formatDate, projectStatusBadge } from '../ui.js';
import { openProjectModal } from '../project-modal.js';

function projectCards(projects) {
  if (projects.length === 0) return `
    <div class="card" style="max-width:560px;text-align:center;padding:3rem 2rem">
      <div style="margin-bottom:1rem;color:var(--border-strong)"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
      <p style="color:var(--text-muted);font-size:.9rem;line-height:1.7">ไม่มีโครงการ</p>
    </div>`;
  return `
    <div class="project-list">
      ${projects.map(p => `
        <a href="/project-detail/?id=${h(p.id)}" class="project-card">
          <div>
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.25rem">
              <span class="project-card-name" style="margin:0">${h(p.name)}</span>
              ${projectStatusBadge(p.status)}
            </div>
            ${p.group ? `<div class="project-card-meta">กลุ่ม ${h(p.group)}${p.in_charge_person ? ` · ${h(p.in_charge_person)}` : ''}</div>` : p.in_charge_person ? `<div class="project-card-meta">ผู้รับผิดชอบ: ${h(p.in_charge_person)}</div>` : ''}
            <div class="project-card-meta" style="margin-top:.2rem">ผู้รับผิดชอบ: ${h(p.owner_name)}</div>
          </div>
          <div class="project-card-dates">
            <div>${formatDate(p.start_date)}</div>
            <div>→ ${formatDate(p.end_date)}</div>
          </div>
        </a>`).join('')}
    </div>`;
}

function onCreated(project) {
  window.location.href = `/project-detail/?id=${project.id}`;
}

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const { projects } = await getProjects();

  const active   = projects.filter(p => p.status !== 'archived');
  const archived = projects.filter(p => p.status === 'archived');

  if (projects.length === 0) {
    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">โครงการของฉัน</h1>
        <button class="btn btn-primary do-create-project">+ สร้างโครงการ</button>
      </div>
      <div class="card" style="max-width:560px;text-align:center;padding:3rem 2rem">
        <div style="margin-bottom:1rem;color:var(--border-strong)"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem">ยังไม่มีโครงการ</h2>
        <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:1.5rem;line-height:1.7">
          ก่อนจะยืมอุปกรณ์ คุณต้องสร้างโครงการก่อน<br>
          โครงการคือกิจกรรมหรืองานที่ต้องใช้อุปกรณ์
        </p>
        <button class="btn btn-primary do-create-project">สร้างโครงการแรก</button>
      </div>`;
  } else {
    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">โครงการของฉัน</h1>
        <button class="btn btn-primary do-create-project">+ สร้างโครงการ</button>
      </div>
      <div class="tab-bar">
        <button class="tab-btn active" data-tab="active">
          โครงการ<span class="tab-count">${active.length}</span>
        </button>
        <button class="tab-btn" data-tab="archived">
          เก็บถาวร<span class="tab-count">${archived.length}</span>
        </button>
      </div>
      <div id="tab-panel-active">${projectCards(active)}</div>
      <div id="tab-panel-archived" style="display:none">${projectCards(archived)}</div>`;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('tab-panel-active').style.display   = tab === 'active'   ? '' : 'none';
        document.getElementById('tab-panel-archived').style.display = tab === 'archived' ? '' : 'none';
      });
    });
  }

  document.querySelectorAll('.do-create-project').forEach(btn => {
    btn.addEventListener('click', () => openProjectModal(null, onCreated));
  });
}
init();
