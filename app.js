/* Nagercoil / Eathamozhi Blood Donors - Final Version with Firebase Live Sync */

const STORAGE_KEY = 'eathamozhi_blood_donors_v1';
const OWNER_KEY = 'eathamozhi_my_donor_id';

let donors = [];
const $ = (s) => document.querySelector(s);

/* LOAD & SAVE (LocalStorage) */
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

/* DATE FORMAT (unused but handy) */
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
  if (!sec) return;
  sec.innerHTML = "";

  const q = ($("#search")?.value || "").toLowerCase();
  const bf = $("#bloodFilter")?.value || "";

  const filtered = donors.filter(d =>
    (!bf || d.bloodGroup === bf) &&
    (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q))
    )
  );

  const ownerId = getOwnerId();

  /* Desktop table */
  if (window.innerWidth > 800) {
    const t = document.createElement("table");
    t.className = "table";
    t.innerHTML = `
      <thead><tr>
        <th>Name</th><th>Blood</th><th>Age</th>
        <th>Location</th><th>District</th>
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
        <td>${d.location}</td>
        <td>Kanyakumari</td>
        <td><small>${relativeTime(d.addedAt)}</small></td>
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
          <strong>Location:</strong> ${d.location}<br>
          <strong>Email:</strong> ${d.email || "—"}<br>
          <strong>Added:</strong> <small>${relativeTime(d.addedAt)}</small>
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

/* OPEN FORM (global for inline onclick) */
window.openForm = function (mode, id) {
  $("#formDrawer").setAttribute("aria-hidden", "false");
  $("#donorForm").reset();

  if (mode === "add") {
    $("#formTitle").textContent = "Add Donor";
    $("#donorId").value = "";
    $("#age").value = "";
  } else {
    const d = donors.find(x => x.id === id);
    if (!d) return;

    $("#formTitle").textContent = "Edit Donor";
    $("#name").value = d.name;
    $("#bloodGroup").value = d.bloodGroup;
    $("#dob").value = d.dob;
    $("#age").value = computeAge(d.dob);
    $("#phone").value = d.phone;
    $("#email").value = d.email === "Not Provided" ? "" : d.email;
    $("#location").value = d.location;
    $("#donorId").value = d.id;
  }
};

function closeForm() {
  $("#formDrawer").setAttribute("aria-hidden", "true");
}

/* SAVE TO FIREBASE (instead of EmailJS) */
function sendEmail(rec) {
  // This function now syncs to Firebase Realtime Database
  if (!window._firebase) return; // Firebase not ready

  const { db, ref, set } = window._firebase;
  const donorRef = ref(db, "donors/" + rec.id);

  set(donorRef, rec).catch(err => {
    console.error("Error saving donor to Firebase:", err);
    // Optional: show a toast / alert
    // alert("Could not save to online database, but saved on this device.");
  });
}

/* LOAD FROM FIREBASE (live auto update) */
function startFirebaseSync() {
  if (!window._firebase) return; // Firebase not ready

  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  onValue(donorsRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      donors = [];
      save();
      render();
      return;
    }

    // Use Firebase as the source of truth
    donors = Object.values(data)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)); // latest first

    // Keep a local copy (optional)
    save();

    // Update UI
    render();
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
    phone: $("#phone").value.trim(), // saved (hidden in UI)
    email: ($("#email").value.trim() || "Not Provided"),
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
  } else {
    donors[idx] = rec;
  }

  // Local save
  save();

  // Online save
  sendEmail(rec);

  closeForm();
  render();
  alert("📩 Your request has been sent successfully. Thank you! ✔️");
});

/* AUTO AGE */
$("#dob").addEventListener("change", () => {
  $("#age").value = computeAge($("#dob").value);
});

/* SEARCH + FILTER */
$("#search").addEventListener("input", render);
$("#bloodFilter").addEventListener("change", render);

/* EXPORT CSV (no phone, add District) */
$("#exportBtn").addEventListener("click", () => {
  const rows = [
    ["Name", "Blood", "DOB", "Age", "Location", "District", "Email", "Added"],
    ...donors.map(d => [
      d.name,
      d.bloodGroup,
      d.dob,
      computeAge(d.dob),
      d.location,
      "Kanyakumari",
      d.email,
      relativeTime(d.addedAt)
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

/* THEME */
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("#themeToggle").textContent =
    document.body.classList.contains("dark") ? "Light Mode" : "Dark Mode";
});

window.addEventListener("resize", render);

/* ---------- INIT FLOW ---------- */

// 1) Load from localStorage (optional/offline)
load();

// 2) First render whatever we have locally
render();

// 3) Then sync with Firebase to load + auto-update donors (online)
startFirebaseSync();


//  If you want seed data only for testing, you can temporarily use this:

 if (donors.length === 0) {
   donors = [
     { id: uid(), name: "Test Donor", bloodGroup: "O+", dob: "2000-01-01",
       phone: "+91 0000000000", email: "test@example.com",
       location: "Nagercoil", addedAt: new Date().toISOString() }
   ];
   save();
   donors.forEach(sendEmail); // push once to Firebase
 }
 
