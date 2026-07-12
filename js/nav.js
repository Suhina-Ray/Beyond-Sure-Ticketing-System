/* =========================================================
   Navigation
   ========================================================= */
const PAGES = ['dashboard','tickets','employees'];

function goToPage(target){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.page === target));
  PAGES.forEach(p => document.getElementById('page-' + p).classList.toggle('hidden', p !== target));
  if(target === 'dashboard') renderDashboard();
}

document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.nav-link').forEach(link=>{
    link.addEventListener('click', function(){ goToPage(this.dataset.page); });
  });
});
