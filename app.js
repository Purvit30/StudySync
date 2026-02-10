const TABS = ["assignments","checklist","timetable","pomodoro","calendar","progress","planner"];
const store = {
  prefix: "",
  get(key, def){ try{ return JSON.parse(localStorage.getItem(this.prefix + key)) ?? def; }catch{ return def; } },
  set(key, val){ localStorage.setItem(this.prefix + key, JSON.stringify(val)); },
  setPrefix(p){ this.prefix = p || ""; }
};

document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();
  initTabs();
  initAssignments();
  initChecklist();
  initTimetable();
  initPomodoro();
  initCalendarSharing();
  initProgress();
  initPlanner();
  initNotificationsPermission();
});

async function initAuth(){
  const gate = document.getElementById("auth");
  const shell = document.getElementById("app-shell");
  const nameEl = document.getElementById("auth-name");
  const emailEl = document.getElementById("auth-email");
  const passEl = document.getElementById("auth-password");
  const modeBtn = document.getElementById("auth-mode");
  const submitBtn = document.getElementById("auth-submit");
  const guestBtn = document.getElementById("auth-guest");
  const userEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const loginBtn = document.getElementById("login-btn");
  let mode = "signup";
  function setMode(m){
    mode = m;
    if(m==="signup"){
      modeBtn.textContent = "Switch to Sign In";
      submitBtn.textContent = "Create Account";
      nameEl.parentElement.style.display = "";
    } else {
      modeBtn.textContent = "Switch to Sign Up";
      submitBtn.textContent = "Sign In";
      nameEl.parentElement.style.display = "none";
    }
  }
  async function hash(s){
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  function getUser(email){
    try{ return JSON.parse(localStorage.getItem("user:"+email.toLowerCase())); }catch{ return null; }
  }
  function setCurrent(email){
    localStorage.setItem("auth:current", email);
    store.setPrefix("u:"+email.toLowerCase()+":");
  }
  async function handleSubmit(){
    const email = (emailEl.value || "").trim().toLowerCase();
    const password = passEl.value || "";
    if(!email || !password) return;
    localStorage.removeItem("admin:isAuthed");
    if(mode==="signup"){
      const name = (nameEl.value || "").trim();
      const h = await hash(email+":"+password);
      const isAdmin = email === "admin@studysync";
      const user = { email, name, hash: h, createdAt: Date.now(), isAdmin };
      localStorage.setItem("user:"+email, JSON.stringify(user));
      logEvent("user_signup", { email });
      setCurrent(email);
      userEl.textContent = name || email;
      location.hash = "#/app";
    } else {
      const user = getUser(email);
      if(!user){ logEvent("user_login_failure", { email, reason:"no_user" }); return; }
      if(user.isBlocked){ logEvent("user_login_failure", { email, reason:"blocked" }); alert("Your account is blocked by admin."); return; }
      const h = await hash(email+":"+password);
      if(h !== user.hash){ logEvent("user_login_failure", { email, reason:"bad_password" }); return; }
      setCurrent(email);
      userEl.textContent = user.name || email;
      logEvent("user_login_success", { email });
      location.hash = "#/app";
    }
  }
  function asGuest(){
    localStorage.removeItem("auth:current");
    localStorage.removeItem("admin:isAuthed");
    store.setPrefix("");
    userEl.textContent = "Guest";
    location.hash = "#/app";
  }
  function logout(){
    localStorage.removeItem("auth:current");
    localStorage.removeItem("admin:isAuthed");
    store.setPrefix("");
    userEl.textContent = "Guest";
    location.hash = "#/login";
  }
  const current = localStorage.getItem("auth:current");
  if(current){
    store.setPrefix("u:"+current.toLowerCase()+":");
    const user = getUser(current);
    userEl.textContent = (user && user.name) ? user.name : current;
    location.hash = "#/app";
  } else {
    location.hash = "#/login";
  }
  modeBtn.onclick = () => setMode(mode==="signup" ? "signin" : "signup");
  submitBtn.onclick = () => { handleSubmit(); };
  guestBtn.onclick = () => { asGuest(); };
  logoutBtn.onclick = () => {
    const currentEmail = localStorage.getItem("auth:current");
    if(currentEmail){ logout(); }
    else { location.hash = "#/login"; }
  };
  if(loginBtn) loginBtn.onclick = () => { location.hash = "#/login"; };
  setMode("signup");

  function route(){
    const h = location.hash || "#/login";
    const adminTab = document.getElementById("admin-tab");
    const currentEmail = localStorage.getItem("auth:current");
    const currentUser = currentEmail ? getUser(currentEmail) : null;
    const isAdmin = !!(currentUser && currentUser.isAdmin);
    adminTab.style.display = isAdmin ? "" : "none";
    if(h.startsWith("#/login")){
      shell.style.display = "none";
      gate.style.display = "";
      gate.setAttribute("aria-hidden","false");
      if(loginBtn){ loginBtn.style.display = ""; }
      if(logoutBtn){ logoutBtn.style.display = "none"; }
    } else if(h.startsWith("#/admin")){
      const adminAuthed = localStorage.getItem("admin:isAuthed")==="true";
      if(isAdmin || adminAuthed){
        gate.style.display = "none";
        gate.setAttribute("aria-hidden","true");
        shell.style.display = "";
        if(loginBtn){ loginBtn.style.display = "none"; }
        if(logoutBtn){ logoutBtn.style.display = ""; }
        document.querySelectorAll(".tab-content").forEach(sec => sec.classList.toggle("visible", sec.id === "admin"));
        document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === "admin"));
        initAdmin();
      } else {
        location.hash = "#/admin-login";
      }
    } else {
      gate.style.display = "none";
      gate.setAttribute("aria-hidden","true");
      shell.style.display = "";
      if(loginBtn){ loginBtn.style.display = "none"; }
      if(logoutBtn){ logoutBtn.style.display = ""; }
      // leaving admin pages clears temporary admin session
      if(!h.startsWith("#/admin")) localStorage.removeItem("admin:isAuthed");
    }
  }
  window.addEventListener("hashchange", route);
  route();
  initAdminAuthUI(hash);
  initReportUI();
}

