/* =========================================================
   API helper - talks to the Flask backend (app.py)
   Since app.py serves index.html/css/js itself (static_folder="."),
   we call the API with relative paths and it just works when you
   run `python app.py` from this folder.
   ========================================================= */
const API_BASE = '';

function getToken(){ return localStorage.getItem(LS_TOKEN); }
function setToken(token){
  if(token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
}

async function apiFetch(path, options = {}){
  const headers = Object.assign({}, options.headers || {});
  const isFormData = options.body instanceof FormData;
  if(!isFormData){
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if(token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));

  let data = null;
  try { data = await res.json(); } catch(e){ /* e.g. file download responses */ }

  if(!res.ok){
    const message = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
