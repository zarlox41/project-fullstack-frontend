const API_BASE = 'https://TU_BACKEND_URL/api'; // <- cambiar por la URL de Render o localhost:4000/api

// --- Helper ---
function setToken(token) { localStorage.setItem('token', token); }
function getToken(){ return localStorage.getItem('token'); }
function authHeaders(){
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
function showMsg(msg, el='#msg'){ const node = document.querySelector(el); if(node){ node.textContent = msg; setTimeout(()=>node.textContent='',4000); } }

// --- Auth pages (index.html) ---
if (document.querySelector('#btn-login')) {
  document.getElementById('show-register').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('login-form').style.display='none';
    document.getElementById('register-form').style.display='';
  });
  document.getElementById('show-login').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('register-form').style.display='none';
    document.getElementById('login-form').style.display='';
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if(!res.ok) return showMsg(data.error || 'Error registro');
      setToken(data.token);
      location.href = '/dashboard.html';
    } catch (err) { showMsg('Error de red'); }
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!res.ok) return showMsg(data.error || 'Credenciales inválidas');
      setToken(data.token);
      location.href = '/dashboard.html';
    } catch (err) { showMsg('Error de red'); }
  });
}

// --- Dashboard functionality ---
if (document.querySelector('#create-act') || document.querySelector('#logout')) {
  // check auth
  if(!getToken()) { location.href = '/index.html'; }
  // fetch user info (not provided by API; token contains id; for UX simple: show token trimmed)
  document.getElementById('user-name').textContent = 'Usuario';

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    location.href = '/index.html';
  });

  async function loadActivities(){
    const res = await fetch(`${API_BASE}/activities`, { headers: { 'Content-Type': 'application/json', ...authHeaders() }});
    if(res.status === 401){ localStorage.removeItem('token'); location.href='/index.html'; return; }
    const activities = await res.json();
    const list = document.getElementById('activities-list');
    list.innerHTML = activities.length ? activities.map(a => `
      <div class="activity" data-id="${a._id}">
        <div class="meta">
          <strong>${a.title}</strong>
          <div>${a.description || ''}</div>
          <div><small>Estado: ${a.status}</small></div>
        </div>
        <div>
          <button class="btn-small" onclick="editAct('${a._id}')">Editar</button>
          <button class="btn-small" onclick="openInteract('${a._id}')">Interactuar</button>
          <button class="btn-small" onclick="deleteAct('${a._id}')">Borrar</button>
        </div>
      </div>`).join('') : '<p>No hay actividades aún.</p>';
  }

  window.editAct = async (id) => {
    const title = prompt('Nuevo título:');
    if(!title) return;
    const res = await fetch(`${API_BASE}/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', ...authHeaders() },
      body: JSON.stringify({ title })
    });
    if(res.ok) { loadActivities(); } else showMsg('Error al editar');
  };

  window.deleteAct = async (id) => {
    if(!confirm('¿Eliminar actividad?')) return;
    const res = await fetch(`${API_BASE}/activities/${id}`, { method:'DELETE', headers: { 'Content-Type':'application/json', ...authHeaders() }});
    if(res.ok) loadActivities(); else showMsg('Error al borrar');
  };

  window.openInteract = async (id) => {
    const res = await fetch(`${API_BASE}/activities/${id}`, { headers: { 'Content-Type':'application/json', ...authHeaders() }});
    if(!res.ok){ showMsg('Error al cargar actividad'); return; }
    const a = await res.json();
    const payload = a.interactivePayload || {};
    if(payload.question){
      const ans = prompt(payload.question);
      const correct = payload.answer;
      if(ans === String(correct)) {
        alert('¡Correcto! Marca como completada');
        await fetch(`${API_BASE}/activities/${id}`, {
          method:'PUT',
          headers: { 'Content-Type':'application/json', ...authHeaders() },
          body: JSON.stringify({ status: 'completed' })
        });
        loadActivities();
      } else {
        alert('Respuesta incorrecta, inténtalo de nuevo.');
      }
    } else alert('Actividad sin payload interactivo');
  };

  document.getElementById('create-act').addEventListener('click', async () => {
    const title = document.getElementById('act-title').value;
    const description = document.getElementById('act-desc').value;
    let interactivePayload = {};
    try {
      interactivePayload = JSON.parse(document.getElementById('act-payload').value || '{}');
    } catch (err) { showMsg('Payload JSON inválido'); return; }
    const res = await fetch(`${API_BASE}/activities`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', ...authHeaders() },
      body: JSON.stringify({ title, description, interactivePayload })
    });
    if(res.ok) {
      document.getElementById('act-title').value='';
      document.getElementById('act-desc').value='';
      document.getElementById('act-payload').value='';
      loadActivities();
    } else {
      const err = await res.json();
      showMsg(err.error || 'Error al crear actividad');
    }
  });

  // initial load
  loadActivities();
}
