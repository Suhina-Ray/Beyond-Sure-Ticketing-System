/* =========================================================
   Formatting utilities
   ========================================================= */
function initials(name){
  return (name || '?').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
}
function formatDate(d){
  if(!d) return '—';
  const dt = new Date(d);
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
}
function formatDateTime(d){
  if(!d) return '—';
  const dt = new Date(d);
  if(isNaN(dt)) return d;
  return dt.toLocaleString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
}
function formatTime(d){
  const dt = new Date(d);
  if(isNaN(dt)) return '';
  return dt.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
}
function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function hexToRgba(hex, alpha){
  const bigint = parseInt(hex.slice(1),16);
  const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function statusPillHtml(status){
  const c = STATUS_COLORS[status] || '#4a92f0';
  return `<span class="status-pill" style="background:${hexToRgba(c,0.14)};color:${c};">${escapeHtml(status)}</span>`;
}
function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* =========================================================
   Modal open/close
   ========================================================= */
function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('[data-close]').forEach(el=>{
    el.addEventListener('click', ()=> closeModal(el.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov=>{
    ov.addEventListener('click', (e)=>{ if(e.target === ov) ov.classList.add('hidden'); });
  });
});
