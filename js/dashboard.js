/* =========================================================
   Dashboard
   ========================================================= */
function renderDashboard(){
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const wipCount = tickets.filter(t => t.status === 'WIP').length;
  const unassignedCount = tickets.filter(t => !t.assignedTo).length;

  document.getElementById('statTotalTickets').textContent = totalTickets;
  document.getElementById('statOpenTickets').textContent = openCount;
  document.getElementById('statWipTickets').textContent = wipCount;
  document.getElementById('statUnassignedTickets').textContent = unassignedCount;

  const stageGrid = document.getElementById('stageGrid');
  stageGrid.innerHTML = TICKET_STATUSES.map(status => {
    const count = tickets.filter(t => t.status === status).length;
    const c = STATUS_COLORS[status];
    return `
      <div class="stage-card" onclick="goToTicketStatus('${status}')">
        <span class="stage-tag" style="background:${hexToRgba(c,0.14)};color:${c};">${status}</span>
        <div class="stage-num">${count}</div>
        <div class="stage-sub">tickets</div>
      </div>
    `;
  }).join('');

  const activityFeed = [];
  tickets.forEach(t=>{
    (t.activity || []).forEach(a => activityFeed.push({ ticketId: t.id, subject: t.subject, status: t.status, ts: a.ts, text: a.text }));
  });
  activityFeed.sort((a,b)=> b.ts - a.ts);
  const recent = activityFeed.slice(0, 8);

  const list = document.getElementById('followupsList');
  const empty = document.getElementById('followupsEmpty');

  if(recent.length === 0){
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = recent.map(a => `
    <div class="followup-item">
      <div>
        <div class="followup-name">${escapeHtml(a.subject)}</div>
        <div class="followup-time">${escapeHtml(a.text)}</div>
        <div class="followup-time">${formatDateTime(a.ts)}</div>
      </div>
      <div class="followup-right">
        ${statusPillHtml(a.status)}
        <button class="btn btn-ghost btn-sm" onclick="openTicketModal('${a.ticketId}')">View</button>
      </div>
    </div>
  `).join('');
}

function goToTicketStatus(status){
  goToPage('tickets');
  document.getElementById('filterTicketStatus').value = status;
  renderTickets();
}
