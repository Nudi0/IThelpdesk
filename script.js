/* ============================================================
   script.js  –  SPA Navigation + Ticket Logic + Knowledge Base
   ============================================================ */

/* ── 1. SPA NAVIGATION ──────────────────────────────────────
   Each nav link has a data-view attribute.
   Clicking it hides all views and shows the matching one.
   ──────────────────────────────────────────────────────────── */
const navLinks  = document.querySelectorAll('[data-view]');
const allViews  = document.querySelectorAll('.view');

function showView(viewId) {
  // Hide all views
  allViews.forEach(v => {
    v.hidden = true;
    v.classList.remove('active-view');
  });

  // Show requested view
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.hidden = false;
    target.classList.add('active-view');
  }

  // Update active nav link
  navLinks.forEach(a => {
    a.classList.toggle('active', a.dataset.view === viewId);
  });

  // Refresh My Tickets view whenever it is opened
  if (viewId === 'my-tickets') renderTicketList();
}

// Attach click handlers to ALL elements with data-view (nav + inline links)
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-view]');
  if (!trigger) return;
  e.preventDefault();
  showView(trigger.dataset.view);
});

// Start on Submit Ticket view
showView('submit');


/* ── 2. TICKET STORAGE HELPERS ──────────────────────────────
   Tickets are stored in localStorage as a JSON array.
   ──────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'helpdesk_tickets';

function loadTickets() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function generateTicketId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `TKT-${year}${rand}`;
}


/* ── 3. FORM: Character Counter ─────────────────────────────*/
const descTextarea = document.getElementById('description');
const charCounter  = document.getElementById('charCounter');
const MAX_CHARS    = 500;

descTextarea.addEventListener('input', () => {
  const len = Math.min(descTextarea.value.length, MAX_CHARS);
  descTextarea.value = descTextarea.value.slice(0, MAX_CHARS);
  charCounter.textContent = `${len} / ${MAX_CHARS}`;
  charCounter.style.color = len >= MAX_CHARS * 0.9 ? '#dc2626' : '#6b7280';
});


/* ── 4. FORM: Validation Helpers ────────────────────────────*/
function setError(fieldId, message) {
  const field   = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (message) {
    field?.classList.add('invalid');
    if (errorEl) errorEl.textContent = message;
  } else {
    field?.classList.remove('invalid');
    if (errorEl) errorEl.textContent = '';
  }
}

// Clear errors on change
['employeeName', 'employeeId', 'department', 'issueCategory', 'description'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => setError(id, ''));
});


/* ── 5. FORM: Submission ────────────────────────────────────*/
const form          = document.getElementById('ticketForm');
const successBanner = document.getElementById('successBanner');
const ticketIdSpan  = document.getElementById('ticketId');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const employeeName  = document.getElementById('employeeName').value.trim();
  const employeeId    = document.getElementById('employeeId').value.trim();
  const department    = document.getElementById('department').value;
  const issueCategory = document.getElementById('issueCategory').value;
  const description   = descTextarea.value.trim();
  const priorityEl    = document.querySelector('input[name="priority"]:checked');

  let valid = true;

  if (!employeeName || employeeName.length < 2) {
    setError('employeeName', 'Employee name is required (min 2 chars).');
    valid = false;
  } else { setError('employeeName', ''); }

  if (!employeeId) {
    setError('employeeId', 'Employee ID is required.');
    valid = false;
  } else { setError('employeeId', ''); }

  if (!department) {
    setError('department', 'Please select a department.');
    valid = false;
  } else { setError('department', ''); }

  if (!issueCategory) {
    setError('issueCategory', 'Please select an issue category.');
    valid = false;
  } else { setError('issueCategory', ''); }

  if (!description || description.length < 10) {
    setError('description', 'Please describe the issue (min 10 chars).');
    valid = false;
  } else { setError('description', ''); }

  const priorityError = document.getElementById('priority-error');
  if (!priorityEl) {
    priorityError.textContent = 'Please select a priority level.';
    valid = false;
  } else { priorityError.textContent = ''; }

  if (!valid) return;

  // Build ticket object
  const ticket = {
    id:           generateTicketId(),
    employeeName,
    employeeId,
    department,
    issueCategory,
    description,
    priority:     priorityEl.value,
    status:       'Open',
    submittedAt:  new Date().toLocaleString(),
  };

  // Persist to localStorage
  const tickets = loadTickets();
  tickets.unshift(ticket);   // newest first
  saveTickets(tickets);

  // Show success banner
  ticketIdSpan.textContent = ticket.id;
  successBanner.hidden = false;
  successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Reset form
  form.reset();
  charCounter.textContent = `0 / ${MAX_CHARS}`;
  charCounter.style.color = '#6b7280';
});