function initAdminAuthUI(){
  const adminOverlay = document.getElementById("admin-auth");
  const adminLoginBtn = document.getElementById("admin-login");
  const adminUserEl = document.getElementById("admin-user");
  const adminPassEl = document.getElementById("admin-pass");
  if(!adminOverlay) return;
  async function hash(s){
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  (async () => {
    if(!localStorage.getItem("admin:cred")){
      const preset = await hash("Purvit:"+"Mihir18");
      localStorage.setItem("admin:cred", preset);
    }
  })();
  function routeAdmin(){
    const h = location.hash || "#/login";
    const authed = localStorage.getItem("admin:isAuthed")==="true";
    if(h.startsWith("#/admin-login")){
      adminOverlay.style.display = "grid";
      adminOverlay.setAttribute("aria-hidden","false");
    } else {
      adminOverlay.style.display = "none";
      adminOverlay.setAttribute("aria-hidden","true");
    }
  }
  window.addEventListener("hashchange", routeAdmin);
  routeAdmin();
  adminLoginBtn.addEventListener("click", async () => {
    const u = (adminUserEl.value||"").trim();
    const p = (adminPassEl.value||"").trim();
    if(!u || !p) return;
    const stored = localStorage.getItem("admin:cred");
    const attemptHash = await hash(u+":"+p);
    if(!stored){
      localStorage.setItem("admin:cred", attemptHash);
      localStorage.setItem("admin:isAuthed","true");
      logEvent("admin_login_success", { username: u });
      location.hash = "#/admin";
    } else if(stored === attemptHash){
      localStorage.setItem("admin:isAuthed","true");
      logEvent("admin_login_success", { username: u });
      location.hash = "#/admin";
    } else {
      logEvent("admin_login_failure", { username: u });
      alert("Invalid admin credentials");
    }
  });
}

function initReportUI(){
  const btn = document.getElementById("report-btn");
  const overlay = document.getElementById("report-overlay");
  const submit = document.getElementById("report-submit");
  const cancel = document.getElementById("report-cancel");
  const subjectEl = document.getElementById("report-subject");
  const categoryEl = document.getElementById("report-category");
  const detailsEl = document.getElementById("report-details");
  if(!btn) return;
  btn.addEventListener("click", () => {
    overlay.style.display = "grid";
    overlay.setAttribute("aria-hidden","false");
  });
  cancel.addEventListener("click", () => {
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden","true");
    subjectEl.value = "";
    detailsEl.value = "";
  });
  submit.addEventListener("click", () => {
    const subject = subjectEl.value.trim();
    const category = categoryEl.value;
    const details = detailsEl.value.trim();
    if(!subject || !details){
      alert("Please provide subject and details");
      return;
    }
    const currentEmail = localStorage.getItem("auth:current") || "guest";
    const reports = readJSON("admin:reports", []);
    const report = {
      id: crypto.randomUUID(),
      user: currentEmail,
      subject, category, details,
      route: location.hash || "#/app",
      ts: Date.now(),
      status: "open"
    };
    reports.push(report);
    localStorage.setItem("admin:reports", JSON.stringify(reports));
    logEvent("user_report_submitted", { user: currentEmail, subject, category });
    overlay.style.display = "none";
    subjectEl.value = ""; detailsEl.value = "";
    notify("Report submitted", "Admin will review your issue");
  });
}

function initAdmin(){
  const usersEl = document.getElementById("admin-users");
  const sumEl = document.getElementById("admin-summary");
  const reportsEl = document.getElementById("admin-reports");
  const refreshBtn = document.getElementById("admin-reports-refresh");
  const users = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith("user:")){
      try{
        const u = JSON.parse(localStorage.getItem(k));
        if(u && u.email) users.push(u);
      }catch{}
    }
  }
  users.sort((a,b)=> (a.name||a.email).localeCompare(b.name||b.email));
  const totals = users.reduce((acc,u)=>{
    const a = readJSON(`u:${u.email.toLowerCase()}:assignments`, []);
    acc.assignments += a.length;
    const submitted = a.filter(x => x.status==="submitted").length;
    acc.submitted += submitted;
    acc.inprogress += a.filter(x => x.status==="in_progress").length;
    acc.dueSoon += a.filter(x => new Date(x.due).getTime() - Date.now() < 24*3600000 && x.status!=="submitted").length;
    return acc;
  }, { assignments:0, submitted:0, inprogress:0, dueSoon:0 });
  sumEl.innerHTML = `
    <div>Users: <strong>${users.length}</strong></div>
    <div>Assignments: <strong>${totals.assignments}</strong></div>
    <div>Submitted: <strong>${totals.submitted}</strong></div>
    <div>In progress: <strong>${totals.inprogress}</strong></div>
    <div>Due soon: <strong>${totals.dueSoon}</strong></div>
  `;
  usersEl.innerHTML = "";
  users.forEach(u => {
    const a = readJSON(`u:${u.email.toLowerCase()}:assignments`, []);
    const tasks = readJSON(`u:${u.email.toLowerCase()}:tasks`, []);
    const sessions = readJSON(`u:${u.email.toLowerCase()}:sessions`, []);
    const blocked = !!u.isBlocked;
    const pct = a.length ? Math.round(a.filter(x=>x.status==="submitted").length / a.length * 100) : 0;
    const suspicious = isSuspicious(u.email);
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div>
          <strong>${u.name || u.email}</strong>
          <div class="badges">
            <span class="badge">${u.email}</span>
            <span class="badge ${u.isAdmin?"glow":""}">${u.isAdmin?"Admin":"User"}</span>
            ${blocked ? `<span class="badge danger">Blocked</span>` : ""}
            ${suspicious ? `<span class="badge">Suspicious</span>` : ""}
            <span class="badge">Assignments ${a.length}</span>
            <span class="badge">Tasks ${tasks.length}</span>
            <span class="badge">Sessions ${sessions.length}</span>
          </div>
        </div>
        <div class="row">
          <button data-act="impersonate" class="secondary">Impersonate</button>
          <button data-act="toggle-admin">${u.isAdmin ? "Remove Admin" : "Make Admin"}</button>
          <button data-act="toggle-block" class="danger">${blocked ? "Unblock" : "Block"}</button>
          <button data-act="delete" class="danger">Delete</button>
        </div>
      </div>
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
    `;
    li.querySelector("[data-act=impersonate]").addEventListener("click", () => {
      localStorage.setItem("auth:current", u.email);
      store.setPrefix("u:"+u.email.toLowerCase()+":");
      const userEl = document.getElementById("user-name");
      userEl.textContent = u.name || u.email;
      location.hash = "#/app";
    });
    li.querySelector("[data-act=toggle-admin]").addEventListener("click", () => {
      const key = "user:"+u.email.toLowerCase();
      const cur = readJSON(key, null);
      if(cur){
        cur.isAdmin = !cur.isAdmin;
        localStorage.setItem(key, JSON.stringify(cur));
        initAdmin();
      }
    });
    li.querySelector("[data-act=toggle-block]").addEventListener("click", () => {
      const key = "user:"+u.email.toLowerCase();
      const cur = readJSON(key, null);
      if(cur){
        cur.isBlocked = !cur.isBlocked;
        localStorage.setItem(key, JSON.stringify(cur));
        logEvent(cur.isBlocked ? "admin_block_user" : "admin_unblock_user", { email: u.email });
        initAdmin();
      }
    });
    li.querySelector("[data-act=delete]").addEventListener("click", () => {
      const prefix = "u:"+u.email.toLowerCase()+":";
      const keys = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && (k.startsWith(prefix) || k === "user:"+u.email.toLowerCase())){
          keys.push(k);
        }
      }
      keys.forEach(k => localStorage.removeItem(k));
      initAdmin();
    });
    usersEl.appendChild(li);
  });
  function renderReports(){
    const reports = readJSON("admin:reports", []);
    reportsEl.innerHTML = "";
    reports.slice().sort((a,b)=> b.ts - a.ts).forEach(r => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div>
            <strong>${r.subject}</strong>
            <div class="badges">
              <span class="badge">${r.category}</span>
              <span class="badge">${new Date(r.ts).toLocaleString()}</span>
              <span class="badge">${r.user}</span>
              <span class="badge">${r.status}</span>
            </div>
            <div style="margin-top:6px;">${r.details}</div>
          </div>
          <div class="row">
            <button data-act="resolve" class="secondary">${r.status==="open"?"Resolve":"Reopen"}</button>
            <button data-act="block" class="danger">Block User</button>
            <button data-act="delete" class="danger">Delete Report</button>
          </div>
        </div>
      `;
      li.querySelector("[data-act=resolve]").addEventListener("click", () => {
        r.status = r.status==="open" ? "resolved" : "open";
        const arr = readJSON("admin:reports", []);
        const idx = arr.findIndex(x => x.id===r.id);
        if(idx>=0){ arr[idx] = r; localStorage.setItem("admin:reports", JSON.stringify(arr)); }
        renderReports();
      });
      li.querySelector("[data-act=block]").addEventListener("click", () => {
        const key = "user:"+r.user.toLowerCase();
        const cur = readJSON(key, null);
        if(cur){
          cur.isBlocked = true;
          localStorage.setItem(key, JSON.stringify(cur));
          logEvent("admin_block_user", { email: r.user, reason: "report" });
          initAdmin();
        }
      });
      li.querySelector("[data-act=delete]").addEventListener("click", () => {
        const arr = readJSON("admin:reports", []);
        localStorage.setItem("admin:reports", JSON.stringify(arr.filter(x => x.id!==r.id)));
        renderReports();
      });
      reportsEl.appendChild(li);
    });
  }
  if(refreshBtn) refreshBtn.addEventListener("click", renderReports);
  renderReports();
}
function readJSON(key, def){
  try{ return JSON.parse(localStorage.getItem(key)) ?? def; }catch{ return def; }
}

