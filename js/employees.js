/* =========================================================
   Employees
   ========================================================= */
function renderEmployees(){
  const body = document.getElementById('employeeBody');
  const empty = document.getElementById('employeeEmpty');
  if(employees.length === 0){
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = employees.map(emp => `
    <tr class="data-row">
      <td data-label="Name">
        <div class="name-cell">
          <div class="mini-avatar">${initials(emp.name)}</div>
          <span>${escapeHtml(emp.name)}</span>
        </div>
      </td>
      <td data-label="Email" class="muted">${escapeHtml(emp.email)}</td>
      <td data-label="Date of Birth" class="muted">${formatDate(emp.dob)}</td>
      <td data-label="Insurances Issued"><span class="badge-count">${emp.insurances}</span></td>
      <td data-label="Actions" style="text-align:right;">
        <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${emp.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function deleteEmployee(id){
  if(!confirm('Remove this employee?')) return;
  employees = employees.filter(e => e.id !== id);
  save(LS_EMPLOYEES, employees);
  renderEmployees();
  populateAssigneeOptions();
  renderDashboard();
}

function populateAssigneeOptions(){
  const targets = ['tAssignedTo','filterTicketEmployee'];
  targets.forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const current = sel.value;
    const placeholder = id === 'filterTicketEmployee' ? '<option value="">All Employees</option>' : '<option value="">Unassigned</option>';
    sel.innerHTML = placeholder + employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('');
    sel.value = current;
  });
}

document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('openAddEmployee').addEventListener('click', ()=>{
    document.getElementById('employeeForm').reset();
    openModal('employeeModal');
  });

  document.getElementById('employeeForm').addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('empEmail').value.trim().toLowerCase();
    if(employees.some(emp => emp.email.toLowerCase() === email)){
      alert('An employee with this email already exists.');
      return;
    }
    employees.push({
      id: uid(),
      name: document.getElementById('empName').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      password: document.getElementById('empPassword').value,
      dob: document.getElementById('empDob').value,
      insurances: parseInt(document.getElementById('empInsurances').value || '0', 10)
    });
    save(LS_EMPLOYEES, employees);
    renderEmployees();
    populateAssigneeOptions();
    renderDashboard();
    closeModal('employeeModal');
  });
});
