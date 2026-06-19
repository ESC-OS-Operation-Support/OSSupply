import { requireAuth } from '../auth.js';
import { getProjects } from '../api.js';
import { h, formatDate } from '../ui.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const { projects } = await getProjects();

  app.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">โครงการ</h1>
      <a href="project-form.html" class="btn btn-primary">+ สร้างโครงการ</a>
    </div>
    ${projects.length === 0
      ? '<p class="empty-text">ยังไม่มีโครงการ</p>'
      : `<div class="project-list">
          ${projects.map(p => `
            <a href="project-detail.html?id=${h(p.id)}" class="project-card">
              <div>
                <div class="project-card-name">${h(p.name)}</div>
                <div class="project-card-meta">เจ้าของ: ${h(p.owner_name)} &nbsp;|&nbsp; ${h(p.purpose)}</div>
              </div>
              <div class="project-card-dates">
                <div>${formatDate(p.start_date)}</div>
                <div>→ ${formatDate(p.end_date)}</div>
              </div>
            </a>`).join('')}
        </div>`}`;
}

init();
