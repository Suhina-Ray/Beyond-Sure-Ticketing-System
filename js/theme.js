/* =========================================================
   Theme (light / dark)
   ========================================================= */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? '🌙' : '☀️';
  const loginIcon = document.getElementById('themeIconLogin');
  const mainIcon = document.getElementById('themeIconMain');
  if(loginIcon) loginIcon.textContent = icon;
  if(mainIcon) mainIcon.textContent = icon;
  save(LS_THEME, theme);
}
function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', function(){
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(load(LS_THEME, prefersDark ? 'dark' : 'light'));
  document.getElementById('themeToggleLogin').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleMain').addEventListener('click', toggleTheme);
});
