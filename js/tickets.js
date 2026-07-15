/* =========================================================
   Tickets — now backed by /api/tickets
   ========================================================= */
async function fetchTickets(){
  const data = await apiFetch('/api/tickets');
  tickets = data.tickets || [];
}

function getFilteredTickets(){
  const q = document.getElementById('ticketSearch').value.trim().toLowerCase();
  const statusF = document.getElementById('filterTicketStatus').value;
  const empF = document.getElementById('filterTicketEmployee').value;
  const dateF = document.getElementById('filterTicketDate').value;

  return tickets.filter(t => {
    // Closed tickets are hidden from the default view — only shown when the
    // Closed status filter is explicitly selected.
    if(!statusF && t.status === 'Closed') return false;
    if(q && !((t.subject || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))) return false;
    if(statusF && t.status !== statusF) return false;
    if(empF && String(t.assign_to || '') !== String(empF)) return false;
    if(dateF){
      const d = new Date(t.created_at);
      const df = new Date(dateF + 'T00:00:00');
      if(!isSameDay(d, df)) return false;
    }
    return true;
  });
}

function renderTickets(){
  const filtered = getFilteredTickets().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  if(ticketPage > totalPages) ticketPage = totalPages;
  if(ticketPage < 1) ticketPage = 1;

  const startIdx = (ticketPage - 1) * TICKETS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + TICKETS_PER_PAGE);

  const body = document.getElementById('ticketBody');
  const empty = document.getElementById('ticketEmpty');
  document.getElementById('ticketsCountPill').textContent = filtered.length;

  document.getElementById('ticketPageIndicator').textContent = `Page ${ticketPage} of ${totalPages}`;
  document.getElementById('ticketPrevPage').disabled = ticketPage <= 1;
  document.getElementById('ticketNextPage').disabled = ticketPage >= totalPages;
  document.getElementById('ticketPagination').classList.toggle('hidden', filtered.length === 0);

  if(pageItems.length === 0){
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = pageItems.map(t => {
    const created = new Date(t.created_at);
    const detailBits = [];
    if(t.category) detailBits.push(`<span class="detail-chip">${escapeHtml(t.category)}</span>`);
    if(t.partner_name) detailBits.push(`<span class="detail-chip muted">${escapeHtml(t.partner_name)}</span>`);
    const tooltipParts = [];
    if(t.request_mobile_number) tooltipParts.push(`Mobile: ${t.request_mobile_number}`);
    if(t.page_name) tooltipParts.push(`From: ${t.page_name}`);
    const tooltip = tooltipParts.join(' | ');
    return `
    <tr class="data-row" onclick="openTicketModal(${t.ticket_id})">
      <td data-label="Created">
        <div style="font-weight:600;">${formatDate(created)}</div>
        <div class="muted" style="font-size:12px;">${formatTime(created)}</div>
      </td>
      <td data-label="Subject" style="font-weight:700;">${escapeHtml(t.subject)}</td>
      <td data-label="Details" title="${escapeHtml(tooltip)}">
        ${detailBits.length ? detailBits.join(' ') : '<span class="muted">—</span>'}
      </td>
      <td data-label="Status">${statusPillHtml(t.status)}</td>
      <td data-label="Assigned To" class="muted">${t.assigned_to_name ? escapeHtml(t.assigned_to_name) : 'Unassigned'}</td>
    </tr>
  `;
  }).join('');
}

function populateTicketFilterOptions(){
  const filterStatus = document.getElementById('filterTicketStatus');
  filterStatus.innerHTML = '<option value="">All Statuses (excl. Closed)</option>' + TICKET_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');

  const tStatus = document.getElementById('tStatus');
  tStatus.innerHTML = TICKET_STATUSES.map(s => `<option>${s}</option>`).join('');

  const viewStatus = document.getElementById('viewTicketStatus');
  viewStatus.innerHTML = TICKET_STATUSES.map(s => `<option>${s}</option>`).join('');
}

