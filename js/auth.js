/* =========================================================
   Auth / Login  - now talks to /api/employees/login (real JWT auth)
   ========================================================= */
function isAdmin(){
  return currentUser && currentUser.role === 'Admin';
}

function showApp(){
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-main').classList.remove('hidden');
  document.getElementById('userNameLabel').textContent = currentUser.employee_name;
  document.getElementById('userAvatar').textContent = initials(currentUser.employee_name);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashboardGreeting').textContent = `${greet} - Organisation Overview`;

  // Show/hide Employees nav based on role
  const navEmp = document.getElementById('navEmployees');
  if(navEmp) navEmp.classList.toggle('hidden', !isAdmin());

  loadAllData();
  goToPage('dashboard');
}

async function loadAllData(){
  try{
    if(isAdmin()){
      await Promise.all([fetchEmployees(), fetchTickets()]);
      renderEmployees();
    } else {
      // Non-admins only load tickets and a minimal employee list for the assign-to dropdown
      await Promise.all([fetchEmployeesMinimal(), fetchTickets()]);
    }
  }catch(err){
    console.error('Failed to load data:', err);
    showToast('Could not load data from the server: ' + err.message, 'error');
  }
  populateAssigneeOptions();
  renderTickets();
  renderDashboard();
  runNotificationChecks();
  startNotificationPolling();
}

document.addEventListener('DOMContentLoaded', function(){
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    try{
      const data = await apiFetch('/api/employees/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(data.token);
      currentUser = data.employee;
      save(LS_USER, currentUser);
      showApp();
    }catch(err){
      loginError.textContent = err.message || 'Invalid email or password.';
      loginError.classList.remove('hidden');
    }finally{
      submitBtn.disabled = false;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async function(){
    try{ await apiFetch('/api/employees/logout', { method: 'POST' }); }catch(e){ /* token may already be stale - ignore */ }
    stopNotificationPolling();
    currentUser = null;
    setToken(null);
    localStorage.removeItem(LS_USER);
    document.getElementById('screen-main').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
  });

  // Resume session if we still have a token
  if(currentUser && getToken()){ showApp(); }
});
