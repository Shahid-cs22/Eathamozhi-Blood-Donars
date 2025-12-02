/* Nagercoil / Eathamozhi Blood Donors - Firebase Live Sync with Continuous IDs */

const OWNER_KEY = 'eathamozhi_my_donor_id';

let donors = [];
const $ = (s) => document.querySelector(s);

/* OWNER HELP */
function getOwnerId() { return localStorage.getItem(OWNER_KEY); }
function setOwnerId(id) { localStorage.setItem(OWNER_KEY, id); }

function uid() { return "d_" + Math.random().toString(36).slice(2, 10); } // no longer used, but kept if needed

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

/* CONTINUOUS NUMERIC IDs: get next ID from Firebase */
async function getNextId() {
  if (!window._firebase) {
    alert("Online database not ready. Please wait a moment and try again.");
    throw new Error("Firebase not ready");
  }

  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  return new Promise(resolve => {
    onValue(
      donorsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          resolve("1"); // first donor
          return;
        }

        const ids = Object.keys(data).map(k => Number(k)).filter(n => !isNaN(n));
        const maxId = ids.length ? Math.max(...ids) : 0;
        resolve(String(maxId + 1)); // always string ID
      },
      (error) => {
        console.error("Error reading donors for next ID:", error);
        resolve(String(Date.now())); // fallback unique ID
      },
      { onlyOnce: true }
    );
  });
}

/* SAVE TO FIREBASE */
function sendEmail(rec) {
  if (!window._firebase) {
    console.error("Firebase not ready, cannot save donor.");
    alert("Online database is not ready. Please try again after a moment.");
    return Promise.resolve();
  }

  const { db, ref, set } = window._firebase;
  const donorRef = ref(db, "donors/" + rec.id); // numeric string key: "1", "2", ...

  return set(donorRef, rec).catch(err => {
    console.error("Error saving donor to Firebase:", err);
    alert("Could not save to online database. Please try again.");
  });
}

/* LOAD FROM FIREBASE (live auto update on all devices) */
function startFirebaseSync() {
  if (!window._firebase) {
    console.warn("Firebase not ready when startFirebaseSync was called.");
    return;
  }

  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  onValue(donorsRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      donors = [];
      render();
      return;
    }

    donors = Object.values(data)
      .sort((a, b) => Number(a.id) - Number(b.id)); // sort by numeric ID: 1,2,3,...

    render();
  });
}

/* SAVE FORM */
$("#donorForm").addEventListener("submit", async e => {
  e.preventDefault();

  let id = $("#donorId").value; // if editing, will have value

  // If new donor → assign next numeric ID from Firebase
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
    setOwnerId(id); // owner can edit their own donor
  }

  // Write to Firebase – all devices will auto-update via startFirebaseSync()
  await sendEmail(rec);

  closeForm();

  // Optional: immediate local update
  if (isNew) {
    donors.push(rec);             // push then sort to keep ID order
    donors.sort((a, b) => Number(a.id) - Number(b.id));
  } else {
    donors[idx] = rec;
  }
  render();

  alert("📩 Donor saved successfully. Thank you! ✔️");
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
    ["ID", "Name", "Blood", "DOB", "Age", "Location", "District", "Email", "Added"],
    ...donors.map(d => [
      d.id,
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

/* ---------- INIT (NO local load()) ---------- */

window.addEventListener("load", () => {
  // Initial empty render
  render();

  // Wait for Firebase module to be ready, then start sync
  if (window._firebase) {
    startFirebaseSync();
  } else {
    const interval = setInterval(() => {
      if (window._firebase) {
        clearInterval(interval);
        startFirebaseSync();
      }
    }, 300);
  }
});