function renderActivityLog(activity){
  const box = document.getElementById('viewTicketActivity');
  const entries = (activity || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if(entries.length === 0){
    box.innerHTML = '<div class="activity-empty">No activity recorded yet.</div>';
    return;
  }
  box.innerHTML = entries.map(e => `
    <div class="activity-entry">
      <div class="txt">${escapeHtml(e.remarks)}${e.done_by ? ' — <span class="muted">' + escapeHtml(e.done_by) + '</span>' : ''}</div>
      <div class="ts">${formatDateTime(e.created_at)}</div>
    </div>
  `).join('');
}

function switchTicketTab(tab){
  document.querySelectorAll('.modal-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.getElementById('viewTicketTabDetails').classList.toggle('hidden', tab !== 'details');
  document.getElementById('viewTicketTabActivity').classList.toggle('hidden', tab !== 'activity');
}

async function openTicketModal(id){
  try{
    const data = await apiFetch(`/api/tickets/${id}`);
    const t = data.ticket;
    openTicketId = id;
    switchTicketTab('details');

    document.getElementById('viewTicketSubject').value = t.subject;
    document.getElementById('viewTicketDescription').value = t.description || '';
    document.getElementById('viewTicketAttachments').innerHTML = t.attachments.length
      ? t.attachments.map(a => `<a href="/api/attachments/${a.attachment_id}" target="_blank">${escapeHtml(a.file_name)}</a>`).join(', ')
      : 'None';
    document.getElementById('viewTicketPartnerName').textContent = t.partner_name || '—';
    document.getElementById('viewTicketCategory').textContent = t.category || '—';
    document.getElementById('viewTicketRequestMobile').textContent = t.request_mobile_number || '—';
    document.getElementById('viewTicketPageName').textContent = t.page_name || '—';
    document.getElementById('viewTicketStatus').value = t.status;
    document.getElementById('viewTicketAssignedTo').value = t.assign_to || '';
    document.getElementById('viewTicketRemarks').value = '';
    document.getElementById('viewTicketDate').textContent = formatDate(new Date(t.created_at));

    const assignedRow = document.getElementById('viewTicketAssignedRow');
    if(t.assigned_at){
      document.getElementById('viewTicketAssignedDate').textContent = formatDateTime(t.assigned_at);
      assignedRow.classList.remove('hidden');
    }else{
      assignedRow.classList.add('hidden');
    }

    const closedRow = document.getElementById('viewTicketClosedRow');
    if(t.closed_at){
      document.getElementById('viewTicketClosedDate').textContent = formatDateTime(t.closed_at);
      closedRow.classList.remove('hidden');
    }else{
      closedRow.classList.add('hidden');
    }

    renderActivityLog(t.activity);
    openModal('viewTicketModal');
  }catch(err){
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', function(){
  populateTicketFilterOptions();

  ['ticketSearch', 'filterTicketStatus', 'filterTicketEmployee', 'filterTicketDate'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { ticketPage = 1; renderTickets(); });
    document.getElementById(id).addEventListener('change', () => { ticketPage = 1; renderTickets(); });
  });

  document.getElementById('ticketPrevPage').addEventListener('click', () => {
    if(ticketPage > 1){ ticketPage--; renderTickets(); }
  });
  document.getElementById('ticketNextPage').addEventListener('click', () => {
    ticketPage++; renderTickets();
  });

  document.querySelectorAll('.modal-tab').forEach(el => {
    el.addEventListener('click', () => switchTicketTab(el.dataset.tab));
  });

  document.getElementById('openAddTicket').addEventListener('click', () => {
    document.getElementById('ticketForm').reset();
    openModal('ticketModal');
  });

  document.getElementById('ticketForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const subject = document.getElementById('tSubject').value.trim();
    const description = document.getElementById('tDescription').value.trim();
    const partnerName = document.getElementById('tPartnerName').value.trim();
    const category = document.getElementById('tCategory').value.trim();
    const requestMobile = document.getElementById('tRequestMobile').value.trim();
    // Page Name is captured automatically — the page the user arrived from,
    // rather than typed in by hand. Falls back to the current page if there's
    // no referrer (e.g. this tab was opened directly).
    const pageName = document.referrer || document.title || window.location.href;
    const status = document.getElementById('tStatus').value;
    const assignTo = document.getElementById('tAssignedTo').value;
    const remarks = document.getElementById('tRemarks').value.trim();
    const files = document.getElementById('tAttachments').files;

    submitBtn.disabled = true;
    try{
      // POST /api/tickets accepts subject/description plus the optional
      // detail fields below — it always creates the ticket as "Open" and
      // unassigned. So if the form set a different status/assignee/remarks,
      // we follow up with a PUT.
      const created = await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject, description,
          partner_name: partnerName,
          category: category,
          request_mobile_number: requestMobile,
          page_name: pageName
        })
      });
      const ticketId = created.ticket_id;

      const updates = {};
      if(status && status !== 'Open') updates.status = status;
      if(assignTo) updates.assign_to = Number(assignTo);
      if(remarks) updates.remarks = remarks;
      if(Object.keys(updates).length){
        await apiFetch(`/api/tickets/${ticketId}`, { method: 'PUT', body: JSON.stringify(updates) });
      }

      for(const file of files){
        const fd = new FormData();
        fd.append('file', file);
        await apiFetch(`/api/tickets/${ticketId}/attachments`, { method: 'POST', body: fd });
      }

      await fetchTickets();
      ticketPage = 1;
      renderTickets();
      renderDashboard();
      closeModal('ticketModal');
    }catch(err){
      alert(err.message);
    }finally{
      submitBtn.disabled = false;
    }
  });

  document.getElementById('exportTicketsBtn').addEventListener('click', function(){
    const rows = getFilteredTickets();
    const header = ['Created Date', 'Created Time', 'Subject', 'Description', 'Partner Name', 'Category', 'Request Mobile', 'Page Name', 'Status', 'Assigned To', 'Assigned On', 'Closed On', 'Remarks'];
    const csvRows = [header.join(',')];
    rows.forEach(t => {
      const created = new Date(t.created_at);
      const row = [
        formatDate(created), formatTime(created), t.subject, t.description,
        t.partner_name || '', t.category || '', t.request_mobile_number || '', t.page_name || '',
        t.status,
        t.assigned_to_name || '',
        t.assigned_at ? formatDateTime(t.assigned_at) : '',
        t.closed_at ? formatDateTime(t.closed_at) : '',
        t.remarks || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tickets_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('saveTicketBtn').addEventListener('click', async function(){
    if(!openTicketId) return;
    const newStatus = document.getElementById('viewTicketStatus').value;
    const newAssignedTo = document.getElementById('viewTicketAssignedTo').value;
    const newRemarks = document.getElementById('viewTicketRemarks').value.trim();

    const payload = {
      status: newStatus,
      assign_to: newAssignedTo ? Number(newAssignedTo) : null
    };
    if(newRemarks) payload.remarks = newRemarks;

    try{
      await apiFetch(`/api/tickets/${openTicketId}`, { method: 'PUT', body: JSON.stringify(payload) });
      await fetchTickets();
      renderTickets();
      renderDashboard();
      closeModal('viewTicketModal');
    }catch(err){
      alert(err.message);
    }
  });
});
