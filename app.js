/* Eathamozhi Blood Donors - Final Verified Version */

const STORAGE_KEY = 'eathamozhi_blood_donors_v1';
const OWNER_KEY = 'eathamozhi_my_donor_id';

let donors = [];
const $ = (s) => document.querySelector(s);

/* LOAD & SAVE */
function load() {
  donors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}

/* OWNER HELP */
function getOwnerId() { return localStorage.getItem(OWNER_KEY); }
function setOwnerId(id) { localStorage.setItem(OWNER_KEY, id); }

function uid() { return "d_" + Math.random().toString(36).slice(2, 10); }

/* AGE */
function computeAge(dob) {
  const d = new Date(dob);
  if (isNaN(d)) return "";
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

/* DATE FORMAT */
function formatDate(iso) { return new Date(iso).toLocaleDateString("en-GB"); }

/* RELATIVE TIME */
function relativeTime(dateIso) {
  const now = new Date();
  const past = new Date(dateIso);
  const seconds = Math.floor((now - past) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const intervals = {
    year: 31536000, month: 2592000, week: 604800,
    day: 86400, hour: 3600, minute: 60, second: 1
  };

  for (const key in intervals) {
    const value = Math.floor(seconds / intervals[key]);
    if (value >= 1) return rtf.format(-value, key);
  }
  return "just now";
}

/* RENDER LIST */
function render() {
  const sec = $("#listSection");
  sec.innerHTML = "";

  const q = $("#search").value.toLowerCase();
  const bf = $("#bloodFilter").value;

  const filtered = donors.filter(d =>
    (!bf || d.bloodGroup === bf) &&
    (d.name.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q))
  );

  const ownerId = getOwnerId();

  /* Desktop table */
  if (window.innerWidth > 800) {
    const t = document.createElement("table");
    t.className = "table";
    t.innerHTML = `
      <thead><tr>
        <th>Name</th><th>Blood</th><th>Age</th>
        <th>Phone</th><th>Location</th>
        <th>Added</th><th>Edit</th>
      </tr></thead>
      <tbody></tbody>
    `;

    const body = t.querySelector("tbody");

    filtered.forEach(d => {
      const canEdit = ownerId === d.id;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.name}</td>
        <td>${d.bloodGroup}</td>
        <td>${computeAge(d.dob)}</td>
        <td>${d.phone}</td>
        <td>${d.location}</td>
        <td>
          ${formatDate(d.addedAt)}<br>
          <small>${relativeTime(d.addedAt)}</small>
        </td>
        <td>
          ${canEdit
          ? `<button class="primary" onclick="openForm('edit','${d.id}')">Edit</button>`
          : `<span style="color:#999;font-size:12px;">No Access</span>`}
        </td>
      `;
      body.appendChild(tr);
    });

    sec.appendChild(t);
  }

  /* Mobile cards */
  else {
    filtered.forEach(d => {
      const canEdit = ownerId === d.id;
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="meta-main">
          <div class="badge" data-bg="${d.bloodGroup}">${d.bloodGroup}</div>
          <div class="meta-text">
            <strong>${d.name}</strong>
            <span>${computeAge(d.dob)} yrs • ${d.location}</span>
          </div>
        </div>

        <div class="card-info-line">
          <strong>Phone:</strong> ${d.phone}<br>
          <strong>Email:</strong> ${d.email || "—"}<br>
          <strong>Added:</strong> ${formatDate(d.addedAt)}
          <small>(${relativeTime(d.addedAt)})</small>
        </div>

        <div class="card-footer">
          <small>ID: ${d.id}</small>
          ${canEdit
          ? `<button class="primary" onclick="openForm('edit','${d.id}')">Edit</button>`
          : `<span style="color:#999;font-size:12px;">View Only</span>`}
        </div>
      `;
      sec.appendChild(card);
    });
  }
}

/* OPEN FORM */
function openForm(mode, id) {
  $("#formDrawer").setAttribute("aria-hidden", "false");
  $("#donorForm").reset();

  if (mode === "add") {
    $("#formTitle").textContent = "Add Donor";
    $("#donorId").value = "";
    $("#age").value = "";
  }
  else {
    const d = donors.find(x => x.id === id);
    if (!d) return;
    $("#formTitle").textContent = "Edit Donor";

    $("#name").value = d.name;
    $("#bloodGroup").value = d.bloodGroup;
    $("#dob").value = d.dob;
    $("#age").value = computeAge(d.dob);
    $("#phone").value = d.phone;
    $("#email").value = d.email;
    $("#location").value = d.location;
    $("#donorId").value = d.id;
  }
}

