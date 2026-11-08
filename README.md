# HelpDesk — IT Support Ticket System

Internal portal for employees to sign in, raise IT tickets, track status, browse solutions, and ask **Luma** (a copilot grounded in the knowledge base). Tickets are stored in **Supabase**.

**Repository:** https://github.com/Nudi0/IThelpdesk

## How to run

1. Open the project folder.
2. Open `index.html` in a browser (or use VS Code Live Server).
3. Sign in with any work-style **email** and a password of **at least 8 characters**.  
   Example: `nina.okonkwo@company.com` / `Operations8`

Home and Requests require a session. Use **Sign out** to return to login.

## What to demonstrate (about 3 minutes)

1. **Login** — Show the sign-in screen, enter an email + password, land on Home.
2. **Home** — Greeting, recent tickets, **Request types** table (top right), dark/light toggle.
3. **Ask Luma** — Open the orb (or Ask Luma in the nav). Tap **VPN drops**. Show the step-by-step answer and **Pulse triage** (it can prefill a ticket).
4. **Create** — Requests → submit a ticket (name is prefilled). Note the ticket ID.
5. **Read** — My Tickets: the new row appears from Supabase (survives refresh).
6. **Update** — Change **Status** to In Progress, then Resolved. Refresh — status stays.
7. **Delete** — Delete that one ticket (or mention Clear All).
8. **Solutions** — Search the knowledge base (e.g. “printer”).

## Features

| Area | What it does |
|---|---|
| Auth | Client session (not company SSO). Optional “Keep me signed in”. |
| CRUD | Create / list / update status / delete tickets in `support_tickets`. |
| Status | Open → In Progress → Resolved, saved in the database. |
| Luma | Matches VPN, password, printer, Outlook, slow PC, software guides; can draft a ticket. |
| Theme | Dark / Light, remembered in the browser. |

## Database

- **Project:** IT HelpDesk (Supabase)
- **Table:** `public.support_tickets`
- **Columns:** `id`, `employee_name`, `employee_id`, `department`, `issue_category`, `description`, `priority`, `status`, `submitted_at`
- **API:** browser uses the public (anon) key + Row Level Security policies for insert, select, update, delete

## Test checklist

- [x] Database is online (`ACTIVE_HEALTHY`)
- [x] INSERT a ticket via the Data API
- [x] SELECT tickets via the Data API
- [x] UPDATE status (Open → In Progress) via the Data API
- [x] Missing UPDATE policy was found in testing and added
- [ ] Browser walkthrough of login → Home → Luma → submit → status → delete (do this live in class)

## Project files

```
index.html      Login
home.html       Dashboard
requests.html   Submit / My Tickets / Solutions
css/style.css
js/config.js    Supabase client, session, theme, ticket helpers
js/auth.js
js/home.js
js/tickets.js
js/luma.js
```

## Notes for graders / contributors

- This is a **class demo**, not production SSO. Anyone with a valid-looking email can sign in.
- If tickets fail to load, the Supabase project may be **paused** — restore it in the Supabase dashboard.
- Collaborators: invite them on GitHub at the repository link above.
