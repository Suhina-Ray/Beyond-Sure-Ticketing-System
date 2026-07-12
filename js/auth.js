/* =========================================================
   Auth / Login
   ========================================================= */
function showApp(){
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-main').classList.remove('hidden');
  document.getElementById('userNameLabel').textContent = currentUser.name;
  document.getElementById('userAvatar').textContent = initials(currentUser.name);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashboardGreeting').textContent = `${greet} — Organisation Overview`;

  populateAssigneeOptions();
  renderEmployees();
  renderTickets();
  renderDashboard();
  goToPage('dashboard');
}

document.addEventListener('DOMContentLoaded', function(){
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if(employees.length === 0){
      // First run: bootstrap an employee/admin record from these credentials
      const namePart = email.split('@')[0] || 'Admin';
      const name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const newEmp = { id: uid(), name: name, email: email, password: password, dob: '', insurances: 0 };
      employees.push(newEmp);
      save(LS_EMPLOYEES, employees);
      currentUser = { name: newEmp.name, email: newEmp.email };
      save(LS_USER, currentUser);
      showApp();
      return;
    }

    const match = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password);
    if(match){
      currentUser = { name: match.name, email: match.email };
      save(LS_USER, currentUser);
      showApp();
    } else {
      loginError.textContent = 'Invalid email or password.';
      loginError.classList.remove('hidden');
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', function(){
    currentUser = null;
    localStorage.removeItem(LS_USER);
    document.getElementById('screen-main').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    loginForm.reset();
    loginError.classList.add('hidden');
  });

  if(currentUser){ showApp(); }
});
