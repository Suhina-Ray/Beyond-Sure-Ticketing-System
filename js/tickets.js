/* =========================================================
   Tickets
   ========================================================= */
function getFilteredTickets(){
  const q = document.getElementById('ticketSearch').value.trim().toLowerCase();
  const statusF = document.getElementById('filterTicketStatus').value;
  const empF = document.getElementById('filterTicketEmployee').value;
  const dateF = document.getElementById('filterTicketDate').value;

  return tickets.filter(t => {
    if(q && !( (t.subject||'').toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) )) return false;
    if(statusF && t.status !== statusF) return false;
    if(empF && t.assignedTo !== empF) return false;
    if(dateF){
      const d = new Date(t.createdAt);
      const df = new Date(dateF + 'T00:00:00');
      if(!isSameDay(d, df)) return false;
    }
    return true;
  });
}

function renderTickets(){
  const filtered = getFilteredTickets().sort((a,b)=> b.createdAt - a.createdAt);
  const body = document.getElementById('ticketBody');
  const empty = document.getElementById('ticketEmpty');
  document.getElementById('ticketsCountPill').textContent = tickets.length;

  if(filtered.length === 0){
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = filtered.map(t => {
    const created = new Date(t.createdAt);
    return `
    <tr class="data-row" onclick="openTicketModal('${t.id}')">
      <td data-label="Created">
        <div style="font-weight:600;">${formatDate(created)}</div>
        <div class="muted" style="font-size:12px;">${formatTime(created)}</div>
      </td>
      <td data-label="Subject" style="font-weight:700;">${escapeHtml(t.subject)}</td>
      <td data-label="Status">${statusPillHtml(t.status)}</td>
      <td data-label="Assigned To" class="muted">${t.assignedTo ? escapeHtml(t.assignedTo) : 'Unassigned'}</td>
      <td data-label="Attachments" class="muted">${t.attachments.length}</td>
    </tr>
  `;
  }).join('');
}

function populateTicketFilterOptions(){
  const filterStatus = document.getElementById('filterTicketStatus');
  filterStatus.innerHTML = '<option value="">All Statuses</option>' + TICKET_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');

  const tStatus = document.getElementById('tStatus');
  tStatus.innerHTML = TICKET_STATUSES.map(s => `<option>${s}</option>`).join('');

  const viewStatus = document.getElementById('viewTicketStatus');
  viewStatus.innerHTML = TICKET_STATUSES.map(s => `<option>${s}</option>`).join('');
}

function logActivity(ticket, text){
  ticket.activity = ticket.activity || [];
  ticket.activity.push({ ts: Date.now(), text: text });
}

function renderActivityLog(ticket){
  const box = document.getElementById('viewTicketActivity');
  const entries = (ticket.activity || []).slice().sort((a,b)=> b.ts - a.ts);
  if(entries.length === 0){
    box.innerHTML = '<div class="activity-empty">No activity recorded yet.</div>';
    return;
  }
  box.innerHTML = entries.map(e => `
    <div class="activity-entry">
      <div class="txt">${escapeHtml(e.text)}</div>
      <div class="ts">${formatDateTime(e.ts)}</div>
    </div>
  `).join('');
}

function openTicketModal(id){
  const t = tickets.find(x => x.id === id);
  if(!t) return;
  openTicketId = id;
  document.getElementById('viewTicketSubject').value = t.subject;
  document.getElementById('viewTicketDescription').value = t.description || '';
  document.getElementById('viewTicketAttachments').textContent = t.attachments.length ? t.attachments.join(', ') : 'None';
  document.getElementById('viewTicketStatus').value = t.status;
  document.getElementById('viewTicketAssignedTo').value = t.assignedTo || '';
  document.getElementById('viewTicketRemarks').value = t.remarks || '';
  document.getElementById('viewTicketDate').textContent = formatDate(new Date(t.createdAt));
  renderActivityLog(t);
  openModal('viewTicketModal');
}

document.addEventListener('DOMContentLoaded', function(){
  populateTicketFilterOptions();

  ['ticketSearch','filterTicketStatus','filterTicketEmployee','filterTicketDate'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderTickets);
    document.getElementById(id).addEventListener('change', renderTickets);
  });

  document.getElementById('openAddTicket').addEventListener('click', ()=>{
    document.getElementById('ticketForm').reset();
    openModal('ticketModal');
  });

  document.getElementById('ticketForm').addEventListener('submit', function(e){
    e.preventDefault();
    const files = document.getElementById('tAttachments').files;
    const attachmentNames = Array.from(files).map(f => f.name);
    const status = document.getElementById('tStatus').value;
    const assignedTo = document.getElementById('tAssignedTo').value;
    const t = {
      id: uid(),
      subject: document.getElementById('tSubject').value.trim(),
      description: document.getElementById('tDescription').value.trim(),
      attachments: attachmentNames,
      status: status,
      assignedTo: assignedTo,
      remarks: document.getElementById('tRemarks').value.trim(),
      createdAt: Date.now(),
      activity: []
    };
    let openingNote = `Ticket raised with status "${status}"`;
    openingNote += assignedTo ? `, assigned to ${assignedTo}.` : ', unassigned.';
    logActivity(t, openingNote);
    if(t.remarks){ logActivity(t, `Remarks added: "${t.remarks}"`); }

    tickets.push(t);
    save(LS_TICKETS, tickets);
    renderTickets();
    renderDashboard();
    closeModal('ticketModal');
  });

  document.getElementById('exportTicketsBtn').addEventListener('click', function(){
    const rows = getFilteredTickets();
    const header = ['Created Date','Created Time','Subject','Description','Status','Assigned To','Attachments','Remarks'];
    const csvRows = [header.join(',')];
    rows.forEach(t=>{
      const created = new Date(t.createdAt);
      const row = [
        formatDate(created), formatTime(created), t.subject, t.description, t.status,
        t.assignedTo || '', t.attachments.join('; '), t.remarks || ''
      ].map(v => `"${String(v).replace(/"/g,'""')}"`);
      csvRows.push(row.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tickets_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('saveTicketBtn').addEventListener('click', function(){
    const t = tickets.find(x => x.id === openTicketId);
    if(!t) return;

    const newSubject = document.getElementById('viewTicketSubject').value.trim();
    const newDescription = document.getElementById('viewTicketDescription').value.trim();
    const newStatus = document.getElementById('viewTicketStatus').value;
    const newAssignedTo = document.getElementById('viewTicketAssignedTo').value;
    const newRemarks = document.getElementById('viewTicketRemarks').value.trim();

    const notes = [];
    if(newStatus !== t.status){ notes.push(`Status changed from "${t.status}" to "${newStatus}".`); }
    const oldAssigned = t.assignedTo || 'Unassigned';
    const newAssignedLabel = newAssignedTo || 'Unassigned';
    if(newAssignedLabel !== oldAssigned){ notes.push(`Reassigned from ${oldAssigned} to ${newAssignedLabel}.`); }
    if(newSubject !== t.subject || newDescription !== t.description){ notes.push('Ticket details updated.'); }
    if(newRemarks && newRemarks !== t.remarks){ notes.push(`Remarks added: "${newRemarks}"`); }

    t.subject = newSubject;
    t.description = newDescription;
    t.status = newStatus;
    t.assignedTo = newAssignedTo;
    t.remarks = newRemarks;

    if(notes.length){
      logActivity(t, notes.join(' '));
    }

    save(LS_TICKETS, tickets);
    renderTickets();
    renderDashboard();
    renderActivityLog(t);
    closeModal('viewTicketModal');
  });
});
