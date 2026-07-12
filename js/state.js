/* =========================================================
   Storage keys & helpers
   ========================================================= */
const LS_USER = 'shrigoda_user';
const LS_EMPLOYEES = 'shrigoda_employees';
const LS_TICKETS = 'shrigoda_tickets';
const LS_THEME = 'shrigoda_theme';

function load(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/* =========================================================
   Shared application state
   ========================================================= */
let currentUser = load(LS_USER, null);
let employees = load(LS_EMPLOYEES, []);
let tickets = load(LS_TICKETS, []);
let openTicketId = null;

const TICKET_STATUSES = ['Open','WIP','Hold','Closed'];
const STATUS_COLORS = {
  'Open':'#4a92f0',
  'WIP':'#e0a530',
  'Hold':'#a480ea',
  'Closed':'#12a862'
};
