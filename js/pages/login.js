import { getMe, loginUrl } from '../api.js';
import { h } from '../ui.js';

const ERROR_MSGS = {
  oauth_cancelled:       'การเข้าสู่ระบบถูกยกเลิก กรุณาลองใหม่',
  token_exchange_failed: 'การยืนยันตัวตนล้มเหลว กรุณาลองใหม่',
  profile_fetch_failed:  'ไม่สามารถดึงข้อมูลโปรไฟล์ได้ กรุณาลองใหม่',
  unauthorized_domain:   'อนุญาตเฉพาะบัญชี @chula.ac.th และ @student.chula.ac.th เท่านั้น',
};

async function init() {
  // Read and immediately clear the pre-OAuth flag (set before the OAuth redirect starts).
  // This is a fallback for when Live Server strips query params from the /login redirect.
  const oauthPending = localStorage.getItem('oauth_pending');
  localStorage.removeItem('oauth_pending');

  try {
    const { user } = await getMe();
    if (user) { window.location.href = '/dashboard.html'; return; }
  } catch {}

  const search = new URLSearchParams(window.location.search);
  const error  = search.get('error');

  // URL params take priority (specific error). Fall back to the flag for the case
  // where Live Server drops the query string on the /login → /login/ redirect.
  const errMsg = error
    ? (ERROR_MSGS[error] || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    : oauthPending
      ? 'ไม่สามารถเข้าสู่ระบบได้ กรุณาใช้บัญชี @chula.ac.th หรือ @student.chula.ac.th เท่านั้น'
      : '';

  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <img src="/public/ESC_logo.png" alt="กวศ." class="login-logo">
        <h1 class="login-title">คลังอุปกรณ์</h1>
        <p class="login-subtitle">คณะวิศวกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย</p>
        ${errMsg ? `<div class="alert alert-error">${h(errMsg)}</div>` : ''}
        <button class="login-btn" id="login-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>
        <p class="login-note">อนุญาตเฉพาะบัญชี @chula.ac.th และ @student.chula.ac.th</p>
      </div>
    </div>`;

  document.getElementById('login-btn').addEventListener('click', () => {
    localStorage.setItem('oauth_pending', '1');
    window.location.href = loginUrl();
  });
}

init();