function logEvent(type, data){
  const key = "admin:audit";
  const events = readJSON(key, []);
  events.push({ id: crypto.randomUUID(), type, data, ts: Date.now(), ua: navigator.userAgent });
  localStorage.setItem(key, JSON.stringify(events.slice(-500)));
}
function isSuspicious(email){
  const events = readJSON("admin:audit", []);
  const cutoff = Date.now() - 10*60*1000;
  const fails = events.filter(e => e.ts > cutoff && e.type === "user_login_failure" && e.data && e.data.email === email);
  return fails.length >= 3;
}

function initTabs(){
  const buttons = document.querySelectorAll(".tabs button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(sec => {
        sec.classList.toggle("visible", sec.id === target);
      });
    });
  });
}

// Assignments
let notifTimers = {};
function initAssignments(){
  const form = document.getElementById("assignment-form");
  const listEl = document.getElementById("assignment-list");
  const filter = document.getElementById("a-filter");
  const countEl = document.getElementById("a-count");
  let assignments = store.get("assignments", []);

  function save(){
    store.set("assignments", assignments);
    render();
    scheduleAllNotifications();
    updateProgressViews();
  }
  function render(){
    const q = (filter.value || "").toLowerCase();
    const now = Date.now();
    const filtered = assignments.filter(a => a.title.toLowerCase().includes(q) || (a.course||"").toLowerCase().includes(q));
    countEl.textContent = `${filtered.length} item(s)`;
    listEl.innerHTML = "";
    filtered.sort((a,b)=> new Date(a.due) - new Date(b.due));
    filtered.forEach(a => {
      const li = document.createElement("li");
      li.className = "item";
      const dueMs = new Date(a.due).getTime();
      const hrsLeft = Math.max(0, (dueMs - now)/3600000);
      const soon = hrsLeft < 24 && a.status !== "submitted";
      const badges = [
        a.course ? `<span class="badge">${a.course}</span>` : "",
        soon ? `<span class="badge">Due soon</span>` : "",
        `<span class="badge">${new Date(a.due).toLocaleString()}</span>`,
        `<span class="badge">${a.status.replace("_"," ")}</span>`
      ].join("");
      const progress = a.status === "submitted" ? 100 : a.status === "in_progress" ? 50 : 5;
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div>
            <strong>${a.title}</strong>
            <div class="badges">${badges}</div>
          </div>
          <div class="row">
            <button data-act="start">Start</button>
            <button data-act="submit" class="secondary">Mark Submitted</button>
            <button data-act="delete" class="danger">Delete</button>
          </div>
        </div>
        <div class="progress-bar"><span style="width:${progress}%"></span></div>
      `;
      li.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", () => {
          if(b.dataset.act === "delete"){
            assignments = assignments.filter(x => x.id !== a.id);
            cancelNotifications(a.id);
            save();
          } else if(b.dataset.act === "submit"){
            a.status = "submitted";
            save();
          } else if(b.dataset.act === "start"){
            a.status = "in_progress";
            save();
          }
        });
      });
    if(a.aiPlan){
      const btn = document.createElement("button");
      btn.textContent = "View AI Plan";
      btn.className = "secondary";
      btn.addEventListener("click", () => {
        const detail = document.createElement("div");
        detail.className = "item";
        const outlineHtml = a.aiPlan.outline.map(s => `<li>${s}</li>`).join("");
        const stepsHtml = a.aiPlan.steps.map(s => `<li>${s.text} • ${s.duration}h</li>`).join("");
        detail.innerHTML = `
          <div class="badge">AI Plan</div>
          <div class="grid" style="margin-top:8px;">
            <div>
              <div class="badge">Outline</div>
              <ul style="margin:8px 0 0; padding-left:18px;">${outlineHtml}</ul>
            </div>
            <div>
              <div class="badge">Steps</div>
              <ul style="margin:8px 0 0; padding-left:18px;">${stepsHtml}</ul>
            </div>
          </div>
        `;
        li.appendChild(detail);
        btn.remove();
      });
      li.querySelector(".row").appendChild(btn);
    }
      listEl.appendChild(li);
    });
  }
  function scheduleAllNotifications(){
    Object.values(notifTimers).forEach(t => clearTimeout(t));
    notifTimers = {};
    assignments.forEach(a => scheduleNotifications(a));
  }
  function scheduleNotifications(a){
    if(a.status === "submitted") return;
    const due = new Date(a.due).getTime();
    const reminders = a.reminders || {h24:true,h6:true,h1:true};
    const plan = [];
    if(reminders.h24) plan.push(due - 24*3600000);
    if(reminders.h6) plan.push(due - 6*3600000);
    if(reminders.h1) plan.push(due - 3600000);
    plan.forEach(ts => {
      const delay = ts - Date.now();
      if(delay > 0 && delay < 365*24*3600000){
        const id = `a-${a.id}-${ts}`;
        notifTimers[id] = setTimeout(() => {
          notify(`Reminder: ${a.title}`, `${a.course || "Assignment"} due at ${new Date(a.due).toLocaleString()}`);
        }, delay);
      }
    });
  }
  function cancelNotifications(id){
    Object.keys(notifTimers).filter(k => k.startsWith(`a-${id}-`)).forEach(k => {
      clearTimeout(notifTimers[k]);
      delete notifTimers[k];
    });
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("a-title").value.trim();
    const course = document.getElementById("a-course").value.trim();
    const due = document.getElementById("a-due").value;
    const effort = parseFloat(document.getElementById("a-effort").value) || 0;
    const status = document.getElementById("a-status").value;
    const reminders = {
      h24: document.getElementById("r-24h").checked,
      h6: document.getElementById("r-6h").checked,
      h1: document.getElementById("r-1h").checked
    };
    if(!title || !due) return;
    const a = { id: crypto.randomUUID(), title, course, due, effort, status, reminders };
    assignments.push(a);
    save();
    form.reset();
  });
  filter.addEventListener("input", render);
  render();
  scheduleAllNotifications();
  setupAI();

  function setupAI(){
    const topicEl = document.getElementById("ai-topic");
    const selEl = document.getElementById("ai-assignment");
    const genBtn = document.getElementById("ai-generate");
    const toChecklistBtn = document.getElementById("ai-to-checklist");
    const toPlannerBtn = document.getElementById("ai-to-planner");
    const outEl = document.getElementById("ai-output");
    if(!topicEl || !selEl || !genBtn || !outEl) return;
    selEl.innerHTML = "";
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "None (keep plan separate)";
    selEl.appendChild(optNone);
    assignments.filter(a => a.status !== "submitted").forEach(a => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = `${a.course ? a.course + " • " : ""}${a.title}`;
      selEl.appendChild(o);
    });
    let currentPlan = null;
    function renderPlan(plan){
      outEl.innerHTML = "";
      const li = document.createElement("li");
      li.className = "item";
      const outlineHtml = plan.outline.map(s => `<li>${s}</li>`).join("");
      const questionsHtml = plan.keyQuestions.map(q => `<li>${q}</li>`).join("");
      const stepsHtml = plan.steps.map(s => `<li>${s.text} • ${s.duration}h</li>`).join("");
      const queriesHtml = plan.queries.map(q => `<li><a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank">${q}</a></li>`).join("");
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div><strong>AI Plan for:</strong> ${plan.topic}</div>
          <div class="badges"><span class="badge">${plan.totalHours}h suggested</span></div>
        </div>
        <div class="grid">
          <div>
            <div class="badge">Outline</div>
            <ul style="margin:8px 0 0; padding-left:18px;">${outlineHtml}</ul>
          </div>
          <div>
            <div class="badge">Key Questions</div>
            <ul style="margin:8px 0 0; padding-left:18px;">${questionsHtml}</ul>
          </div>
        </div>
        <div style="margin-top:8px;">
          <div class="badge">Suggested Steps</div>
          <ul style="margin:8px 0 0; padding-left:18px;">${stepsHtml}</ul>
        </div>
        <div style="margin-top:8px;">
          <div class="badge">Research Queries</div>
          <ul style="margin:8px 0 0; padding-left:18px;">${queriesHtml}</ul>
        </div>
      `;
      outEl.appendChild(li);
    }
    genBtn.onclick = () => {
      const topic = (topicEl.value || "").trim();
      if(!topic) return;
      const assignId = selEl.value;
      let effort = 2;
      let due = new Date(Date.now()+3*24*3600000).toISOString();
      let target = null;
      if(assignId){
        target = assignments.find(a => a.id === assignId);
        if(target){
          effort = Number(target.effort || 2);
          due = target.due;
        }
      }
      const plan = generateAIPlan(topic, effort, due);
      currentPlan = plan;
      toChecklistBtn.disabled = false;
      toPlannerBtn.disabled = false;
      if(target){
        target.aiPlan = plan;
        save();
      }
      renderPlan(plan);
      notify("AI plan generated", "Outline, steps and queries ready");
    };
    toChecklistBtn.onclick = () => {
      if(!currentPlan) return;
      const tasks = store.get("tasks", []);
      currentPlan.steps.forEach(s => tasks.push({ id: crypto.randomUUID(), text: s.text, done:false }));
      store.set("tasks", tasks);
      initChecklist();
      notify("Tasks added", "Checklist updated");
    };
    toPlannerBtn.onclick = () => {
      if(!currentPlan) return;
      const blocks = schedulePlanBlocks(currentPlan);
      const existing = store.get("plannerBlocks", []);
      store.set("plannerBlocks", existing.concat(blocks));
      initPlanner();
      notify("Blocks scheduled", "Planner updated");
    };
  }
}

// Checklist
function initChecklist(){
  const input = document.getElementById("task-input");
  const addBtn = document.getElementById("task-add");
  const listEl = document.getElementById("task-list");
  const statsEl = document.getElementById("task-stats");
  const clearBtn = document.getElementById("task-clear");
  let tasks = store.get("tasks", []);

  function save(){ store.set("tasks", tasks); render(); }
  function render(){
    listEl.innerHTML = "";
    tasks.forEach(t => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <label class="row" style="gap:8px;">
            <input type="checkbox" ${t.done ? "checked":""}>
            <span>${t.text}</span>
          </label>
          <div class="row">
            <button data-act="delete" class="danger">Delete</button>
          </div>
        </div>
      `;
      li.querySelector("input").addEventListener("change", (e) => {
        t.done = e.target.checked;
        save();
      });
      li.querySelector("[data-act=delete]").addEventListener("click", () => {
        tasks = tasks.filter(x => x.id !== t.id);
        save();
      });
      listEl.appendChild(li);
    });
    const done = tasks.filter(t => t.done).length;
    statsEl.textContent = `${done}/${tasks.length} completed`;
  }
  addBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if(!text) return;
    tasks.push({ id: crypto.randomUUID(), text, done:false });
    input.value = "";
    save();
  });
  clearBtn.addEventListener("click", () => {
    tasks = tasks.filter(t => !t.done);
    save();
  });
  render();
}

