/* Eathamozhi Blood Donors - Modern Version (Option A) */

const STORAGE_KEY = 'eathamozhi_blood_donors_v1';
const OWNER_KEY   = 'eathamozhi_my_donor_id';

let donors = [];
const $ = (s) => document.querySelector(s);

/* Load + Save */
function load(){
  donors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}
function uid(){
  return "d_" + Math.random().toString(36).slice(2,10);
}

/* OWNER HELPERS (for edit-only-by-creator) */
function getOwnerId(){
  return localStorage.getItem(OWNER_KEY);
}
function setOwnerId(id){
  localStorage.setItem(OWNER_KEY, id);
}

/* AGE */
function computeAge(dob){
  const d = new Date(dob);
  if (isNaN(d)) return "";
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

/* DATE FORMAT (DD/MM/YYYY) */
function formatDate(iso){
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-GB");
}

/* RELATIVE TIME ("2 days ago") */
function relativeTime(dateIso) {
  const now = new Date();
  const past = new Date(dateIso);
  if (isNaN(past)) return "";
  const seconds = Math.floor((now - past) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const key in intervals) {
    const value = Math.floor(seconds / intervals[key]);
    if (value >= 1) return rtf.format(-value, key);
  }
  return "just now";
}

/* RENDER LIST */
function render(){
  const sec = $("#listSection");
  sec.innerHTML = "";

  const q = ($("#search")?.value || "").toLowerCase();
  const bf = $("#bloodFilter")?.value || "";

  const filtered = donors.filter(d =>
    (!bf || d.bloodGroup === bf) &&
    (
      d.name.toLowerCase().includes(q) ||
      (d.phone || "").toLowerCase().includes(q) ||
      (d.location || "").toLowerCase().includes(q)
    )
  );

  const ownerId = getOwnerId();

  /* DESKTOP TABLE */
  if (window.innerWidth > 800){
    if (!filtered.length){
      sec.innerHTML = `<p style="text-align:center;color:#6b7280;font-size:0.9rem;">No donors found. Try a different search or add a new donor.</p>`;
      return;
    }

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

    filtered.forEach(d=>{
      const canEdit = ownerId === d.id;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.name}</td>
        <td>${d.bloodGroup}</td>
        <td>${computeAge(d.dob)}</td>
        <td>${d.phone}</td>
        <td>${d.location || "—"}</td>
        <td>
          ${formatDate(d.addedAt)}<br>
          <small style="color:#6b7280;">${relativeTime(d.addedAt)}</small>
        </td>
        <td>
          ${
            canEdit
              ? `<button class="primary btn-animated" style="padding:6px 10px;font-size:0.75rem;" onclick="openForm('edit','${d.id}')">Edit</button>`
              : `<span style="font-size:0.75rem;color:#9ca3af;">No access</span>`
          }
        </td>
      `;
      body.appendChild(tr);
    });

    sec.appendChild(t);
  }

  /* MOBILE CARD VIEW */
  else {
    if (!filtered.length){
      sec.innerHTML = `<p style="text-align:center;color:#6b7280;font-size:0.9rem;">No donors found. Tap + to add a donor.</p>`;
      return;
    }

    filtered.forEach(d=>{
      const canEdit = ownerId === d.id;
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="meta-main">
          <div class="badge" data-bg="${d.bloodGroup}">${d.bloodGroup}</div>
          <div class="meta-text">
            <strong>${d.name}</strong>
            <span>${computeAge(d.dob)} yrs • ${d.location || "—"}</span>
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
          ${
            canEdit
              ? `<button class="primary btn-animated" style="padding:6px 10px;font-size:0.8rem;" onclick="openForm('edit','${d.id}')">Edit</button>`
              : `<small style="color:#9ca3af;">View only</small>`
          }
        </div>
      `;
      sec.appendChild(card);
    });
  }
}

/* OPEN FORM */
function openForm(mode,id){
  const drawer = $("#formDrawer");
  drawer?.setAttribute("aria-hidden","false");
  $("#donorForm")?.reset();
  const deleteBtn = $("#deleteBtn");
  if (deleteBtn){
    deleteBtn.hidden = true;   // DELETE DISABLED
    deleteBtn.style.display = "none";
  }

  if (mode === "add"){
    $("#formTitle").textContent = "Add Donor";
    $("#donorId").value = "";
    $("#age").value = "";
  } else {
    const d = donors.find(x=>x.id===id);
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

function closeForm(){
  $("#formDrawer")?.setAttribute("aria-hidden","true");
}

/* SAVE */
$("#donorForm").addEventListener("submit", e=>{
  e.preventDefault();

  const id = $("#donorId").value || uid();
  const idx = donors.findIndex(d=>d.id===id);

  const rec = {
    id,
    name:$("#name").value.trim(),
    bloodGroup:$("#bloodGroup").value,
    dob:$("#dob").value,
    phone:$("#phone").value.trim(),
    email:$("#email").value.trim(),
    location:$("#location").value.trim(),
    addedAt: idx >= 0 ? donors[idx].addedAt : new Date().toISOString()
  };

  if (!rec.name || !rec.bloodGroup || !rec.dob || !rec.phone){
    alert("Please fill all required fields.");
    return;
  }

  if (idx >= 0){
    donors[idx] = rec;
  } else {
    donors.unshift(rec);
    // mark this device as the owner of this donor
    setOwnerId(id);
  }

  save();
  closeForm();
  render();
});

/* DELETE REMOVED – stub only */
function removeDonor(id){
  console.warn("Delete is disabled.");
}

/* HIDE DELETE BUTTON IN FORM (defensive) */
const deleteBtn = $("#deleteBtn");
if (deleteBtn) {
  deleteBtn.style.display = "none";
  deleteBtn.hidden = true;
}

/* AUTO AGE */
$("#dob").addEventListener("change",()=>{
  $("#age").value = computeAge($("#dob").value);
});

/* SEARCH & FILTER */
$("#search").addEventListener("input",render);
$("#bloodFilter").addEventListener("change",render);

/* EXPORT CSV */
$("#exportBtn").addEventListener("click", ()=>{
  const rows = [
    ["Name","Blood","DOB","Age","Phone","Email","Location","Added"],
    ...donors.map(d=>[
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

  const csv = rows.map(r=>r.join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "donors.csv";
  a.click();
});

/* ADD BUTTON + CANCEL BUTTON EVENTS */
$("#addBtn").addEventListener("click", () => openForm("add"));
$("#fabAdd").addEventListener("click", () => openForm("add"));
$("#cancelBtn").addEventListener("click", closeForm);

/* Re-render on resize so layout switches table <-> cards */
window.addEventListener("resize", render);

/* THEME TOGGLE */
(function initTheme(){
  const btn = $("#themeToggle");
  if (!btn) return;
  const saved = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", saved === "dark");
  btn.textContent = saved === "dark" ? "Light Mode" : "Dark Mode";

  btn.addEventListener("click", ()=>{
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    btn.textContent = isDark ? "Light Mode" : "Dark Mode";
  });
})();

/* INIT */
load();
if (donors.length === 0){
  donors = [{
    id: uid(),
    name:"Mohamed Shahid",
    bloodGroup:"B+",
    dob:"2004-06-25",
    phone:"+91 7339110968",
    email:"moh.shahid2004@gmail.com",
    location:"Eathamozhi",
    addedAt:new Date().toISOString()
  }];
  save();
}
render();
