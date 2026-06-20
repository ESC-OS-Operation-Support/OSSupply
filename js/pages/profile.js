import { requireAuth } from '../auth.js';
import { updateMe } from '../api.js';
import { h } from '../ui.js';

const GROUPS = 'ABCDEFGHJKLMNPQRST'.split('');
const YEARS  = ['1', '2', '3', '4', 'ป.โท/ป.เอก'];

async function init() {
  const user = await requireAuth();
  if (!user) return;

  const params   = new URLSearchParams(window.location.search);
  const isFirst    = params.get('first')    === '1';
  const isRequired = params.get('required') === 'true';
  const app = document.getElementById('app');

  const sel = (name, options, current) =>
    `<select class="form-select" name="${name}">
      <option value="">-- ไม่ระบุ --</option>
      ${options.map(o => `<option value="${h(o)}" ${String(current) === String(o) ? 'selected' : ''}>${h(o)}</option>`).join('')}
    </select>`;

  app.innerHTML = `
    ${isFirst ? `
      <div class="flow-banner flow-banner-info" style="max-width:640px">
        <div class="flow-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="flow-banner-body">
          <div class="flow-banner-title">ยินดีต้อนรับ! กรุณากรอกข้อมูลโปรไฟล์ก่อนใช้งานระบบ</div>
          <div class="flow-banner-desc">ข้อมูลนี้ใช้สำหรับการติดต่อและระบุตัวตนในการยืมอุปกรณ์</div>
        </div>
      </div>` : ''}
    ${isRequired ? `
      <div class="flow-banner flow-banner-warning" style="max-width:640px">
        <div class="flow-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="flow-banner-body">
          <div class="flow-banner-title">กรุณากรอกข้อมูลโปรไฟล์ให้ครบก่อนดำเนินการต่อ</div>
          <div class="flow-banner-desc">ระบบต้องการข้อมูลของคุณเพื่อดำเนินการยืมอุปกรณ์</div>
        </div>
      </div>` : ''}

    <div class="page-header">
      <h1 class="page-title">โปรไฟล์ของฉัน</h1>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.25rem;max-width:760px;align-items:start">

      <div class="card" style="text-align:center;padding:2rem 1.5rem">
        ${user.avatar_url
          ? `<img src="${h(user.avatar_url)}" alt="${h(user.name)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;border:3px solid var(--border)">`
          : `<div style="width:80px;height:80px;border-radius:50%;background:var(--primary-bg);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;margin:0 auto 1rem">${h(user.name.charAt(0).toUpperCase())}</div>`
        }
        <div style="font-weight:700;font-size:1rem;margin-bottom:.25rem">${h(user.name)}</div>
        <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem">${h(user.email)}</div>
        <span class="badge badge-${h(user.role)}" style="font-size:.72rem">${h(user.role)}</span>
        <p style="font-size:.75rem;color:var(--text-subtle);margin-top:1rem;line-height:1.6">ชื่อและอีเมลมาจาก Google<br>ไม่สามารถแก้ไขได้ที่นี่</p>
      </div>

      <div class="card">
        <div class="card-title">แก้ไขข้อมูลส่วนตัว</div>
        <div id="form-success"></div>
        <div id="form-error"></div>
        <form id="profile-form" class="form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">ชื่อเล่น${(isFirst || isRequired) ? ' <span class="form-required">*</span>' : ''}</label>
              <input class="form-input" name="nickname" value="${h(user.nickname || '')}" ${(isFirst || isRequired) ? 'required' : ''} placeholder="ชื่อเล่น">
            </div>
            <div class="form-group">
              <label class="form-label">ชั้นปี</label>
              ${sel('year', YEARS, user.year)}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">สาขา / หลักสูตร</label>
              <input class="form-input" name="section" value="${h(user.section || '')}" placeholder="เช่น CEDT, AI Robotics">
            </div>
            <div class="form-group">
              <label class="form-label">Group</label>
              ${sel('study_group', GROUPS, user.study_group)}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">เบอร์โทรศัพท์</label>
              <input class="form-input" name="phone" value="${h(user.phone || '')}" placeholder="08X-XXX-XXXX">
            </div>
            <div class="form-group">
              <label class="form-label">LINE ID</label>
              <input class="form-input" name="line_id" value="${h(user.line_id || '')}" placeholder="@lineid">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Instagram</label>
            <input class="form-input" name="instagram" value="${h(user.instagram || '')}" placeholder="@username">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="save-btn">บันทึก</button>
            ${(!isFirst && !isRequired) ? `<button type="button" class="btn btn-secondary" onclick="history.back()">ยกเลิก</button>` : ''}
          </div>
        </form>
      </div>

    </div>`;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd     = new FormData(e.target);
    const btn    = document.getElementById('save-btn');
    const errEl  = document.getElementById('form-error');
    const okEl   = document.getElementById('form-success');
    errEl.innerHTML = '';
    okEl.innerHTML  = '';
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    const data = {};
    ['nickname', 'year', 'section', 'study_group', 'phone', 'line_id', 'instagram'].forEach(k => {
      const v = fd.get(k);
      data[k] = v || null;
    });

    try {
      await updateMe(data);
      if (isFirst || isRequired) {
        window.location.href = '/dashboard/';
      } else {
        okEl.innerHTML = `<div class="alert alert-success" style="margin-bottom:.75rem">บันทึกข้อมูลเรียบร้อยแล้ว</div>`;
        btn.disabled = false;
        btn.textContent = 'บันทึก';
      }
    } catch (err) {
      errEl.innerHTML = `<div class="alert alert-error" style="margin-bottom:.75rem">${h(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = 'บันทึก';
    }
  });
}

init();
