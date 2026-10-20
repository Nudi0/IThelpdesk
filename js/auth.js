const form = document.getElementById('loginForm');
const errorEl = document.getElementById('loginError');
const passwordInput = document.getElementById('loginPassword');

if (getSession()) {
  window.location.replace('home.html');
}

function showLoginError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginError('Enter a valid work email address.');
    return;
  }

  if (password.length < 8) {
    showLoginError('Password must be at least 8 characters.');
    return;
  }

  const session = {
    email,
    name: displayNameFromEmail(email),
    employeeId: employeeIdFromEmail(email),
  };

  if (document.getElementById('rememberMe')?.checked) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    setSession(session);
    localStorage.removeItem(SESSION_KEY);
  }

  window.location.replace('home.html');
});

document.getElementById('togglePassword')?.addEventListener('click', () => {
  const hidden = passwordInput.type === 'password';
  passwordInput.type = hidden ? 'text' : 'password';
  document.getElementById('togglePassword').textContent = hidden ? 'Hide' : 'Show';
});

document.getElementById('forgotPassword')?.addEventListener('click', () => {
  showLoginError('Password resets are handled by IT. Raise a request from a colleague’s desk or call the service line.');
});
