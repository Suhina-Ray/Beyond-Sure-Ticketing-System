/* =========================================================
   Dashboard
   ========================================================= */
function renderDashboard(){
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const unassignedCount = tickets.filter(t => !t.assign_to).length;

  document.getElementById('statTotalTickets').textContent = totalTickets;
  document.getElementById('statOpenTickets').textContent = openCount;
  document.getElementById('statWipTickets').textContent = inProgressCount;
  document.getElementById('statUnassignedTickets').textContent = unassignedCount;

  const stageGrid = document.getElementById('stageGrid');
  stageGrid.innerHTML = TICKET_STATUSES.map(status => {
    const count = tickets.filter(t => t.status === status).length;
    const c = STATUS_COLORS[status];
    return `
      <div class="stage-card" onclick="goToTicketStatus('${status}')">
        <span class="stage-tag" style="background:${hexToRgba(c, 0.14)};color:${c};">${status}</span>
        <div class="stage-num">${count}</div>
        <div class="stage-sub">tickets</div>
      </div>
    `;
  }).join('');

  const recent = tickets.slice()
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 10);

  const list = document.getElementById('followupsList');
  const empty = document.getElementById('followupsEmpty');

  if(recent.length === 0){
    list.innerHTML = '';
    empty.classList.remove('hidden');
  }else{
    empty.classList.add('hidden');
    list.innerHTML = recent.map(t => `
      <div class="followup-item">
        <div>
          <div class="followup-name">${escapeHtml(t.subject)}</div>
          <div class="followup-time">${t.assigned_to_name ? 'Assigned to ' + escapeHtml(t.assigned_to_name) : 'Unassigned'}</div>
          <div class="followup-time">${formatDateTime(t.updated_at || t.created_at)}</div>
        </div>
        <div class="followup-right">
          ${statusPillHtml(t.status)}
          <button class="btn btn-ghost btn-sm" onclick="openTicketModal(${t.ticket_id})">View</button>
        </div>
      </div>
    `).join('');
  }

  renderTicketTrendChart();
}

async function renderTicketTrendChart(){
  const container = document.getElementById('ticketTrendChart');
  try{
    const data = await apiFetch('/api/tickets/stats/daily');
    const series = data.stats || [];

    if(series.every(d => d.opened === 0 && d.closed === 0)){
      container.innerHTML = '<div class="trend-empty">No ticket activity in the last 7 days.</div>';
      return;
    }

    const maxVal = Math.max(1, ...series.map(d => Math.max(d.opened, d.closed)));
    const barsHtml = series.map(d => {
      const openedH = Math.round((d.opened / maxVal) * 130) + (d.opened > 0 ? 2 : 0);
      const closedH = Math.round((d.closed / maxVal) * 130) + (d.closed > 0 ? 2 : 0);
      const dateObj = new Date(d.date + 'T00:00:00');
      const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
      return `
        <div class="trend-col" title="${d.date}: ${d.opened} opened, ${d.closed} closed">
          <div class="trend-col-bars">
            <div class="trend-bar opened" style="height:${openedH}px;" title="${d.opened} opened"></div>
            <div class="trend-bar closed" style="height:${closedH}px;" title="${d.closed} closed"></div>
          </div>
          <div class="trend-day-label">${label}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="trend-chart">
        <div class="trend-legend">
          <span><span class="dot" style="background:var(--green);"></span>Opened</span>
          <span><span class="dot" style="background:var(--ink-soft);opacity:0.55;"></span>Closed</span>
        </div>
        <div class="trend-bars">${barsHtml}</div>
      </div>
    `;
  }catch(err){
    container.innerHTML = '<div class="trend-empty">Could not load chart data.</div>';
  }
}

function goToTicketStatus(status){
  goToPage('tickets');
  document.getElementById('filterTicketStatus').value = status;
  ticketPage = 1;
  renderTickets();
}
