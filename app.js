/* Eathamozhi Blood Donors - enhanced with animations (ripple, enter/leave, drawer)
   - Age computed from DOB (keeps current age when rendered)
   - Responsive: table on wide, cards on narrow
   - Animated add/edit interactions (no delete)
   - Data persisted to localStorage
   - Sends email to moh.shahid2004@gmail.com on NEW donor
*/

const STORAGE_KEY = 'eathamozhi_blood_donors_v1';
let donors = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* --- Persistence --- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    donors = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Load error', e);
    donors = [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}
function uid() { return 'd_' + Math.random().toString(36).slice(2,9); }

/* --- Utilities --- */
function computeAge(dobIso) {
  if (!dobIso) return '';
  const dob = new Date(dobIso);
  if (isNaN(dob)) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : '';
}
function safe(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

/* ripple effect for buttons */
function attachRipples() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-animated, .icon-btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 1.2;
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size/2) + 'px';
    r.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  });
}

/* --- Rendering --- */
function render() {
  const listSection = $('#listSection');
  listSection.innerHTML = '';

  const q = $('#search').value.trim().toLowerCase();
  const bloodFilter = $('#bloodFilter').value;

  const filtered = donors.filter(d => {
    if (bloodFilter && d.bloodGroup !== bloodFilter) return false;
    if (!q) return true;
    return (d.name||'').toLowerCase().includes(q) ||
           (d.phone||'').toLowerCase().includes(q) ||
           (d.location||'').toLowerCase().includes(q);
  });

  if (window.innerWidth > 800) {
    // Table layout
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th><th>Blood</th><th>Age</th><th>Phone</th><th>Location</th><th>Added</th><th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    filtered.forEach((d, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${safe(d.name)}</td>
        <td><strong>${safe(d.bloodGroup)}</strong></td>
        <td>${computeAge(d.dob) || ''}</td>
        <td>${safe(d.phone)}</td>
        <td>${safe(d.location)}</td>
        <td>${new Date(d.addedAt).toLocaleString()}</td>
        <td class="actions"></td>
      `;
      // animate entries with slight stagger
      tr.classList.add('animate-in');
      tr.style.animationDelay = (idx * 40) + 'ms';

      const actions = tr.querySelector('.actions');
      const edit = makeBtn('Edit', () => openForm('edit', d.id), 'primary');
      // ⛔ No delete button
      actions.append(edit);

      tbody.appendChild(tr);
    });

    listSection.appendChild(table);
  } else {
    // Card layout
    filtered.forEach((d, idx) => {
      const card = document.createElement('article');
      card.className = 'card animate-in';
      card.style.animationDelay = (idx * 40) + 'ms';
      card.innerHTML = `
        <div class="meta">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="badge">${safe(d.bloodGroup)}</div>
            <div>
              <div style="font-weight:700">${safe(d.name)}</div>
              <div style="color:var(--muted);font-size:0.9rem">
                ${computeAge(d.dob) ? computeAge(d.dob) + ' yrs' : ''} · ${safe(d.location)}
              </div>
            </div>
          </div>

          <div style="color:var(--muted);font-size:0.9rem;margin-top:8px">
            Phone: ${safe(d.phone)}<br/>
            Email: ${safe(d.email)}<br/>
            Added: ${new Date(d.addedAt).toLocaleString()}
          </div>
        </div>
        <div class="actions">
          <button class="primary btn-animated">Edit</button>
        </div>
      `;
      const [editBtn] = card.querySelectorAll('.actions button');
      editBtn.addEventListener('click', () => openForm('edit', d.id));
      listSection.appendChild(card);
    });
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card animate-in';
    empty.style.textAlign = 'center';
    empty.innerHTML = `<div style="color:var(--muted)">No donors found — add one with the Add Donor button.</div>`;
    listSection.appendChild(empty);
  }
}

/* helper to create accessible buttons */
function makeBtn(text, onClick, type = 'primary') {
  const b = document.createElement('button');
  b.textContent = text;
  b.className = type === 'danger' ? 'danger btn-animated' : 'primary btn-animated';
  b.addEventListener('click', onClick);
  return b;
}

/* --- Form (drawer) --- */
function openForm(mode='add', id) {
  const drawer = $('#formDrawer');
  drawer.setAttribute('aria-hidden', 'false');
  const title = $('#formTitle');
  const donorId = $('#donorId');
  const saveBtn = $('#saveBtn');

  $('#donorForm').reset();
  $('#age').value = '';

  if (mode === 'add') {
    title.textContent = 'Add Donor';
    saveBtn.textContent = 'Add Donor';
    donorId.value = '';
  } else {
    title.textContent = 'Edit Donor';
    saveBtn.textContent = 'Update Donor';
    const donor = donors.find(x => x.id === id);
    if (!donor) {
      alert('Donor not found');
      return;
    }
    $('#name').value = donor.name || '';
    $('#bloodGroup').value = donor.bloodGroup || '';
    $('#dob').value = donor.dob || '';
    $('#age').value = computeAge(donor.dob) || '';
    $('#phone').value = donor.phone || '';
    $('#email').value = donor.email || '';
    $('#location').value = donor.location || '';
    donorId.value = donor.id;
  }
  // focus first input for keyboard users
  setTimeout(() => $('#name').focus(), 200);
}
function closeForm() {
  $('#formDrawer').setAttribute('aria-hidden', 'true');
}

/* --- Email sending --- */
function sendEmail(rec) {
  if (!window.emailjs) {
    console.warn('EmailJS not loaded; skipping email send.');
    return;
  }

  const templateParams = {
    donor_name: rec.name,
    donor_blood_group: rec.bloodGroup,
    donor_dob: rec.dob,
    donor_age: computeAge(rec.dob) || '',
    donor_phone: rec.phone,
    donor_email: rec.email || 'N/A',
    donor_location: rec.location || 'N/A',
    to_email: 'moh.shahid2004@gmail.com'
  };

  // Uses your service & template IDs
  emailjs
    .send('blood-eathamozhi', 'template_q56xd65', templateParams)
    .then((res) => {
      console.log('Email sent:', res.status, res.text);
    })
    .catch((err) => {
      console.error('Email send failed:', err);
    });
}

/* --- CRUD operations (no delete) --- */
function addDonorFromForm() {
  const id = $('#donorId').value || uid();
  const name = $('#name').value.trim();
  const bloodGroup = $('#bloodGroup').value;
  const dob = $('#dob').value;
  const phone = $('#phone').value.trim();
  const email = $('#email').value.trim();
  const location = $('#location').value.trim();

  if (!name || !bloodGroup || !dob || !phone) {
    alert('Please enter name, blood group, DOB and phone.');
    return;
  }

  const idx = donors.findIndex(d => d.id === id);
  const rec = {
    id,
    name,
    bloodGroup,
    dob,
    phone,
    email,
    location,
    addedAt: idx >= 0 ? donors[idx].addedAt : new Date().toISOString()
  };

  const isNew = idx < 0;

  if (idx >= 0) {
    donors[idx] = rec;
  } else {
    donors.unshift(rec);
  }

  save();
  render();
  closeForm();

  // Send email ONLY when a new donor is added
  if (isNew) {
    sendEmail(rec);
  }
}

/* --- Event bindings --- */
function bind() {
  $('#addBtn').addEventListener('click', () => openForm('add'));
  $('#cancelBtn').addEventListener('click', closeForm);

  $('#donorForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    addDonorFromForm();
  });

  $('#dob').addEventListener('change', () => {
    $('#age').value = computeAge($('#dob').value) || '';
  });

  $('#search').addEventListener('input', () => render());
  $('#bloodFilter').addEventListener('change', () => render());

  // Close drawer when clicking outside (desktop)
  document.addEventListener('click', (e) => {
    const drawer = $('#formDrawer');
    if (drawer.getAttribute('aria-hidden') === 'false') {
      const inside = drawer.contains(e.target) || $('#addBtn').contains(e.target);
      if (!inside && window.innerWidth > 800) closeForm();
    }
  });

  // responsive re-render on resize (debounced)
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(render, 160);
  });
}

/* --- Demo seed data --- */
function seedIfEmpty() {
  if (donors.length === 0) {
    donors = [
      {
        id: uid(),
        name: "Mohamed Shahid",
        bloodGroup: "B+",
        dob: "2004-06-25",
        phone: "+91 7339110968",
        email: "moh.shahid2004@gmail.com",
        location: "Eathamozhi",
        addedAt: new Date().toISOString()
      },
      {
        id: uid(),
        name: "Ravi K",
        bloodGroup: "A+",
        dob: "1988-11-05",
        phone: "+91 91234 56780",
        email: "",
        location: "Near Lake",
        addedAt: new Date().toISOString()
      }
    ];
    save();
  }
}

/* --- Console helpers --- */
window.EathamozhiDonors = {
  export: () => JSON.stringify(donors, null, 2),
  import: (json) => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (!Array.isArray(parsed)) throw new Error('Expected array');
      donors = parsed.map(p => ({ id: p.id || uid(), ...p }));
      save();
      render();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },
  clearAll: () => {
    if (confirm('Clear all donor data?')) {
      donors = [];
      save();
      render();
    }
  }
};

/* --- Initialize --- */
load();
seedIfEmpty();
attachRipples();
bind();
render();
