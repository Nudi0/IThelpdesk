const session = requireAuth();
if (!session) throw new Error('Redirecting to login');

bindHeader(session);

const greetingEl = document.getElementById('homeGreeting');
if (greetingEl) {
  const hour = new Date().getHours();
  const wave = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (session.name || 'there').split(' ')[0];
  greetingEl.textContent = `${wave}, ${first}`;
}

const REQUEST_TYPES = ['General', 'Incident', 'Request for Information', 'Request'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function isClosed(status) {
  return status === 'Resolved';
}

function renderRequestTypes(tickets) {
  const tbody = document.getElementById('requestTypeBody');
  const rows = REQUEST_TYPES.map((type) => {
    const matching = tickets.filter((t) => requestTypeFor(t.issueCategory) === type);
    const open = matching.filter((t) => !isClosed(t.status)).length;
    const closed = matching.filter((t) => isClosed(t.status)).length;
    return `
      <tr>
        <td>
          <a href="requests.html">${escapeHtml(type)}</a>
        </td>
        <td>${matching.length}</td>
        <td>${open}</td>
        <td>${closed}</td>
      </tr>`;
  });
  tbody.innerHTML = rows.join('');
}

function renderRecentRequests(tickets) {
  const tbody = document.getElementById('recentRequestBody');
  const recent = tickets.slice(0, 8);

  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No requests yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map((t) => `
    <tr>
      <td><a href="requests.html#my-tickets">${escapeHtml(t.id)}</a></td>
      <td>${escapeHtml(t.description)}</td>
      <td><span class="badge badge-status-${escapeHtml(t.status).replace(' ', '-')}">${escapeHtml(t.status)}</span></td>
      <td>Unassigned</td>
      <td>${escapeHtml(formatDate(t.submittedAt))}</td>
    </tr>
  `).join('');
}

function renderStats(tickets) {
  const open = tickets.filter((t) => t.status === 'Open').length;
  const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
  document.getElementById('statUnassigned').textContent = tickets.filter((t) => t.status === 'Open').length;
  document.getElementById('statPending').textContent = open + inProgress;
  document.getElementById('statOverdue').textContent = '0';
  document.getElementById('statApprovals').textContent = '0';
}

async function loadDashboard() {
  try {
    const tickets = await loadTickets();
    renderRecentRequests(tickets);
    renderRequestTypes(tickets);
    renderStats(tickets);
  } catch (err) {
    document.getElementById('recentRequestBody').innerHTML =
      `<tr><td colspan="5" class="table-empty">Could not load requests: ${escapeHtml(err.message)}</td></tr>`;
    document.getElementById('requestTypeBody').innerHTML =
      `<tr><td colspan="4" class="table-empty">Could not load request types.</td></tr>`;
  }
}

document.getElementById('homeSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  document.querySelectorAll('#recentRequestBody tr').forEach((row) => {
    row.style.display = !query || row.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
});

loadDashboard();