// Timetable
function initTimetable(){
  const form = document.getElementById("session-form");
  const grid = document.getElementById("timetable-grid");
  let sessions = store.get("sessions", []);
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  function save(){ store.set("sessions", sessions); render(); }
  function render(){
    grid.innerHTML = "";
    days.forEach(d => {
      const col = document.createElement("div");
      col.className = "col";
      const head = document.createElement("h3");
      head.textContent = d;
      head.style.marginTop = "0";
      col.appendChild(head);
      sessions.filter(s => s.day===d).sort((a,b)=> a.start.localeCompare(b.start)).forEach(s => {
        const el = document.createElement("div");
        el.className = "session";
        el.innerHTML = `
          <div class="time">${s.start}–${s.end}</div>
          <div>${s.focus}</div>
          <div class="row">
            <button class="danger">Remove</button>
          </div>
        `;
        el.querySelector("button").addEventListener("click", () => {
          sessions = sessions.filter(x => x.id !== s.id);
          save();
        });
        col.appendChild(el);
      });
      grid.appendChild(col);
    });
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const day = document.getElementById("s-day").value;
    const start = document.getElementById("s-start").value;
    const end = document.getElementById("s-end").value;
    const focus = document.getElementById("s-focus").value.trim();
    if(!day || !start || !end) return;
    sessions.push({ id: crypto.randomUUID(), day, start, end, focus });
    save();
    form.reset();
  });
  render();
}

