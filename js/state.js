/* =========================================================
   Storage keys & helpers
   ========================================================= */
const LS_USER = 'shrigoda_user';
const LS_TOKEN = 'shrigoda_token';
const LS_THEME = 'shrigoda_theme';

function load(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/* =========================================================
   Shared application state
   (employees & tickets are now loaded from the API, not localStorage —
   see fetchEmployees() in employees.js and fetchTickets() in tickets.js)
   ========================================================= */
let currentUser = load(LS_USER, null);
let employees = [];
let tickets = [];
let openTicketId = null;
let ticketPage = 1;
const TICKETS_PER_PAGE = 20;

// Must match the `status` ENUM on the `tickets` table in ticket_db_setup.sql
const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const STATUS_COLORS = {
  'Open': '#4a92f0',
  'In Progress': '#e0a530',
  'Resolved': '#a480ea',
  'Closed': '#12a862'
};
