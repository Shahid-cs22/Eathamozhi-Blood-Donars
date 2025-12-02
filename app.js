/* Nagercoil / Eathamozhi Blood Donors - Final Version with Firebase */

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
        <td>
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

/* LOAD FROM FIREBASE + MERGE WITH LOCAL (display previous data) */
function startFirebaseSync() {
  if (!window._firebase) return; // Firebase not ready

  const { db, ref, onValue } = window._firebase;
  const donorsRef = ref(db, "donors");

  onValue(donorsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const firebaseList = Object.values(data);

    // Merge local + firebase by id (firebase wins)
    const byId = new Map(donors.map(d => [d.id, d]));
    firebaseList.forEach(rec => {
      byId.set(rec.id, rec);
    });

    donors = Array.from(byId.values())
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)); // latest first

    save();
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
    phone: $("#phone").value.trim(), // saved but not shown
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

/* INIT + DEFAULT DATA */
// load();

// Default seed data only on very first visit (local empty)
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
      addedAt: new Date("2025-11-27").toISOString()
    },
    {
      id: uid(),
      name: "Arshad",
      bloodGroup: "O+",
      dob: "2006-01-24",
      phone: "+91 9150103674",
      email: "arshadms127@gmail.com",
      location: "Eathamozhi",
      addedAt: new Date("2025-11-28").toISOString()
    },
    {
      id: uid(),
      name: "Anwar Raja",
      bloodGroup: "B+",
      dob: "2003-01-05",
      phone: "+91 9655893210",
      email: "anwarshazz20@gmail.com",
      location: "Kottar",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Mohamed Rashid",
      bloodGroup: "O+",
      dob: "2006-12-17",
      phone: "+91 9597380685",
      email: "moh.rashid20006@gmail.com",
      location: "Eathamozhi",
      addedAt: new Date("2025-11-28").toISOString()
    },
    {
      id: uid(),
      name: "Mohammed Irfan",
      bloodGroup: "O-",
      dob: "2004-11-18",
      phone: "+91 9360533520",
      email: "irfanirfan2w@gmail.com",
      location: "Kottar",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Aakif Akram",
      bloodGroup: "O+",
      dob: "2005-07-15",
      phone: "+91 8148957620",
      email: "akramaakif@gmail.com",
      location: "Eathamozhi",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Matheesh",
      bloodGroup: "A+",
      dob: "2005-10-28",
      phone: "+91 8825872266",
      email: "Not Provided",
      location: "Eathamozhi-Nagercoil",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Sugendhiram",
      bloodGroup: "AB+",
      dob: "1991-10-28",
      phone: "+91 9524758714",
      email: "sugendraniee@gmail.com",
      location: "Eathamozhy",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Aswin",
      bloodGroup: "O+",
      dob: "2006-05-08",
      phone: "+91 7708702053",
      email: "aswinchellathurai@gmail.com",
      location: "Dharmapuram",
      addedAt: new Date("2025-11-29").toISOString()
    },
    {
      id: uid(),
      name: "Mohamed Saheen",
      bloodGroup: "B+",
      dob: "2008-03-16",
      phone: "+91 7550341718",
      email: "mohdsaheen92@gmail.com",
      location: "Thiruvithancode",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Jerson",
      bloodGroup: "O+",
      dob: "2004-12-25",
      phone: "+91 9344196172",
      email: "jersonjl127@gmail.com",
      location: "Vethanagar",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Sivan R",
      bloodGroup: "B+",
      dob: "2004-09-03",
      phone: "+91 7708292434",
      email: "sivanrocky999@gmail.com",
      location: "Kottar/ Nagarcoil",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Jakkulin Britto",
      bloodGroup: "B+",
      dob: "2003-09-27",
      phone: "+91 8870581052",
      email: "Not Provided",
      location: "Monday Market",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Sagoboo",
      bloodGroup: "A+",
      dob: "2005-01-22",
      phone: "+91 8248752802",
      email: "sagoboo2005@gmail.com",
      location: "Rajakkamangalam Thurai",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Ajai Kumar",
      bloodGroup: "A2B+",
      dob: "2005-07-17",
      phone: "+91 7418752951",
      email: "ajai99541@gmail.com",
      location: "Thikkanamcode",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Jude Sharuk",
      bloodGroup: "O+",
      dob: "2004-08-04",
      phone: "+91 9940253935",
      email: "judesharuckjude@gmail.com",
      location: "Muttom",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Majeed Alsaifullah",
      bloodGroup: "AB+",
      dob: "2006-04-30",
      phone: "+91 9345556281",
      email: "Not Provided",
      location: "Kanyakumari",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Nishan",
      bloodGroup: "AB+",
      dob: "2004-05-22",
      phone: "+91 9345639491",
      email: "esthakyesthaky427@gmail.com",
      location: "Kadiyapattanam",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Shaheed H",
      bloodGroup: "O+",
      dob: "2004-06-08",
      phone: "+91 7418073299",
      email: "Not Provided",
      location: "Eathamozhi",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Boothalingam",
      bloodGroup: "A+",
      dob: "1999-07-23",
      phone: "+91 6379170932",
      email: "sabarishtheroor@gmail.com",
      location: "Nagercoil",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Anu Prem",
      bloodGroup: "O+",
      dob: "2005-03-16",
      phone: "+91 9344717272",
      email: "anupremj@gmail.com",
      location: "Nagercoil",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Abishek T",
      bloodGroup: "B+",
      dob: "2004-03-09",
      phone: "+91 6381192131",
      email: "abishekk7432@gmail.com",
      location: "Erumbukadu-Nagercoil",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Thishon M",
      bloodGroup: "B-",
      dob: "2004-09-26",
      phone: "+91 7418061816",
      email: "thishon5746@gmail.com",
      location: "Koilvilai-Nagercoil",
      addedAt: new Date("2025-11-30").toISOString()
    },
    {
      id: uid(),
      name: "Anantha Krishnan",
      bloodGroup: "B+",
      dob: "1994-04-05",
      phone: "+91 8870536949",
      email: "ananthananthc9@gmail.com",
      location: "Thuckalay",
      addedAt: new Date("2025-12-01").toISOString()
    },
    {
      id: uid(),
      name: "Ragul R",
      bloodGroup: "A+",
      dob: "2005-01-07",
      phone: "+91 8220222351",
      email: "Not Provided",
      location: "Karungal",
      addedAt: new Date("2025-12-01").toISOString()
    },
    {
      id: uid(),
      name: "Lejo J",
      bloodGroup: "B+",
      dob: "2005-03-20",
      phone: "+91 7395918325",
      email: "Not Provided",
      location: "Thuckalay",
      addedAt: new Date("2025-12-01").toISOString()
    },
    {
      id: uid(),
      name: "Joseph Rishan V",
      bloodGroup: "O+",
      dob: "2005-02-02",
      phone: "+91 6385732349",
      email: "Not Provided",
      location: "Kadiyapattanam",
      addedAt: new Date("2025-12-01").toISOString()
    },
    {
      id: uid(),
      name: "Ragul R",
      bloodGroup: "A+",
      dob: "2004-03-18",
      phone: "+91 6383779166",
      email: "ramarragul72@gmail.com",
      location: "Ganapathipuram",
      addedAt: new Date("2025-12-01").toISOString()
    }
  ];

  save();
}

// First render whatever we have locally
render();

// Then sync with Firebase to load previous donors (online)
startFirebaseSync();
