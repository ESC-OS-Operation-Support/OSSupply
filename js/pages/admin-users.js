import { requireAuth } from '../auth.js';
import { getUsers, updateUserRole, setUserStatus } from '../api.js';
import { h, showToast, showConfirm } from '../ui.js';
import { renderSelect, initSelect } from '../select.js';

const ROLE_OPTS = [['user', 'ผู้ใช้'], ['staff', 'เจ้าหน้าที่'], ['admin', 'ผู้ดูแล']];

async function init() {
  const me = await requireAuth(['admin']);
  if (!me) return;

  const app = document.getElementById('app');

  async function renderPage(roleFilter = '') {
    const { users } = await getUsers(roleFilter || undefined);

    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">จัดการผู้ใช้งาน</h1>
        ${renderSelect({ id: 'role-filter', value: roleFilter, options: [['', 'ทุกบทบาท'], ...ROLE_OPTS] })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ผู้ใช้</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:.6rem">
                    ${u.avatar_url
                      ? `<img src="${h(u.avatar_url)}" class="member-avatar" alt="${h(u.name)}">`
                      : `<div class="member-avatar-ph">${h(u.name.charAt(0))}</div>`}
                    <div>
                      <div style="font-weight:600;font-size:.88rem">${h(u.name)}</div>
                      ${u.nickname ? `<div style="font-size:.75rem;color:var(--text-muted)">${h(u.nickname)}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td style="font-size:.85rem">${h(u.email)}</td>
                <td>
                  ${renderSelect({ id: `cs-role-${u.id}`, value: u.role, options: ROLE_OPTS, variant: 'inline', disabled: u.id === me.id })}
                </td>
                <td>
                  ${u.is_active === 1
                    ? `<span class="status-pill status-pill-confirmed">ใช้งาน</span>`
                    : `<span class="status-pill status-pill-rejected">ระงับ</span>`}
                </td>
                <td>
                  ${u.id !== me.id ? `
                    <button class="btn btn-sm do-toggle-status ${u.is_active === 1 ? 'btn-danger' : 'btn-success'}"
                      data-uid="${h(u.id)}" data-active="${u.is_active}">
                      ${u.is_active === 1 ? 'ระงับ' : 'เปิดใช้งาน'}
                    </button>` : `<span style="font-size:.78rem;color:var(--text-subtle)">—</span>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    initSelect('role-filter', v => renderPage(v));

    users.forEach(u => {
      if (u.id === me.id) return;
      initSelect(`cs-role-${u.id}`, async value => {
        try { await updateUserRole(u.id, value); showToast('เปลี่ยนบทบาทสำเร็จ'); }
        catch (err) { alert(err.message); await renderPage(roleFilter); }
      });
    });

    document.querySelectorAll('.do-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === '1';
        const label    = isActive ? 'ระงับ' : 'เปิดใช้งาน';
        if (!await showConfirm(`ต้องการ${label}ผู้ใช้นี้?`, { danger: true })) return;
        try {
          await setUserStatus(btn.dataset.uid, !isActive);
          showToast(isActive ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว');
          await renderPage(roleFilter);
        } catch (err) { alert(err.message); }
      });
    });
  }

  await renderPage();
}

init();
