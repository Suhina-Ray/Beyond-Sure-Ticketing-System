/* =========================================================
   Notifications - new-ticket alerts + "unassigned for 24h+" alerts.
   Purely frontend: derived by polling /api/tickets and diffing against
   what we've already seen, persisted in localStorage so it survives refresh.
   ========================================================= */
const LS_NOTIFS          = 'shrigoda_notifications';
const LS_SEEN_TICKETS     = 'shrigoda_seen_tickets';
const LS_STALE_ALERTED    = 'shrigoda_stale_alerted';
const STALE_THRESHOLD_MS  = 24 * 60 * 60 * 1000; // 24 hours
const NOTIF_POLL_MS       = 60 * 1000;           // recheck every 60s
const MAX_NOTIFICATIONS   = 50;

let notifications = load(LS_NOTIFS, []);
let seenTicketIds = load(LS_SEEN_TICKETS, null);   // null = not yet initialized
let staleAlertedIds = load(LS_STALE_ALERTED, []);
let notifPollTimer = null;

function pushNotification(type, message, ticketId){
  notifications.unshift({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type, message, ticketId,
    createdAt: new Date().toISOString(),
    read: false
  });
  if(notifications.length > MAX_NOTIFICATIONS) notifications.length = MAX_NOTIFICATIONS;
  save(LS_NOTIFS, notifications);
}

function checkForNewTickets(){
  const currentIds = tickets.map(t => t.ticket_id);

  if(seenTicketIds === null){
    // First time ever running this check on this browser - just establish
    // a baseline so we don't spam notifications for every pre-existing ticket.
    seenTicketIds = currentIds;
    save(LS_SEEN_TICKETS, seenTicketIds);
    return;
  }

  const newOnes = tickets.filter(t => !seenTicketIds.includes(t.ticket_id));
  newOnes.forEach(t => {
    pushNotification('new', `New ticket raised: "${t.subject}"`, t.ticket_id);
  });

  if(newOnes.length){
    seenTicketIds = currentIds;
    save(LS_SEEN_TICKETS, seenTicketIds);
  }
}

function checkForStaleUnassigned(){
  const now = Date.now();
  let changed = false;

  tickets.forEach(t => {
    if(t.assign_to || t.status === 'Closed') return;
    const age = now - new Date(t.created_at).getTime();
    if(age >= STALE_THRESHOLD_MS && !staleAlertedIds.includes(t.ticket_id)){
      pushNotification('stale', `Ticket "${t.subject}" has been unassigned for over 24 hours`, t.ticket_id);
      staleAlertedIds.push(t.ticket_id);
      changed = true;
    }
  });

  if(changed) save(LS_STALE_ALERTED, staleAlertedIds);
}

function runNotificationChecks(){
  const before = notifications.length;
  checkForNewTickets();
  checkForStaleUnassigned();
  const added = notifications.length - before;

  renderNotifications();

  if(added > 0){
    const bell = document.getElementById('notifBell');
    bell.classList.remove('has-unread');
    void bell.offsetWidth; // restart animation
    bell.classList.add('has-unread');
  }
}

function startNotificationPolling(){
  stopNotificationPolling();
  notifPollTimer = setInterval(async () => {
    try{
      await fetchTickets();
      runNotificationChecks();
    }catch(e){ /* silent - a failed background poll shouldn't interrupt the user */ }
  }, NOTIF_POLL_MS);
}

function stopNotificationPolling(){
  if(notifPollTimer){ clearInterval(notifPollTimer); notifPollTimer = null; }
}

function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function renderNotifications(){
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  const bell = document.getElementById('notifBell');

  if(unreadCount > 0){
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.classList.remove('hidden');
  }else{
    badge.classList.add('hidden');
  }

  const list = document.getElementById('notifList');
  if(notifications.length === 0){
    list.innerHTML = `
      <div class="notif-empty">
        <div class="big">${ICONS.bell}</div>
        You're all caught up - no notifications yet.
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-ticket="${n.ticketId || ''}">
      <div class="notif-icon type-${n.type}">${n.type === 'new' ? ICONS.ticket : ICONS.clock}</div>
      <div class="notif-body">
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
      ${n.read ? '' : '<div class="notif-dot"></div>'}
    </div>
  `).join('');
}

function toggleNotifPanel(forceState){
  const panel = document.getElementById('notifPanel');
  const bell  = document.getElementById('notifBell');
  const shouldOpen = forceState !== undefined ? forceState : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !shouldOpen);
  if(shouldOpen){
    // Position the fixed panel just below the bell button
    const rect = bell.getBoundingClientRect();
    const panelWidth = 360;
    let left = rect.right - panelWidth;
    if(left < 8) left = 8; // don't clip off the left edge on small screens
    panel.style.top  = (rect.bottom + 10) + 'px';
    panel.style.left = left + 'px';
    renderNotifications();
  }
}

document.addEventListener('DOMContentLoaded', function(){
  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifPanel();
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', () => toggleNotifPanel(false));
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') toggleNotifPanel(false); });

  document.getElementById('notifList').addEventListener('click', (e) => {
    const item = e.target.closest('.notif-item');
    if(!item) return;
    const id = item.dataset.id;
    const ticketId = item.dataset.ticket;
    const notif = notifications.find(n => n.id === id);
    if(notif && !notif.read){
      notif.read = true;
      save(LS_NOTIFS, notifications);
      renderNotifications();
    }
    if(ticketId){
      toggleNotifPanel(false);
      goToPage('tickets');
      openTicketModal(Number(ticketId));
    }
  });

  document.getElementById('notifMarkAllRead').addEventListener('click', (e) => {
    e.stopPropagation();
    notifications.forEach(n => n.read = true);
    save(LS_NOTIFS, notifications);
    renderNotifications();
  });

  document.getElementById('notifClearAll').addEventListener('click', (e) => {
    e.stopPropagation();
    notifications = [];
    save(LS_NOTIFS, notifications);
    renderNotifications();
  });
});
