/* Nagercoil / Eathamozhi Blood Donors - Firebase Live Sync */

const OWNER_KEY = 'eathamozhi_my_donor_id';

let donors = [];
const $ = (s) => document.querySelector(s);

/* OWNER */
function getOwnerId() {
  return localStorage.getItem(OWNER_KEY);
}
function setOwnerId(id) {
  localStorage.setItem(OWNER_KEY, id);
}

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

/* RELATIVE TIME */
function relativeTime(dateIso) {
  if (!dateIso) return "";
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

/* RENDER */
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

  if (window.innerWidth > 800) {
    const t = document.createElement("table");
    t.className = "table";

    t.innerHTML = `
      <thead>
        <tr>
          <th>ID</th><th>Name</th><th>Blood</th><th>Age</th>
          <th>Location</th><th>District</th>
          <th>Added</th><th>Edit</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const body = t.querySelector("tbody");

    filtered.forEach(d => {
      const canEdit = ownerId === d.id;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.id}</td>
        <td>${d.name}</td>
        <td>${d.bloodGroup}</td>
        <td>${computeAge(d.dob)}</td>
        <td>${d.location}</td>
        <td>Kanyakumari</td>
        <td><small>${relativeTime(d.addedAt)}</small></td>
        <td>
          ${canEdit
            ? `<button class="primary" onclick="openForm('edit','${d.id}')">Edit</button>`
            : `<span style="color:#999;">No Access</span>`}
        </td>
      `;
      body.appendChild(tr);
    });

    sec.appendChild(t);
  } else {
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
          <strong>Added:</strong> ${relativeTime(d.addedAt)}
        </div>

        <div class="card-footer">
          <small>ID: ${d.id}</small>
          ${canEdit
            ? `<button class="primary" onclick="openForm('edit','${d.id}')">Edit</button>`
            : `<span style="color:#999;">View Only</span>`}
        </div>
      `;

      sec.appendChild(card);
    });
  }
}

/* FORM */
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

/* NEXT ID */
async function getNextId() {
  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  return new Promise(resolve => {
    onValue(donorsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        resolve("001");
        return;
      }

      const ids = Object.keys(data)
        .map(k => Number(k))
        .filter(n => !isNaN(n));

      const next = (Math.max(...ids) + 1).toString().padStart(3, "0");
      resolve(next);
    }, { onlyOnce: true });
  });
}

/* SAVE */
async function saveDonor(rec) {
  const { db, ref, set } = window._firebase;
  const donorRef = ref(db, "donors/" + rec.id);

  try {
    await set(donorRef, rec);
  } catch (err) {
    console.error(err);
    alert("❌ Error saving donor");
  }
}

/* FIREBASE SYNC */
function startFirebaseSync() {
  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  const sec = $("#listSection");

  sec.innerHTML = `
    <div class="loading-state">
      Loading donors...
    </div>
  `;

  onValue(donorsRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      donors = [];
      render();
      return;
    }

    donors = Object.values(data)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    render();
  });
}

/* SUBMIT */
$("#donorForm").addEventListener("submit", async e => {
  e.preventDefault();

  let id = $("#donorId").value;

  if (!id) {
    id = await getNextId();
  }

  const idx = donors.findIndex(d => d.id === id);

  const rec = {
    id,
    name: $("#name").value.trim(),
    bloodGroup: $("#bloodGroup").value,
    dob: $("#dob").value,
    phone: $("#phone").value.trim(),
    email: $("#email").value.trim() || "Not Provided",
    location: $("#location").value.trim(),
    addedAt: idx >= 0 ? donors[idx].addedAt : new Date().toISOString()
  };

  if (!rec.name || !rec.bloodGroup || !rec.dob || !rec.phone) {
    alert("Fill all required fields");
    return;
  }

  if (idx < 0) setOwnerId(id);

  await saveDonor(rec);

  closeForm();
  alert("✅ Saved successfully!");
});

/* EVENTS */
$("#dob").addEventListener("change", () => {
  $("#age").value = computeAge($("#dob").value);
});

$("#search").addEventListener("input", render);
$("#bloodFilter").addEventListener("change", render);

$("#addBtn").addEventListener("click", () => openForm("add"));
$("#fabAdd").addEventListener("click", () => openForm("add"));
$("#cancelBtn").addEventListener("click", closeForm);

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

/* INIT */
window.addEventListener("load", () => {
  render();

  let retry = 0;

  const checkFirebase = setInterval(() => {
    if (window._firebase) {
      clearInterval(checkFirebase);
      startFirebaseSync();
    } else {
      retry++;
      if (retry > 20) {
        clearInterval(checkFirebase);
        alert("⚠️ Firebase not loading");
      }
    }
  }, 500);
});