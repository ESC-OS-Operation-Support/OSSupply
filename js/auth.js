import { getMe, postLogout, getStatus } from './api.js';
import { renderNavbar } from './ui.js';

function redirectToLogin() {
  const error = new URLSearchParams(window.location.search).get('error');
  window.location.href = error ? `/login/?error=${encodeURIComponent(error)}` : '/login/';
}

// Kept so refreshNavStatus can re-render without re-fetching the user
let _currentUser = null;

function mountNavbar(user, status) {
  renderNavbar(user, status);
  document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
    await postLogout().catch(() => {});
    window.location.href = '/login/';
  });
}

export async function requireAuth(roles = null) {
  let user;
  try {
    const res = await getMe();
    user = res.user;
  } catch {
    redirectToLogin();
    return null;
  }
  if (!user) {
    redirectToLogin();
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    window.location.href = '/dashboard/';
    return null;
  }

  if (user.nickname === null && !window.location.pathname.startsWith('/profile/')) {
    window.location.href = '/profile/?first=1';
    return null;
  }

  _currentUser = user;
  localStorage.removeItem('oauth_pending');

  let status = {};
  try { status = await getStatus(); } catch {}
  mountNavbar(user, status);

  return user;
}

// Call after any action that might change status counts (e.g. submit/process a request)
export async function refreshNavStatus() {
  if (!_currentUser) return;
  try {
    const status = await getStatus();
    mountNavbar(_currentUser, status);
  } catch {}
}
