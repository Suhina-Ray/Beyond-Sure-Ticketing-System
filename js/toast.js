/* =========================================================
   Toast notifications
   ========================================================= */
function showToast(message, type = 'info', duration = 4000){
  const container = document.getElementById('toastContainer');
  if(!container) return;

  const iconMap = { success: ICONS.check, error: ICONS.x, info: ICONS.info };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || ICONS.info}</div>
    <div class="toast-msg">${escapeHtml(message)}</div>
    <span class="toast-close">${ICONS.x}</span>
  `;

  const close = toast.querySelector('.toast-close');
  close.addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast){
  if(!toast.parentNode) return;
  toast.classList.add('leaving');
  setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 220);
}
