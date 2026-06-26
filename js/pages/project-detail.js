import { requireAuth } from '../auth.js';
import { getProject, deleteProject, getRequests, addProjectMember, removeProjectMember, transferOwnership, searchUsers } from '../api.js';
import { h, statusBadge, formatDate, openModal, projectStatusBadge, showToast, showConfirm } from '../ui.js';
import { openProjectModal } from '../project-modal.js';
import { openRequestModal } from '../request-modal.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const app = document.getElementById('app');
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '/projects/'; return; }

  async function renderPage() {
    const [{ project, members }, reqData] = await Promise.all([
      getProject(id),
      getRequests(),
    ]);

    const isArchived  = project.status === 'archived';
    const canManage   = user.role === 'admin' || (!isArchived && user.id === project.owner_id);
    const linked      = reqData.requests.filter(r => r.project_id === id);
    const isActive    = project.status === 'active';

    app.innerHTML = `
      <button class="back-btn" onclick="history.back()">← กลับ</button>
      <div class="page-header">
        <div>
          <h1 class="page-title">${h(project.name)}</h1>
          ${projectStatusBadge(project.status)}
        </div>
        <div class="actions-bar">
          ${isActive ? `<button class="btn btn-primary do-create-req">+ สร้างคำขอยืม</button>` : ''}
          ${canManage ? `
            <button class="btn btn-secondary" id="edit-proj-btn">แก้ไข</button>
            <button class="btn btn-danger" id="delete-btn">ลบ</button>` : ''}
        </div>
      </div>
      <div id="page-error"></div>

      <div class="card">
        <div class="card-title">รายละเอียดโครงการ</div>
        <div class="proj-info-grid">
          <div class="info-row"><span class="info-label">เจ้าของโครงการ</span><span>${h(project.owner_name)}</span></div>
          <div class="info-row"><span class="info-label">ช่วงเวลา</span><span>${formatDate(project.start_date)} → ${formatDate(project.end_date)}</span></div>
          ${project.group          ? `<div class="info-row"><span class="info-label">กลุ่ม</span><span>${h(project.group)}</span></div>` : ''}
          ${project.in_charge_person ? `<div class="info-row"><span class="info-label">ผู้รับผิดชอบ</span><span>${h(project.in_charge_person)}</span></div>` : ''}
          ${project.description    ? `<div class="info-row" style="grid-column:1/-1"><span class="info-label">คำอธิบาย</span><span>${h(project.description)}</span></div>` : ''}
        </div>
      </div>

      <div class="proj-bottom-grid">
        <div class="card">
          <div class="card-header">
            <h2>สมาชิก (${members.length})</h2>
            ${canManage ? `<button class="btn btn-primary btn-sm" id="add-member-btn">+ เพิ่ม</button>` : ''}
          </div>
          <ul class="member-list" id="member-list">
            ${members.map(m => `
              <li class="member-item">
                ${m.avatar_url
                  ? `<img src="${h(m.avatar_url)}" alt="${h(m.name)}" class="member-avatar">`
                  : `<div class="member-avatar-ph">${h(m.name.charAt(0))}</div>`}
                <div style="flex:1;min-width:0">
                  <div style="font-size:.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(m.name)}</div>
                  <div style="font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(m.email)}</div>
                </div>
                <span class="member-role">${m.role === 'leader' ? 'ผู้รับผิดชอบ' : 'สมาชิก'}</span>
                ${canManage && m.user_id !== user.id
                  ? `<button class="btn btn-outline-primary btn-sm do-transfer-member" data-uid="${h(m.user_id)}" data-name="${h(m.name)}">โอน</button>`
                  : ''}
                ${canManage && m.role !== 'leader'
                  ? `<button class="btn btn-danger btn-sm do-remove-member" data-uid="${h(m.user_id)}">✕</button>`
                  : ''}
              </li>`).join('')}
          </ul>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>คำขอยืม${linked.length > 0 ? ` (${linked.length})` : ''}</h2>
            ${isActive ? `<button class="btn btn-primary btn-sm do-create-req">+ สร้าง</button>` : ''}
          </div>
          ${linked.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:.5rem">
              ${linked.map(r => `
                <a href="/request-detail/?id=${h(r.id)}" class="request-link-row">
                  <span style="font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${r.name ? h(r.name) : `<span class="mono">#${h(r.id.slice(0,8))}</span>`}
                  </span>
                  ${statusBadge(r.status)}
                  <span class="muted" style="white-space:nowrap;flex-shrink:0">${formatDate(r.requested_pickup_datetime)}</span>
                </a>`).join('')}
            </div>` : `
            <div class="dash-empty" style="padding:1.5rem">
              <p style="font-size:.88rem;color:var(--text-muted)">ยังไม่มีคำขอยืมสำหรับโครงการนี้</p>
            </div>`}
        </div>
      </div>`;

    document.querySelectorAll('.do-create-req').forEach(btn => {
      btn.addEventListener('click', () => openRequestModal({ projectId: id, project }));
    });

    document.getElementById('edit-proj-btn')?.addEventListener('click', () => {
      openProjectModal(project, () => renderPage());
    });

    document.getElementById('delete-btn')?.addEventListener('click', () => {
      const close = openModal('ลบโครงการ', `
        <div id="del-error"></div>
        <p style="font-size:.88rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">
          การลบโครงการไม่สามารถย้อนกลับได้ กรุณาพิมพ์ชื่อโครงการเพื่อยืนยัน
        </p>
        <div class="form-group" style="margin-bottom:.25rem">
          <label class="form-label" style="font-weight:600;color:var(--text)">${h(project.name)}</label>
          <input class="form-input" id="del-confirm-input" placeholder="พิมพ์ชื่อโครงการ" autocomplete="off">
        </div>
        <div class="form-actions" style="margin-top:1.25rem">
          <button class="btn btn-danger" id="del-confirm-btn" disabled>ลบโครงการ</button>
          <button class="btn btn-secondary" id="del-cancel-btn">ยกเลิก</button>
        </div>`);

      const input  = document.getElementById('del-confirm-input');
      const delBtn = document.getElementById('del-confirm-btn');

      input.addEventListener('input', () => {
        delBtn.disabled = input.value !== project.name;
      });

      document.getElementById('del-cancel-btn').addEventListener('click', close);

      delBtn.addEventListener('click', async () => {
        if (input.value !== project.name) return;
        delBtn.disabled = true; delBtn.textContent = 'กำลังลบ...';
        try {
          await deleteProject(id);
          window.location.href = '/projects/';
        } catch (err) {
          document.getElementById('del-error').innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
          delBtn.disabled = false; delBtn.textContent = 'ลบโครงการ';
        }
      });
    });

    document.querySelectorAll('.do-transfer-member').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await showConfirm(`โอนความเป็นเจ้าของโครงการให้ "${btn.dataset.name}"?`, { subtext: 'คุณจะยังคงอยู่ในโครงการในฐานะสมาชิก' })) return;
        btn.disabled = true; btn.textContent = 'กำลังโอน...';
        try {
          await transferOwnership(id, btn.dataset.uid);
          showToast('โอนความเป็นเจ้าของสำเร็จ');
          await renderPage();
        } catch (err) {
          alert(err.message);
          btn.disabled = false; btn.textContent = 'โอน';
        }
      });
    });

    document.querySelectorAll('.do-remove-member').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await showConfirm('ต้องการนำสมาชิกนี้ออกจากโครงการ?', { danger: true })) return;
        try { await removeProjectMember(id, btn.dataset.uid); showToast('นำสมาชิกออกแล้ว'); await renderPage(); }
        catch (err) { alert(err.message); }
      });
    });

    document.getElementById('add-member-btn')?.addEventListener('click', () => {
      let selectedUser = null;
      let debounceTimer;

      const close = openModal('เพิ่มสมาชิก', `
        <div id="member-modal-error"></div>
        <div class="form">
          <div class="form-group" style="position:relative">
            <label class="form-label">ค้นหา (ชื่อ, อีเมล หรือรหัสนักศึกษา)</label>
            <input class="form-input" id="member-search" placeholder="เช่น 65090045 หรือ beam..." autofocus autocomplete="off">
            <div id="member-results" class="search-dropdown" style="display:none"></div>
          </div>
          <div id="member-selected-box" style="display:none;margin-top:.35rem"></div>
          <div class="form-actions">
            <button class="btn btn-primary" id="do-add-member-btn" disabled>เพิ่ม</button>
            <button class="btn btn-secondary" id="cancel-member-btn">ยกเลิก</button>
          </div>
        </div>`, { wide: true });

      const searchInput = document.getElementById('member-search');
      const resultsBox  = document.getElementById('member-results');
      const selectedBox = document.getElementById('member-selected-box');
      const addBtn      = document.getElementById('do-add-member-btn');
      const errorBox    = document.getElementById('member-modal-error');

      function pickUser(u) {
        selectedUser = u;
        resultsBox.style.display = 'none';
        searchInput.value = u.name;
        selectedBox.style.display = 'block';
        selectedBox.innerHTML = `
          <div style="display:flex;align-items:center;gap:.6rem;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.5rem .75rem">
            ${u.avatar_url
              ? `<img src="${h(u.avatar_url)}" class="member-avatar" alt="${h(u.name)}">`
              : `<div class="member-avatar-ph">${h(u.name.charAt(0))}</div>`}
            <div>
              <div style="font-weight:600;font-size:.88rem">${h(u.name)}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${h(u.email)}</div>
            </div>
          </div>`;
        addBtn.disabled = false;
      }

      async function fetchUserResults(q) {
        try {
          const { users } = await searchUsers(q);
          resultsBox.innerHTML = users.length === 0
            ? `<div class="search-dropdown-empty">ไม่พบผู้ใช้</div>`
            : users.map((u, i) => `
                <div class="search-dropdown-item" data-idx="${i}">
                  ${u.avatar_url
                    ? `<img src="${h(u.avatar_url)}" class="member-avatar" alt="${h(u.name)}">`
                    : `<div class="member-avatar-ph">${h(u.name.charAt(0))}</div>`}
                  <div>
                    <div style="font-weight:600">${h(u.name)}</div>
                    <div style="font-size:.75rem;color:var(--text-muted)">${h(u.email)}</div>
                  </div>
                </div>`).join('');
          resultsBox.querySelectorAll('.search-dropdown-item').forEach(el => {
            el.addEventListener('mousedown', (e) => { e.preventDefault(); pickUser(users[+el.dataset.idx]); });
          });
          resultsBox.style.display = 'block';
        } catch {}
      }

      searchInput.addEventListener('focus', () => fetchUserResults(searchInput.value.trim()));

      searchInput.addEventListener('input', () => {
        selectedUser = null;
        addBtn.disabled = true;
        selectedBox.style.display = 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchUserResults(searchInput.value.trim()), 300);
      });

      searchInput.addEventListener('blur', () => setTimeout(() => { resultsBox.style.display = 'none'; }, 150));

      document.getElementById('cancel-member-btn').addEventListener('click', close);
      addBtn.addEventListener('click', async () => {
        if (!selectedUser) return;
        addBtn.disabled = true; addBtn.textContent = 'กำลังเพิ่ม...';
        try {
          await addProjectMember(id, { email: selectedUser.email });
          close();
          showToast('เพิ่มสมาชิกสำเร็จ');
          await renderPage();
        } catch (err) {
          errorBox.innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
          addBtn.disabled = false; addBtn.textContent = 'เพิ่ม';
        }
      });
    });
  }

  await renderPage();
}
init();
