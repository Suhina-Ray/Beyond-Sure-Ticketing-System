/* =========================================================
   Toasts - small non-blocking status messages, replaces alert()
   ========================================================= */
const TOAST_ICONS = { success: ICONS.checkCircle, error: ICONS.alertTriangle, info: ICONS.info };

function showToast(message, type = 'info', duration = 4000){
  const container = document.getElementById('toastContainer');
  if(!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <span class="toast-close">&times;</span>
  `;

  const remove = () => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close').addEventListener('click', remove);
  const timer = setTimeout(remove, duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));

  container.appendChild(toast);
}
