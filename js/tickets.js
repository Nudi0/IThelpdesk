/* ============================================================
   tickets.js  –  SPA Navigation + Ticket Logic + Knowledge Base
   ============================================================ */

const session = requireAuth();
if (!session) throw new Error('Redirecting to login');
bindHeader(session);

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

const allowedViews = ['submit', 'my-tickets', 'knowledge'];
const startView = (location.hash || '#submit').replace('#', '');
showView(allowedViews.includes(startView) ? startView : 'submit');

window.addEventListener('hashchange', () => {
  const view = location.hash.replace('#', '');
  if (allowedViews.includes(view)) showView(view);
});


/* ── 3. FORM: Character Counter ─────────────────────────────*/
if (session?.name) document.getElementById('employeeName').value = session.name;
if (session?.employeeId) document.getElementById('employeeId').value = session.employeeId;

const descTextarea = document.getElementById('description');
const charCounter  = document.getElementById('charCounter');
const MAX_CHARS    = 500;

descTextarea.addEventListener('input', () => {
  const len = Math.min(descTextarea.value.length, MAX_CHARS);
  descTextarea.value = descTextarea.value.slice(0, MAX_CHARS);
  charCounter.textContent = `${len} / ${MAX_CHARS}`;
  charCounter.style.color = len >= MAX_CHARS * 0.9 ? '#dc2626' : '#6b7280';
});

const draftParams = new URLSearchParams(location.search);
if (draftParams.get('draft') === '1') {
  const desc = draftParams.get('desc') || '';
  const category = draftParams.get('category') || '';
  const priority = draftParams.get('priority') || '';
  const catField = document.getElementById('issueCategory');
  if (desc) {
    descTextarea.value = desc.slice(0, MAX_CHARS);
    descTextarea.dispatchEvent(new Event('input'));
  }
  if (catField && [...catField.options].some((o) => o.value === category)) {
    catField.value = category;
  }
  if (priority) {
    const radio = document.querySelector(`input[name="priority"][value="${CSS.escape(priority)}"]`);
    if (radio) radio.checked = true;
  }
  showView('submit');
}


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
const form               = document.getElementById('ticketForm');
const successBanner      = document.getElementById('successBanner');
const ticketIdSpan       = document.getElementById('ticketId');
const submitErrorBanner  = document.getElementById('submitErrorBanner');
const submitErrorText    = document.getElementById('submitErrorText');
const submitButton       = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitErrorBanner.hidden = true;

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

  const ticket = {
    id:           generateTicketId(),
    employeeName,
    employeeId,
    department,
    issueCategory,
    description,
    priority:     priorityEl.value,
    status:       'Open',
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';

  try {
    await createTicket(ticket);

    form.reset();
    charCounter.textContent = `0 / ${MAX_CHARS}`;
    charCounter.style.color = '#6b7280';

    ticketIdSpan.textContent = ticket.id;
    successBanner.hidden = false;
    successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    submitErrorText.textContent = err.message || 'Please try again.';
    submitErrorBanner.hidden = false;
    submitErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Ticket →';
  }
});

// "View in My Tickets" button inside success banner
document.getElementById('goToMyTickets').addEventListener('click', () => {
  successBanner.hidden = true;
  showView('my-tickets');
});

// Reset: hide success banner, clear errors
form.addEventListener('reset', () => {
  successBanner.hidden = true;
  submitErrorBanner.hidden = true;
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

async function renderTicketList() {
  ticketList.innerHTML = '<p class="ticket-desc">Loading tickets…</p>';
  emptyTickets.hidden = true;

  let tickets = [];
  try {
    tickets = await loadTickets();
  } catch (err) {
    ticketList.innerHTML = `<p class="ticket-desc">Could not load tickets: ${escapeHtml(err.message)}</p>`;
    return;
  }

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
        <strong>${escapeHtml(t.id)}</strong> &mdash; ${escapeHtml(t.issueCategory)}
        <div class="ticket-meta">
          <span>👤 ${escapeHtml(t.employeeName)} (${escapeHtml(t.employeeId)})</span>
          <span>🏢 ${escapeHtml(t.department)}</span>
          <span>🕒 ${escapeHtml(new Date(t.submittedAt).toLocaleString())}</span>
        </div>
        <p class="ticket-desc">${escapeHtml(t.description)}</p>
      </div>
      <div class="ticket-badges">
        ${priorityBadge(escapeHtml(t.priority))}
        ${statusBadge(escapeHtml(t.status))}
      </div>`;
    ticketList.appendChild(item);
  });
}

// Re-render when filters change
filterStatus.addEventListener('change', renderTicketList);
filterPriority.addEventListener('change', renderTicketList);

// Clear all tickets button
document.getElementById('clearAllTickets').addEventListener('click', async () => {
  if (!confirm('Delete all saved tickets? This cannot be undone.')) return;

  const { error } = await db.from('support_tickets').delete().neq('id', '');
  if (error) {
    alert(`Could not delete tickets: ${error.message}`);
    return;
  }
  renderTicketList();
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


