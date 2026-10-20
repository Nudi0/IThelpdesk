const SUPABASE_URL = 'https://jlekpnnnihvlhnopdgty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Bv1HZNwkSLFUKYreM6INyA_9NrioSDZ';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SESSION_KEY = 'helpdesk_session';
const THEME_KEY = 'helpdesk_theme';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const dark = next === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.textContent = dark ? 'Light' : 'Dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

function bindThemeToggle() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindThemeToggle);
} else {
  bindThemeToggle();
}

function displayNameFromEmail(email) {
  const local = (email.split('@')[0] || 'colleague').replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

function employeeIdFromEmail(email) {
  let n = 0;
  for (const ch of email) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return `EMP-${String(n % 100000).padStart(5, '0')}`;
}

function initialsFromName(name) {
  return (name || 'HD')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null'
    );
  } catch {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.replace('index.html');
    return null;
  }
  return session;
}

function bindHeader(session) {
  const nameEl = document.getElementById('headerUser');
  if (nameEl && session?.name) nameEl.textContent = session.name;
  const avatar = document.getElementById('headerAvatar');
  if (avatar && session?.name) avatar.textContent = initialsFromName(session.name);

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearSession();
    window.location.replace('index.html');
  });

  bindAppMenu();
}

function closeAppMenu() {
  const menu = document.getElementById('appMenu');
  const overlay = document.getElementById('appMenuOverlay');
  const btn = document.querySelector('.menu-btn');
  if (menu) menu.hidden = true;
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('menu-open');
  btn?.setAttribute('aria-expanded', 'false');
}

function openAppMenu() {
  const menu = document.getElementById('appMenu');
  const overlay = document.getElementById('appMenuOverlay');
  const btn = document.querySelector('.menu-btn');
  if (menu) menu.hidden = false;
  if (overlay) overlay.hidden = false;
  document.body.classList.add('menu-open');
  btn?.setAttribute('aria-expanded', 'true');
}

function bindAppMenu() {
  const btn = document.querySelector('.menu-btn');
  if (!btn || btn.dataset.bound === 'true') return;
  btn.dataset.bound = 'true';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('appMenu');
    if (!menu || menu.hidden) openAppMenu();
    else closeAppMenu();
  });

  document.getElementById('appMenuOverlay')?.addEventListener('click', closeAppMenu);
  document.getElementById('appMenuClose')?.addEventListener('click', closeAppMenu);
  document.getElementById('appMenu')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeAppMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAppMenu();
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapTicket(row) {
  return {
    id: row.id,
    employeeName: row.employee_name,
    employeeId: row.employee_id,
    department: row.department,
    issueCategory: row.issue_category,
    description: row.description,
    priority: row.priority,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

async function loadTickets() {
  const { data, error } = await db
    .from('support_tickets')
    .select('id, employee_name, employee_id, department, issue_category, description, priority, status, submitted_at')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicket);
}

function requestTypeFor(category) {
  const incident = ['Hardware', 'Network / Connectivity', 'Security', 'Printer / Peripheral'];
  const request = ['Software', 'Account / Access', 'Email'];
  if (incident.includes(category)) return 'Incident';
  if (request.includes(category)) return 'Request';
  if (category === 'Other') return 'Request for Information';
  return 'General';
}

function generateTicketId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `TKT-${year}${rand}`;
}

async function createTicket(ticket) {
  const { data, error } = await db
    .from('support_tickets')
    .insert({
      id: ticket.id,
      employee_name: ticket.employeeName,
      employee_id: ticket.employeeId,
      department: ticket.department,
      issue_category: ticket.issueCategory,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
