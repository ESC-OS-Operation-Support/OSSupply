// Escape HTML to prevent XSS
export function h(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Status badge HTML
const STATUS_LABELS = {
  draft:'ร่าง', pending:'รอดำเนินการ', processing:'กำลังดำเนินการ',
  ready_for_pickup:'พร้อมรับ', in_lend:'กำลังยืม', overdue:'เกินกำหนด',
  returned:'คืนแล้ว', completed:'เสร็จสิ้น', rejected:'ถูกปฏิเสธ', cancelled:'ยกเลิกแล้ว', return_rejected:'คืนถูกปฏิเสธ',
};
export function statusBadge(status) {
  return `<span class="badge badge-${h(status)}">${h(STATUS_LABELS[status] || status)}</span>`;
}

// Date formatting
export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' });
}
export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('th-TH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
export function formatCountdown(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'หมดเวลา';
  const days  = Math.floor(ms / 864e5);
  const hours = Math.floor((ms % 864e5) / 36e5);
  const mins  = Math.floor((ms % 36e5) / 6e4);
  if (days > 0) return `เหลือ ${days} วัน ${hours} ชั่วโมง`;
  return `เหลือ ${hours} ชั่วโมง ${mins} นาที`;
}

// Show a toast-like alert at top of #app
export function showError(msg) {
  const el = document.createElement('div');
  el.className = 'alert alert-error';
  el.style.marginBottom = '1rem';
  el.textContent = msg;
  const app = document.getElementById('app');
  app.prepend(el);
  setTimeout(() => el.remove(), 5000);
}

// Render the navbar
export function renderNavbar(user, unread = 0) {
  const root = document.getElementById('navbar-root');
  if (!root || !user) return;
  const cur      = window.location.pathname.split('/').pop();
  const isStaff  = user.role === 'staff' || user.role === 'admin';
  const active   = (file) => cur === file ? 'active' : '';

  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="dashboard.html" class="nav-brand">
          <img src="public/ESC_logo.png" alt="กวศ.">
          <span class="nav-brand-name">คลังอุปกรณ์ กวศ.</span>
        </a>
        <div class="nav-links">
          <a href="dashboard.html"     class="nav-link ${active('dashboard.html')}">หน้าหลัก</a>
          <a href="items.html"         class="nav-link ${active('items.html')}">อุปกรณ์</a>
          <a href="projects.html"      class="nav-link ${active('projects.html')}">โครงการ</a>
          <a href="requests.html"      class="nav-link ${active('requests.html')}">คำขอยืม</a>
          <span class="nav-notif">
            <a href="notifications.html" class="nav-link ${active('notifications.html')}">การแจ้งเตือน</a>
            ${unread > 0 ? `<span class="nav-notif-dot">${unread > 99 ? '99+' : unread}</span>` : ''}
          </span>
          ${isStaff ? `
            <span class="nav-divider"></span>
            <a href="admin-items.html"   class="nav-link ${active('admin-items.html')}">จัดการอุปกรณ์</a>
            <a href="admin-returns.html" class="nav-link ${active('admin-returns.html')}">การคืน</a>
            ${user.role === 'admin' ? `<a href="admin-users.html" class="nav-link ${active('admin-users.html')}">ผู้ใช้งาน</a>` : ''}
          ` : ''}
        </div>
        <div class="nav-right">
          ${user.avatar_url
            ? `<img src="${h(user.avatar_url)}" alt="${h(user.name)}" class="nav-avatar">`
            : `<div class="nav-avatar-placeholder">${h(user.name.charAt(0).toUpperCase())}</div>`
          }
          <button class="nav-logout" id="nav-logout-btn">ออกจากระบบ</button>
        </div>
      </div>
    </nav>`;
}

// Open a modal (appends to #modal-root, returns close function)
export function openModal(titleText, bodyHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">
        <div class="modal-title">${h(titleText)}</div>
        ${bodyHtml}
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') close();
  });
  return close;
}