// Pomodoro
function initPomodoro(){
  const focusEl = document.getElementById("p-focus");
  const shortEl = document.getElementById("p-short");
  const longEl = document.getElementById("p-long");
  const everyEl = document.getElementById("p-every");
  const phaseEl = document.getElementById("p-phase");
  const timeEl = document.getElementById("p-time");
  const startBtn = document.getElementById("p-start");
  const pauseBtn = document.getElementById("p-pause");
  const resetBtn = document.getElementById("p-reset");
  const sessionsEl = document.getElementById("p-sessions");
  let timer = null, remaining = 0, phase = "Ready", cycles = 0;
  function setPhase(p, mins){
    phase = p;
    remaining = Math.round(mins*60);
    phaseEl.textContent = p;
    updateTime();
  }
  function updateTime(){
    const m = Math.floor(remaining/60).toString().padStart(2,"0");
    const s = Math.floor(remaining%60).toString().padStart(2,"0");
    timeEl.textContent = `${m}:${s}`;
  }
  function tick(){
    if(remaining <= 0){
      clearInterval(timer); timer = null;
      notify(`${phase} finished`, "Time to switch!");
      if(phase === "Focus"){
        cycles += 1;
        sessionsEl.textContent = String(cycles);
        const every = Number(everyEl.value);
        if(cycles % every === 0){
          setPhase("Long Break", Number(longEl.value));
        } else {
          setPhase("Short Break", Number(shortEl.value));
        }
      } else {
        setPhase("Focus", Number(focusEl.value));
      }
      start();
      return;
    }
    remaining -= 1;
    updateTime();
  }
  function start(){
    if(timer) return;
    if(phase === "Ready") setPhase("Focus", Number(focusEl.value));
    timer = setInterval(tick, 1000);
  }
  function pause(){ if(timer){ clearInterval(timer); timer = null; } }
  function reset(){ pause(); cycles=0; sessionsEl.textContent="0"; setPhase("Ready",0); }
  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", pause);
  resetBtn.addEventListener("click", reset);
  setPhase("Ready", 0);
}

