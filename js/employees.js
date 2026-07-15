/* =========================================================
   Employees — now backed by /api/employees
   ========================================================= */
async function fetchEmployees(){
  const data = await apiFetch('/api/employees?all=true');
  employees = data.employees || [];
}

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
          <div class="mini-avatar">${initials(emp.employee_name)}</div>
          <div>
            <div>${escapeHtml(emp.employee_name)}</div>
            <div class="muted" style="font-size:11px;">${escapeHtml(emp.employee_code)}</div>
          </div>
        </div>
      </td>
      <td data-label="Email" class="muted">${escapeHtml(emp.email)}</td>
      <td data-label="Mobile" class="muted">${escapeHtml(emp.mobile || '—')}</td>
      <td data-label="Designation / Dept" class="muted">${escapeHtml(emp.designation || '—')}${emp.department ? ' · ' + escapeHtml(emp.department) : ''}</td>
      <td data-label="Status">
        <span class="status-pill" style="background:${emp.status === 'Active' ? hexToRgba('#12a862', 0.14) : hexToRgba('#e05353', 0.14)};color:${emp.status === 'Active' ? '#12a862' : '#e05353'};">${emp.status}</span>
      </td>
      <td data-label="Actions" style="text-align:right;">
        <button class="btn btn-ghost btn-sm" onclick="toggleEmployeeStatus(${emp.employee_id}, '${emp.status}')">${emp.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button>
      </td>
    </tr>
  `).join('');
}

// Backend has no DELETE /api/employees route — deactivating (status=Inactive)
// is the supported way to remove someone's access without breaking ticket
// history (tickets keep a foreign key to assign_to).
async function toggleEmployeeStatus(id, currentStatus){
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  if(!confirm(`${newStatus === 'Inactive' ? 'Deactivate' : 'Reactivate'} this employee?`)) return;

  const emp = employees.find(e => e.employee_id === id);
  if(!emp) return;

  try{
    await apiFetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        employee_name: emp.employee_name,
        email: emp.email,
        mobile: emp.mobile,
        designation: emp.designation,
        department: emp.department,
        status: newStatus
      })
    });
    await fetchEmployees();
    renderEmployees();
    populateAssigneeOptions();
    renderDashboard();
  }catch(err){
    alert(err.message);
  }
}

function populateAssigneeOptions(){
  const targets = ['tAssignedTo', 'filterTicketEmployee', 'viewTicketAssignedTo'];
  const activeEmployees = employees.filter(e => e.status === 'Active');
  targets.forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const current = sel.value;
    const placeholder = id === 'filterTicketEmployee' ? '<option value="">All Employees</option>' : '<option value="">Unassigned</option>';
    sel.innerHTML = placeholder + activeEmployees.map(e => `<option value="${e.employee_id}">${escapeHtml(e.employee_name)}</option>`).join('');
    sel.value = current;
  });
}

document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('openAddEmployee').addEventListener('click', () => {
    document.getElementById('employeeForm').reset();
    openModal('employeeModal');
  });

  document.getElementById('employeeForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const payload = {
      employee_code: document.getElementById('empCode').value.trim(),
      employee_name: document.getElementById('empName').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      mobile: document.getElementById('empMobile').value.trim(),
      password: document.getElementById('empPassword').value,
      designation: document.getElementById('empDesignation').value.trim(),
      department: document.getElementById('empDepartment').value.trim()
    };

    submitBtn.disabled = true;
    try{
      await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
      await fetchEmployees();
      renderEmployees();
      populateAssigneeOptions();
      renderDashboard();
      closeModal('employeeModal');
    }catch(err){
      alert(err.message);
    }finally{
      submitBtn.disabled = false;
    }
  });
});
