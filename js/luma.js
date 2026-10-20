const LUMA_KB = [
  {
    title: 'Reset Your Password',
    tags: 'password reset login locked account access credentials',
    category: 'Account / Access',
    priority: 'High',
    steps: [
      'Open portal.company.com/reset',
      'Enter your Employee ID and registered email',
      'Follow the link sent to your inbox',
      'Set a new password (min 10 characters, 1 symbol)',
    ],
  },
  {
    title: 'Connect to VPN',
    tags: 'vpn network remote connection disconnect home wifi anyconnect',
    category: 'Network / Connectivity',
    priority: 'High',
    steps: [
      'Open Cisco AnyConnect from the taskbar',
      'Server: vpn.company.com',
      'Sign in with your network credentials',
      'Accept the push notification on your phone',
    ],
  },
  {
    title: 'Set Up a Printer',
    tags: 'printer print queue jam driver scanner paper',
    category: 'Printer / Peripheral',
    priority: 'Medium',
    steps: [
      'Go to Settings → Printers & Scanners',
      'Click Add a printer or scanner',
      'Select your floor printer',
      'Install the driver if Windows prompts you',
    ],
  },
  {
    title: 'Configure Outlook Email',
    tags: 'email outlook mailbox password prompt inbox send',
    category: 'Email',
    priority: 'Medium',
    steps: [
      'Open Outlook → File → Add Account',
      'Enter your company email',
      'Click Connect when auto-discover finishes',
      'Complete MFA if asked',
    ],
  },
  {
    title: 'Computer Running Slow',
    tags: 'slow laptop freeze lag cpu memory restart performance',
    category: 'Hardware',
    priority: 'Low',
    steps: [
      'Restart the machine fully (not sleep)',
      'Close unused apps and browser tabs',
      'Run Disk Cleanup',
      'Check Task Manager for a process hogging CPU or memory',
    ],
  },
  {
    title: 'Request New Software',
    tags: 'software install application request license app',
    category: 'Software',
    priority: 'Low',
    steps: [
      'Check the Approved Software List on the intranet',
      'If it is listed, raise a Software ticket',
      'Include a short business justification',
      'Allow 3–5 business days for review',
    ],
  },
];

function lumaScore(query, article) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const hay = `${article.title} ${article.tags}`.toLowerCase();
  return words.reduce((sum, w) => sum + (hay.includes(w) ? 2 : 0), 0);
}

function lumaBestArticle(query) {
  return LUMA_KB
    .map((article) => ({ article, score: lumaScore(query, article) }))
    .sort((a, b) => b.score - a.score)[0];
}

function lumaWantsTicket(query) {
  return /ticket|request|raise|escalate|technician|still broken|didn'?t work|not working/.test(query.toLowerCase());
}

function lumaReply(query) {
  const q = query.trim();
  if (!q) return { html: 'Tell me what is getting in your way — VPN, password, printer, mailbox…' };

  if (/^(hi|hello|hey|salam|good (morning|afternoon|evening))\b/i.test(q)) {
    return {
      html: 'I am <strong>Luma</strong>, the night-shift that never clocks out. Describe the snag, or tap a spark below.',
    };
  }

  const match = lumaBestArticle(q);
  const escalate = lumaWantsTicket(q);

  if (match.score >= 2) {
    const a = match.article;
    const steps = a.steps.map((s) => `<li>${s}</li>`).join('');
    return {
      html: `That sounds like <strong>${a.title}</strong>. Try this pulse first:<ol>${steps}</ol>
        ${escalate ? 'If it still fails, I can draft a ticket with this already filled in.' : 'Still stuck after that? Ask me to raise a ticket.'}`,
      draft: {
        category: a.category,
        priority: a.priority,
        description: q,
      },
    };
  }

  return {
    html: 'I do not have a playbook for that yet. I can still draft a ticket so a human picks it up.',
    draft: {
      category: 'Other',
      priority: 'Medium',
      description: q,
    },
  };
}

function lumaDraftUrl(draft) {
  const params = new URLSearchParams({
    draft: '1',
    category: draft.category,
    priority: draft.priority,
    desc: draft.description.slice(0, 500),
  });
  return `requests.html?${params.toString()}`;
}

function mountLuma() {
  if (document.getElementById('lumaRoot')) return;

  const root = document.createElement('div');
  root.id = 'lumaRoot';
  root.innerHTML = `
    <button type="button" class="luma-orb" id="lumaOrb" aria-label="Ask Luma">
      <span class="luma-orb-core">✦</span>
      <span class="luma-orb-label">Ask Luma</span>
    </button>
    <section class="luma-panel" id="lumaPanel" hidden>
      <header class="luma-head">
        <div>
          <p class="luma-kicker">Copilot</p>
          <h2>Ask Luma</h2>
        </div>
        <button type="button" class="luma-close" id="lumaClose" aria-label="Close Luma">×</button>
      </header>
      <p class="luma-intro">Grounded in the solutions library. Unique move: she can <em>pulse-triage</em> and draft the ticket for you.</p>
      <div class="luma-chips">
        <button type="button" data-luma-q="VPN keeps dropping">VPN drops</button>
        <button type="button" data-luma-q="I forgot my password">Password</button>
        <button type="button" data-luma-q="Printer will not print">Printer</button>
        <button type="button" data-luma-q="Raise a ticket my laptop is still slow">Escalate</button>
      </div>
      <div class="luma-thread" id="lumaThread"></div>
      <form class="luma-composer" id="lumaForm">
        <input type="text" id="lumaInput" placeholder="Ask Luma anything about IT…" autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const panel = document.getElementById('lumaPanel');
  const thread = document.getElementById('lumaThread');
  const input = document.getElementById('lumaInput');

  function addBubble(role, html, draft) {
    const el = document.createElement('div');
    el.className = `luma-bubble luma-${role}`;
    el.innerHTML = html;
    if (draft && role === 'bot') {
      const a = document.createElement('a');
      a.className = 'luma-draft';
      a.href = lumaDraftUrl(draft);
      a.textContent = `Pulse triage → ${draft.priority} · ${draft.category}`;
      el.appendChild(a);
    }
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
  }

  function openLuma() {
    panel.hidden = false;
    document.getElementById('lumaOrb').classList.add('is-open');
    if (!thread.dataset.greeted) {
      addBubble('bot', 'I am <strong>Luma</strong>. I read the solutions library so you do not have to hunt. What is on fire?');
      thread.dataset.greeted = '1';
    }
    input.focus();
  }

  function closeLuma() {
    panel.hidden = true;
    document.getElementById('lumaOrb').classList.remove('is-open');
  }

  function ask(text) {
    addBubble('user', escapeHtml(text));
    const reply = lumaReply(text);
    window.setTimeout(() => addBubble('bot', reply.html, reply.draft), 280);
  }

  document.getElementById('lumaOrb').addEventListener('click', () => {
    if (panel.hidden) openLuma();
    else closeLuma();
  });
  document.getElementById('lumaClose').addEventListener('click', closeLuma);
  document.getElementById('lumaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(text);
  });
  document.querySelectorAll('[data-luma-q]').forEach((btn) => {
    btn.addEventListener('click', () => ask(btn.dataset.lumaQ));
  });

  document.querySelectorAll('[data-open-luma]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openLuma();
    });
  });

  if (location.hash === '#luma') openLuma();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountLuma);
} else {
  mountLuma();
}