// Calendar sharing
function initCalendarSharing(){
  const exportBtn = document.getElementById("cal-export");
  const shareBtn = document.getElementById("cal-share");
  const importText = document.getElementById("cal-import");
  const importBtn = document.getElementById("cal-import-btn");
  exportBtn.addEventListener("click", () => {
    const assignments = store.get("assignments", []);
    const ics = buildICS(assignments);
    const blob = new Blob([ics], {type: "text/calendar"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studysync-deadlines.ics";
    a.click();
    URL.revokeObjectURL(url);
  });
  shareBtn.addEventListener("click", () => {
    const assignments = store.get("assignments", []);
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(assignments))));
    const link = `${location.origin}${location.pathname}#share=${payload}`;
    navigator.clipboard.writeText(payload).then(() => {
      notify("Share code copied", "Send this code to classmates");
    }).catch(()=>{});
    console.log("Share link:", link);
    alert("Share code copied to clipboard.\nPaste into classmates' app to import.");
  });
  importBtn.addEventListener("click", () => {
    const code = importText.value.trim();
    if(!code) return;
    try{
      const json = decodeURIComponent(escape(atob(code)));
      const imported = JSON.parse(json);
      const mine = store.get("assignments", []);
      const merged = mergeAssignments(mine, imported);
      store.set("assignments", merged);
      notify("Deadlines imported", "Class calendar merged");
      location.hash = "";
      // trigger rerender
      initAssignments();
      initProgress();
    }catch(e){
      alert("Invalid share code");
    }
  });
  // auto import from hash if present
  if(location.hash.startsWith("#share=")){
    const code = location.hash.slice(7);
    try{
      const json = decodeURIComponent(escape(atob(code)));
      const imported = JSON.parse(json);
      const mine = store.get("assignments", []);
      const merged = mergeAssignments(mine, imported);
      store.set("assignments", merged);
      notify("Deadlines imported", "Class calendar merged");
      location.hash = "";
      initAssignments();
      initProgress();
    }catch{}
  }
}
function mergeAssignments(a, b){
  const byKey = {};
  [...a, ...b].forEach(x => {
    const key = `${(x.course||"").toLowerCase()}|${x.title.toLowerCase()}|${x.due}`;
    if(!byKey[key]) byKey[key] = x;
  });
  return Object.values(byKey);
}
function buildICS(assignments){
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudySync//Deadlines//EN"
  ];
  assignments.forEach(a => {
    const dt = new Date(a.due);
    const dtStamp = toICSDate(new Date());
    const dtStart = toICSDate(dt);
    const uid = a.id || `${a.title}-${dtStart}@studysync`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`SUMMARY:${escapeICS(`${a.course ? a.course + ": " : ""}${a.title}`)}`);
    lines.push(`DESCRIPTION:${escapeICS("Assignment deadline")}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function toICSDate(d){
  const pad = n => String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function escapeICS(s){
  return s.replace(/[\n\r]/g, "\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
}

// Progress
function initProgress(){
  const sumEl = document.getElementById("progress-summary");
  const listEl = document.getElementById("progress-list");
  const assignments = store.get("assignments", []);
  const total = assignments.length;
  const submitted = assignments.filter(a => a.status === "submitted").length;
  const inprog = assignments.filter(a => a.status === "in_progress").length;
  const dueSoon = assignments.filter(a => new Date(a.due).getTime() - Date.now() < 24*3600000 && a.status !== "submitted").length;
  const pct = total ? Math.round((submitted/total)*100) : 0;
  sumEl.innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <div>Total: <strong>${total}</strong></div>
      <div>Submitted: <strong>${submitted}</strong></div>
      <div>In progress: <strong>${inprog}</strong></div>
      <div>Due soon: <strong>${dueSoon}</strong></div>
    </div>
    <div class="progress-bar"><span style="width:${pct}%"></span></div>
  `;
  listEl.innerHTML = "";
  assignments.slice().sort((a,b)=> new Date(a.due)-new Date(b.due)).forEach(a => {
    const li = document.createElement("li");
    li.className = "item";
    const progress = a.status === "submitted" ? 100 : a.status === "in_progress" ? 50 : 5;
    li.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div>
          <strong>${a.title}</strong>
          <div class="badges">
            ${a.course ? `<span class="badge">${a.course}</span>` : ""}
            <span class="badge">${new Date(a.due).toLocaleString()}</span>
            <span class="badge">${a.status.replace("_"," ")}</span>
          </div>
        </div>
        <div class="row">
          <button data-act="submit" class="secondary">Mark Submitted</button>
        </div>
      </div>
      <div class="progress-bar"><span style="width:${progress}%"></span></div>
    `;
    li.querySelector("[data-act=submit]").addEventListener("click", () => {
      a.status = "submitted";
      const all = store.get("assignments", []);
      const idx = all.findIndex(x => x.id === a.id);
      if(idx >= 0){ all[idx] = a; store.set("assignments", all); }
      initProgress();
      initAssignments();
    });
    listEl.appendChild(li);
  });
}
function updateProgressViews(){
  initProgress();
}

// Stress-reducing planner
function initPlanner(){
  const planBtn = document.getElementById("plan-week");
  const clearBtn = document.getElementById("planner-clear");
  const out = document.getElementById("planner-output");
  function render(blocks){
    out.innerHTML = "";
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    days.forEach(d => {
      const col = document.createElement("div");
      col.className = "col";
      const head = document.createElement("h3");
      head.textContent = d;
      head.style.marginTop = "0";
      col.appendChild(head);
      blocks.filter(b => b.day===d).forEach(b => {
        const el = document.createElement("div");
        el.className = "session";
        el.innerHTML = `
          <div class="time">${b.start}–${b.end}</div>
          <div>${b.title}</div>
        `;
        col.appendChild(el);
      });
      out.appendChild(col);
    });
  }
  planBtn.addEventListener("click", () => {
    const assignments = store.get("assignments", []).filter(a => a.status !== "submitted");
    const blocks = planBalanced(assignments);
    store.set("plannerBlocks", blocks);
    render(blocks);
    notify("Weekly plan created", "Balanced Pomodoro blocks scheduled");
  });
  clearBtn.addEventListener("click", () => {
    store.set("plannerBlocks", []);
    render([]);
  });
  render(store.get("plannerBlocks", []));
}
function planBalanced(assignments){
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0,0,0,0);
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const dailySlots = days.map(d => ({ day:d, slots: buildSlots(d) }));
  const items = assignments.slice().sort((a,b)=> new Date(a.due)-new Date(b.due)).map(a => ({
    id: a.id, title: `${a.course ? a.course + ": " : ""}${a.title}`, effort: Math.max(1, Math.round((a.effort||2)*2)), // effort in 30-min blocks
    due: new Date(a.due)
  }));
  const blocks = [];
  items.forEach(item => {
    let remaining = item.effort;
    for(let dayIdx=0; dayIdx<dailySlots.length && remaining>0; dayIdx++){
      const day = dailySlots[dayIdx];
      for(let s of day.slots){
        if(remaining<=0) break;
        if(!s.booked){
          s.booked = true;
          blocks.push({ day: day.day, start: s.start, end: s.end, title: item.title });
          remaining -= 1;
        }
      }
    }
  });
  return blocks;
}
function buildSlots(day){
  const slots = [];
  let hour = 9;
  while(hour < 21){
    const start = `${String(hour).padStart(2,"0")}:00`;
    const end = `${String(hour).padStart(2,"0")}:30`;
    slots.push({ start, end, booked:false });
    const start2 = `${String(hour).padStart(2,"0")}:30`;
    const end2 = `${String(hour+1).padStart(2,"0")}:00`;
    slots.push({ start:start2, end:end2, booked:false });
    hour += 1;
  }
  if(day === "Saturday" || day === "Sunday"){
    slots.splice(0,4);
    slots.splice(-4,4);
  }
  return slots;
}

// Notifications
function initNotificationsPermission(){
  const btn = document.getElementById("notif-permission");
  btn.addEventListener("click", async () => {
    try{
      const res = await Notification.requestPermission();
      if(res === "granted") notify("Notifications enabled", "StudySync can send reminders");
    }catch{}
  });
}
function notify(title, body){
  if("Notification" in window && Notification.permission === "granted"){
    new Notification(title, { body });
  }
}

function generateAIPlan(topic, effortHours, dueStr){
  const t = topic.toLowerCase();
  const type = t.includes("lab") ? "lab" : t.includes("report") ? "report" : t.includes("design") ? "design" : t.includes("presentation") ? "presentation" : "research";
  const baseOutline = {
    lab: ["Title & Objective","Background","Materials/Setup","Procedure","Results","Analysis","Conclusion","References"],
    report: ["Abstract","Introduction","Methodology","Results","Discussion","Conclusion","References"],
    design: ["Problem Definition","Requirements","Concepts","Selection & Justification","Detailed Design","Validation","Conclusion"],
    presentation: ["Title Slide","Agenda","Context","Method/Approach","Findings","Implications","Q&A"],
    research: ["Problem Statement","Literature Review","Method/Approach","Experiments/Analysis","Findings","Conclusion","Future Work"]
  }[type];
  const baseSteps = [
    { text: "Clarify assignment requirements", weight: 1 },
    { text: "Gather references and sources", weight: 2 },
    { text: "Outline structure and sections", weight: 1 },
    { text: type==="design" ? "Develop and compare concepts" : "Develop methodology/approach", weight: 2 },
    { text: type==="lab" ? "Run experiments and collect data" : "Draft main content", weight: 3 },
    { text: "Analyze results and refine", weight: 2 },
    { text: "Write-up and formatting", weight: 2 },
    { text: "Review, revise, and finalize", weight: 1 }
  ];
  const totalWeight = baseSteps.reduce((a,b)=>a+b.weight,0);
  const totalHours = Math.max(1, Math.round(effortHours));
  const steps = baseSteps.map(s => ({ text: s.text, duration: Math.max(0.5, Number((s.weight/totalWeight*totalHours).toFixed(1))) }));
  const queries = [
    `${topic} methodology best practices`,
    `${topic} recent papers PDF`,
    `${topic} case study engineering`,
    `${topic} equations formulas standards`,
    `${topic} failure modes limitations`,
    `${topic} examples datasets`
  ];
  return { topic, outline: baseOutline, keyQuestions: buildKeyQuestions(topic, type), steps, queries, totalHours };
}
function buildKeyQuestions(topic, type){
  const base = [
    `What is the goal and success criteria for ${topic}?`,
    `What prior work or standards exist for ${topic}?`,
    `What constraints, assumptions, and inputs affect ${topic}?`,
    `What methods or models are most appropriate for ${topic}?`,
    `How will results be validated and interpreted for ${topic}?`,
    `What are risks, limitations, and future improvements for ${topic}?`
  ];
  if(type==="design") base.push(`What trade-offs drive design choices for ${topic}?`);
  if(type==="lab") base.push(`How to ensure repeatability and accuracy for ${topic}?`);
  return base;
}
function schedulePlanBlocks(plan){
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const slotsByDay = days.map(d => ({ day:d, slots: buildSlots(d) }));
  let blocks = [];
  let iDay = 0, iSlot = 0;
  plan.steps.forEach(s => {
    let remaining = Math.ceil(s.duration*2);
    while(remaining > 0){
      const day = slotsByDay[iDay % slotsByDay.length];
      const slot = day.slots[iSlot % day.slots.length];
      blocks.push({ day: day.day, start: slot.start, end: slot.end, title: s.text });
      remaining -= 1;
      iSlot += 1;
      if(iSlot % day.slots.length === 0){ iDay += 1; iSlot = 0; }
    }
  });
  return blocks;
}
