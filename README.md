# BeyondSure Ticketing System

An internal support ticketing CRM for BeyondSure - employees log in, raise and track
support tickets, assign them to team members, and monitor status through a dashboard.

Built as a single self-contained full-stack app: a Flask REST API backend with a
MySQL database, serving a vanilla HTML/CSS/JS frontend from the same server.

---

## Features

- **Employee authentication** - JWT-based login, bcrypt-hashed passwords, 8-hour sessions
- **Ticket management** - raise, view, assign, update status, add remarks, attach files
- **Activity log** - every status change / assignment / remark is timestamped and tracked per ticket
- **Employee management** - add employees, deactivate/reactivate (soft delete, preserves ticket history)
- **Dashboard** - ticket counts by status, an opened-vs-closed bar chart for the last 7 days, and a recent-activity feed
- **Filtering & search** - by status, assignee, date, and free-text search; Closed tickets are hidden by default unless explicitly filtered for
- **Pagination** - 20 tickets per page
- **CSV export** - download the currently filtered ticket list
- **Dark mode** - toggle in the top nav
- **File attachments** - upload and view/download files attached to a ticket

---

## Tech Stack

| Layer      | Technology                                              |
|------------|----------------------------------------------------------|
| Backend    | Python 3, Flask, Flask-CORS                              |
| Database   | MySQL 8.0                                                 |
| Auth       | PyJWT (JSON Web Tokens), bcrypt (password hashing)        |
| Frontend   | Vanilla HTML, CSS, JavaScript - no framework, no build step |
| Config     | python-dotenv (`.env` file)                                |

No npm, no build tooling - `app.py` serves the frontend files directly, so running
the Flask server is the only step needed to run the whole app.

---

## Project Structure

```
ticketing-system/
├── app.py                       # Flask backend - all API routes + serves the frontend
├── requirements.txt             # Python dependencies
├── .env                         # Local config (DB credentials, JWT secret) - not committed
├── .env.example                 # Template for .env
├── ticket_db_setup.sql          # Full schema - for setting up a FRESH database
├── alter_add_columns.sql        # Migration: adds assigned_at / closed_at columns
├── alter_add_ticket_fields.sql  # Migration: adds partner_name / request_mobile_number /
│                                 #            page_name / category columns
├── index.html                   # Single-page frontend (login screen + main app shell)
├── css/
│   └── styles.css               # All styling, incl. light/dark theme variables
├── js/
│   ├── api.js                   # fetch() wrapper - attaches JWT to every request
│   ├── state.js                 # Shared app state, constants (statuses, storage keys)
│   ├── auth.js                  # Login / logout / session handling
│   ├── employees.js             # Employee list, add, deactivate/reactivate
│   ├── tickets.js               # Ticket list, filters, pagination, raise/view/update
│   ├── dashboard.js             # Dashboard stats + opened-vs-closed chart
│   ├── nav.js                   # Page switching (Dashboard / Tickets / Employees)
│   ├── theme.js                 # Light/dark mode toggle
│   └── utils.js                 # Shared formatting helpers (dates, escaping, etc.)
├── img/
│   └── logo.jpg                 # BeyondSure logo
└── uploads/                     # Ticket attachment files (created automatically, gitignored)
```

---

## Requirements

- **Python 3.10+**
- **MySQL 8.0+** (Community Server is fine)
- pip packages (see `requirements.txt`):
  ```
  flask
  mysql-connector-python
  flask-cors
  python-dotenv
  PyJWT
  bcrypt
  ```

---

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/Suhina-Ray/Beyond-Sure-Ticketing-System.git
cd Beyond-Sure-Ticketing-System
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy the example file and fill in your real values:

```bash
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows
```

Edit `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
TICKET_DB_NAME=ticket_db
JWT_SECRET=some-long-random-string
```

### 3. Set up the database