// "View in My Tickets" button inside success banner
document.getElementById('goToMyTickets').addEventListener('click', () => {
  successBanner.hidden = true;
  showView('my-tickets');
});

// Reset: hide success banner, clear errors
form.addEventListener('reset', () => {
  successBanner.hidden = true;
  charCounter.textContent = `0 / ${MAX_CHARS}`;
  charCounter.style.color = '#6b7280';
  ['employeeName', 'employeeId', 'department', 'issueCategory', 'description'].forEach(id => setError(id, ''));
  document.getElementById('priority-error').textContent = '';
});


/* ── 6. MY TICKETS VIEW ─────────────────────────────────────*/
const ticketList    = document.getElementById('ticketList');
const emptyTickets  = document.getElementById('emptyTickets');
const filterStatus  = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');

function priorityBadge(p) {
  return `<span class="badge badge-priority-${p}">${p}</span>`;
}

function statusBadge(s) {
  const cls = s.replace(' ', '-');
  return `<span class="badge badge-status-${cls}">${s}</span>`;
}

function renderTicketList() {
  const tickets  = loadTickets();
  const statVal  = filterStatus.value;
  const prioVal  = filterPriority.value;

  const filtered = tickets.filter(t => {
    const matchStatus   = statVal  === 'all' || t.status   === statVal;
    const matchPriority = prioVal  === 'all' || t.priority === prioVal;
    return matchStatus && matchPriority;
  });

  ticketList.innerHTML = '';

  if (filtered.length === 0) {
    emptyTickets.hidden = false;
    return;
  }

  emptyTickets.hidden = true;

  filtered.forEach(t => {
    const item = document.createElement('div');
    item.className  = 'ticket-item';
    item.dataset.priority = t.priority;
    item.innerHTML = `
      <div>
        <strong>${t.id}</strong> &mdash; ${t.issueCategory}
        <div class="ticket-meta">
          <span>👤 ${t.employeeName} (${t.employeeId})</span>
          <span>🏢 ${t.department}</span>
          <span>🕒 ${t.submittedAt}</span>
        </div>
        <p class="ticket-desc">${t.description}</p>
      </div>
      <div class="ticket-badges">
        ${priorityBadge(t.priority)}
        ${statusBadge(t.status)}
      </div>`;
    ticketList.appendChild(item);
  });
}

// Re-render when filters change
filterStatus.addEventListener('change', renderTicketList);
filterPriority.addEventListener('change', renderTicketList);

// Clear all tickets button
document.getElementById('clearAllTickets').addEventListener('click', () => {
  if (confirm('Delete all saved tickets? This cannot be undone.')) {
    saveTickets([]);
    renderTicketList();
  }
});


/* ── 7. KNOWLEDGE BASE: Live Search ─────────────────────────*/
const kbSearch = document.getElementById('kbSearch');
const kbCards  = document.querySelectorAll('.kb-card');
const kbEmpty  = document.getElementById('kbEmpty');

kbSearch.addEventListener('input', () => {
  const query = kbSearch.value.toLowerCase().trim();
  let visible = 0;

  kbCards.forEach(card => {
    const text = (card.textContent + card.dataset.tags).toLowerCase();
    const show = !query || text.includes(query);
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  kbEmpty.hidden = visible > 0;
});


