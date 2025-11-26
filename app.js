/* Local Storage Key */
const STORAGE_KEY = 'eathamozhi_blood_donors_v1';
let donors = [];

const $ = (s) => document.querySelector(s);

/* -------- LOAD & SAVE -------- */
function load() {
  try {
    donors = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    donors = [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}
function uid() {
  return 'd_' + Math.random().toString(36).slice(2, 9);
}

/* -------- UTILITIES -------- */
function computeAge(dobIso) {
  if (!dobIso) return '';
  const dob = new Date(dobIso);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/* -------- RENDER LIST -------- */
function render() {
  const list = $('#listSection');
  list.innerHTML = '';

  const search = $('#search').value.trim().toLowerCase();
  const blood = $('#bloodFilter').value;

  const filtered = donors.filter(d =>
    (!blood || d.bloodGroup === blood) &&
    (
      d.name.toLowerCase().includes(search) ||
      d.phone.toLowerCase().includes(search) ||
      d.location.toLowerCase().includes(search)
    )
  );

  filtered.forEach((d) => {
    const row = document.createElement('div');
    row.className = "card";
    row.innerHTML = `
      <div>
        <strong>${d.name}</strong> (${d.bloodGroup})<br>
        Age: ${computeAge(d.dob)}<br>
        Phone: ${d.phone}<br>
        Location: ${d.location}<br>
        Added: ${new Date(d.addedAt).toLocaleString()}
      </div>
      <div class="actions">
        <button class="primary btn-animated editBtn">Edit</button>
        <button class="danger btn-animated delBtn">Delete</button>
      </div>
    `;

    row.querySelector(".editBtn").onclick = () => openForm("edit", d.id);
    row.querySelector(".delBtn").onclick = () => removeDonor(d.id);

    list.appendChild(row);
  });
}

/* -------- FORM HANDLING -------- */
function openForm(mode, id) {
  $('#formDrawer').setAttribute("aria-hidden", "false");
  $('#donorForm').reset();
  $('#age').value = "";
  $('#deleteBtn').hidden = true;

  if (mode === "edit") {
    const d = donors.find(x => x.id === id);
    $('#name').value = d.name;
    $('#bloodGroup').value = d.bloodGroup;
    $('#dob').value = d.dob;
    $('#age').value = computeAge(d.dob);
    $('#phone').value = d.phone;
    $('#email').value = d.email;
    $('#location').value = d.location;
    $('#donorId').value = d.id;

    $('#deleteBtn').hidden = false;
    $('#deleteBtn').onclick = () => {
      if (confirm("Delete this donor?")) {
        removeDonor(d.id);
        closeForm();
      }
    };
  }
}

function closeForm() {
  $('#formDrawer').setAttribute("aria-hidden", "true");
}

/* -------- ADD / UPDATE DONOR -------- */
function addDonorFromForm() {
  const id = $('#donorId').value || uid();
  const name = $('#name').value.trim();
  const bloodGroup = $('#bloodGroup').value;
  const dob = $('#dob').value;
  const phone = $('#phone').value.trim();
  const email = $('#email').value.trim();
  const location = $('#location').value.trim();

  if (!name || !bloodGroup || !dob || !phone) {
    alert("Please fill all required fields.");
    return;
  }

  const index = donors.findIndex(d => d.id === id);
  const donor = {
    id,
    name,
    bloodGroup,
    dob,
    phone,
    email,
    location,
    addedAt: index >= 0 ? donors[index].addedAt : new Date().toISOString()
  };

  if (index >= 0) donors[index] = donor;
  else donors.unshift(donor);

  save();
  render();
  closeForm();

  /* -------- SEND EMAIL -------- */
  emailjs.send("blood-eathamozhi-service", "template_q56xd65", {
    name,
    bloodGroup,
    dob,
    phone,
    email,
    location,
    addedAt: new Date().toLocaleString()
  })
    .then(() => console.log("Email sent!"))
    .catch(err => console.error("Email failed:", err));
}

/* -------- DELETE DONOR -------- */
function removeDonor(id) {
  donors = donors.filter(d => d.id !== id);
  save();
  render();
}

/* -------- EVENTS -------- */
function bind() {
  $('#addBtn').onclick = () => openForm("add");
  $('#cancelBtn').onclick = closeForm;
  $('#donorForm').onsubmit = (e) => {
    e.preventDefault();
    addDonorFromForm();
  };
  $('#dob').onchange = () => $('#age').value = computeAge($('#dob').value);
  $('#search').oninput = render;
  $('#bloodFilter').onchange = render;
}

/* -------- INIT -------- */
load();
bind();
render();