function closeForm() {
  $("#formDrawer").setAttribute("aria-hidden", "true");
}

/* EMAILJS SEND (CONFIGURED WITH YOUR KEYS) */
function sendEmail(rec) {
  if (!window.emailjs || !emailjs.send) {
    console.warn("EmailJS unavailable — skipping email.");
    return;
  }

  emailjs.send("blood-eathamozhi", "template_q56xd65", {
    donor_name: rec.name,
    donor_blood: rec.bloodGroup,
    donor_phone: rec.phone,
    donor_email: rec.email || "Not Provided",
    donor_location: rec.location,
    donor_age: computeAge(rec.dob),
    donor_dob: rec.dob,
    added_date: formatDate(rec.addedAt)
  })
    .then(() => alert("📩 Email sent successfully!"))
    .catch(err => {
      console.error(err);
      alert("❌ Failed to send email.");
    });
}

/* SAVE FORM */
$("#donorForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = $("#donorId").value || uid();
  const idx = donors.findIndex(d => d.id === id);

  const rec = {
    id,
    name: $("#name").value.trim(),
    bloodGroup: $("#bloodGroup").value,
    dob: $("#dob").value,
    phone: $("#phone").value.trim(),
    email: $("#email").value.trim(),
    location: $("#location").value.trim(),
    addedAt: idx >= 0 ? donors[idx].addedAt : new Date().toISOString()
  };

  if (!rec.name || !rec.bloodGroup || !rec.dob || !rec.phone) {
    alert("Fill all required fields.");
    return;
  }

  const isNew = idx < 0;

  if (isNew) {
    donors.unshift(rec);
    setOwnerId(id);
    sendEmail(rec);
  }
  else donors[idx] = rec;

  save();
  closeForm();
  render();
});

/* AUTO AGE */
$("#dob").addEventListener("change", () => {
  $("#age").value = computeAge($("#dob").value);
});

/* SEARCH + FILTER */
$("#search").addEventListener("input", render);
$("#bloodFilter").addEventListener("change", render);

/* EXPORT CSV */
$("#exportBtn").addEventListener("click", () => {
  const rows = [
    ["Name", "Blood", "DOB", "Age", "Phone", "Email", "Location", "Added"],
    ...donors.map(d => [
      d.name,
      d.bloodGroup,
      d.dob,
      computeAge(d.dob),
      d.phone,
      d.email,
      d.location,
      formatDate(d.addedAt)
    ])
  ];

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "donors.csv";
  a.click();
});

/* BUTTONS */
$("#addBtn").addEventListener("click", () => openForm("add"));
$("#fabAdd").addEventListener("click", () => openForm("add"));
$("#cancelBtn").addEventListener("click", closeForm);

/* THEME TOGGLE */
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("#themeToggle").textContent =
    document.body.classList.contains("dark") ? "Light Mode" : "Dark Mode";
});

window.addEventListener("resize", render);

/* INIT */
load();
if (donors.length === 0) {
  donors = [{
    id: uid(),
    name: "Mohamed Shahid",
    bloodGroup: "B+",
    dob: "2004-06-25",
    phone: "+91 7339110968",
    email: "moh.shahid2004@gmail.com",
    location: "Eathamozhi",
    addedAt: new Date()
  },
  {

    id: uid(),
    name: "Mohamed Rashid",
    bloodGroup: "O+",
    dob: "2006-12-17",
    phone: "+91 9597380685",
    email: "moh.rashid20006@gmail.com",
    location: "Eathamozhi",
    addedAt:"28/11/2025"

  },
  {

    id: uid(),
    name: "Arshad",
    bloodGroup: "O+",
    dob: "2006-01-24",
    phone: "+91 9150103674",
    email: "arshadms127@gmail.com",
    location: "Eathamozhi",
    addedAt:"28/11/2025"

  },
  {

    id: uid(),
    name: "Anwar Raja",
    bloodGroup: "B+",
    dob: "2003-01-05",
    phone: "+91 9655893210",
    email: "anwarshazz20@gmail.com",
    location: "Kottar",
    addedAt: "28/11/2025"
  },
  {

    id: uid(),
    name: "Mohammed Irfan",
    bloodGroup: "O-",
    dob: "2004-11-18",
    phone: "+91 9655893210",
    email: "irfanirfan2w@gmail.com",
    location: "Kottar",
    addedAt: "29/11/2025"

  }

  ];
  save();
}
render();