**Fresh install** (database doesn't exist yet):
```bash
mysql -u root -p < ticket_db_setup.sql
```
*(Windows PowerShell doesn't support `<` redirection - use `Get-Content ticket_db_setup.sql | mysql -u root -p` instead.)*

**Existing database** - if you're upgrading a copy of this project that predates the
`assigned_at`/`closed_at`/`partner_name`/etc. columns, also run:
```bash
mysql -u root -p < alter_add_columns.sql
mysql -u root -p < alter_add_ticket_fields.sql
```

### 4. Run the server

```bash
python app.py
```

Open **http://localhost:5000/** - this single URL serves the frontend and the API.

### 5. Create your first employee login

There's no signup screen - create the first account via the API:
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP001","employee_name":"Your Name","email":"you@beyondsure.in","mobile":"9999999999","password":"yourpassword"}'
```
Then log in on the site with that email/password.

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require an
`Authorization: Bearer <token>` header (token returned from `/employees/login`).

| Method | Endpoint                              | Auth? | Description                                  |
|--------|----------------------------------------|-------|-----------------------------------------------|
| GET    | `/employees`                          | No    | List active employees (`?all=true` for all)   |
| GET    | `/employees/<id>`                     | No    | Get one employee                              |
| POST   | `/employees`                          | No    | Create an employee                            |
| PUT    | `/employees/<id>`                     | No    | Update an employee (incl. Active/Inactive)    |
| POST   | `/employees/login`                    | No    | Log in, returns a JWT                         |
| POST   | `/employees/logout`                   | Yes   | Confirms token validity                       |
| GET    | `/employees/me`                       | Yes   | Get your own profile from the token           |
| POST   | `/tickets`                            | No    | Raise a ticket                                |
| GET    | `/tickets`                            | No    | List tickets (`?status=`, `?assign_to=`)      |
| GET    | `/tickets/<id>`                       | No    | Get one ticket, with attachments + activity log |
| PUT    | `/tickets/<id>`                       | No    | Update status / assignee / remarks            |
| GET    | `/tickets/stats/daily`                | No    | 7-day opened-vs-closed counts (dashboard chart) |
| POST   | `/tickets/<id>/attachments`           | No    | Upload a file to a ticket                     |
| GET    | `/tickets/<id>/attachments`           | No    | List a ticket's attachments                   |
| GET    | `/attachments/<id>`                   | No    | View/download a specific attachment           |

> **Note:** most ticket/employee routes are currently open (no auth required) except
> login/logout/me. If you need to lock these down further before going to production,
> wrap the relevant routes in the existing `@token_required` decorator.

---

## Database Schema

**`employees`** - employee_id, employee_code, employee_name, email, mobile, password
(bcrypt hash), designation, department, status (`Active`/`Inactive`), created_at

**`tickets`** - ticket_id, subject, description, partner_name, request_mobile_number,
page_name, category, remarks, assign_to (FK → employees), status (`Open` / `In Progress`
/ `Resolved` / `Closed`), assigned_at, closed_at, created_at, updated_at

**`ticket_attachments`** - attachment_id, ticket_id (FK), file_name, org_file_name (stored
name on disk), uploaded_at

**`ticket_activity`** - activity_id, ticket_id (FK), assign_to (FK, who made the change),
remarks, created_at

---

## Troubleshooting

- **`'mysql' is not recognized...`** - MySQL isn't on your PATH. Either add
  `C:\Program Files\MySQL\MySQL Server 8.0\bin` to your system PATH, or call
  `mysql.exe` with its full path.
- **`Access denied for user 'root'@'localhost'`** - your `.env`'s `DB_PASSWORD`
  doesn't match your actual MySQL root password. Update `.env` and restart `python app.py`
  (env vars are only read at startup).
- **`Unknown column '...' in 'field list'`** - your database is missing a column that
  a newer version of `app.py` expects. Run the relevant `alter_*.sql` migration file.
- **Login says "Failed to fetch"** - the Flask server isn't running (or crashed).
  Check the terminal running `python app.py` for errors, and confirm you're visiting
  `http://localhost:5000/`, not a stale/cached tab.
- **Forgot the MySQL root password** - stop the MySQL service, start `mysqld` with
  `--skip-grant-tables`, connect with no password, run
  `ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';`, then restart the
  service normally.

---

## License

Internal project - BeyondSure.
