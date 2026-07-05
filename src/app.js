const { invoke } = window.__TAURI__.core;

const state = {
  repoPath: null,
  activeTab: "changes",
  modalMode: null, // "new-branch" | "clone"
};

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function toast(message, isError = false) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.toggle("error", isError);
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 3200);
}

async function call(cmd, args = {}) {
  try {
    return await invoke(cmd, args);
  } catch (err) {
    toast(typeof err === "string" ? err : JSON.stringify(err), true);
    throw err;
  }
}

// ---------- repo lifecycle ----------
async function openRepoPicker() {
  const path = await call("pick_folder");
  if (!path) return;
  const ok = await call("is_git_repo", { path });
  if (!ok) {
    $("#empty-error").textContent = "That folder isn't a git repository yet. Try Init instead.";
    return;
  }
  loadRepo(path);
}

async function initRepo() {
  const path = await call("pick_folder");
  if (!path) return;
  await call("init_repo", { path });
  toast("Initialized empty repository");
  loadRepo(path);
}

function openCloneModal() {
  state.modalMode = "clone";
  $("#modal-title").textContent = "Clone repository";
  $("#modal-input").placeholder = "https://github.com/user/repo.git";
  $("#modal-input").value = "";
  $("#modal-error").textContent = "";
  $("#modal-confirm").textContent = "Clone";
  $("#modal-backdrop").classList.remove("hidden");
  $("#modal-input").focus();
}

async function loadRepo(path) {
  nav.navigate("app", { path });
}

// ---------- render: status / changes ----------
function statusBadgeChar(code) {
  const map = { M: "M", A: "A", D: "D", R: "R", "??": "U" };
  return map[code] || code;
}
function statusClass(code) {
  if (code === "??") return "status-Q";
  if (code === "M") return "status-M";
  if (code === "A") return "status-A";
  if (code === "D") return "status-D";
  if (code === "R") return "status-R";
  return "status-M";
}

function renderFileList(container, files, actionLabel, onAction) {
  container.innerHTML = "";
  if (files.length === 0) {
    container.appendChild(el("div", "empty-hint", "Nothing here"));
    return;
  }
  for (const f of files) {
    const row = el("div", "file-row");
    const badge = el("span", `status-badge ${statusClass(f.status)}`, statusBadgeChar(f.status));
    const path = el("span", "file-path", f.path);
    const btn = el("button", "file-action", actionLabel);
    btn.addEventListener("click", () => onAction(f.path));
    row.append(badge, path, btn);
    container.appendChild(row);
  }
}

async function refreshStatus() {
  const s = await call("repo_status", { path: state.repoPath });
  $("#current-branch-pill").textContent = s.branch;
  const ab = [];
  if (s.ahead > 0) ab.push(`↑${s.ahead}`);
  if (s.behind > 0) ab.push(`↓${s.behind}`);
  $("#ahead-behind").textContent = ab.join(" ");

  renderFileList($("#staged-list"), s.staged, "Unstage", async (path) => {
    await call("unstage_files", { path: state.repoPath, files: [path] });
    refreshStatus();
  });

  const unstagedCombined = [...s.unstaged, ...s.untracked];
  renderFileList($("#unstaged-list"), unstagedCombined, "Stage", async (path) => {
    await call("stage_files", { path: state.repoPath, files: [path] });
    refreshStatus();
  });

  $("#btn-commit").disabled = s.staged.length === 0;
}

async function refreshBranches() {
  const branches = await call("list_branches", { path: state.repoPath });
  const container = $("#branch-list");
  container.innerHTML = "";
  for (const b of branches) {
    if (b.is_remote) continue; // keep the sidebar focused on local branches
    const row = el("div", `branch-row${b.is_current ? " current" : ""}`);
    row.append(el("span", "dot"), el("span", null, b.name));
    if (!b.is_current) {
      row.addEventListener("click", async () => {
        try {
          await call("switch_branch", { path: state.repoPath, name: b.name });
          toast(`Switched to ${b.name}`);
          refreshAll();
        } catch {
          /* toast already shown */
        }
      });
      const del = el("button", "branch-delete", "×");
      del.title = `Delete ${b.name}`;
      del.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        if (!confirm(`Delete branch "${b.name}"?`)) return;
        await call("delete_branch", { path: state.repoPath, name: b.name });
        refreshBranches();
      });
      row.appendChild(del);
    }
    container.appendChild(row);
  }
}

async function refreshHistory() {
  const commits = await call("commit_log", { path: state.repoPath, limit: 100 });
  const graph = $("#commit-graph");
  graph.innerHTML = "";
  commits.forEach((c, i) => {
    const row = el("div", `commit-row${i === 0 ? " head" : ""}`);
    const body = el("div", "commit-body");
    body.appendChild(el("div", "commit-message", c.message));
    const meta = el("div", "commit-meta");
    meta.appendChild(el("span", "commit-hash", c.short_hash));
    meta.appendChild(el("span", null, c.author));
    meta.appendChild(el("span", null, c.date));
    if (c.refs) {
      const refsWrap = el("span", "commit-refs");
      c.refs.split(",").map((r) => r.trim()).filter(Boolean).forEach((r) => {
        refsWrap.appendChild(el("span", "ref-badge", r));
      });
      meta.appendChild(refsWrap);
    }
    body.appendChild(meta);
    row.appendChild(body);
    graph.appendChild(row);
  });
  if (commits.length === 0) {
    graph.appendChild(el("div", "empty-hint", "No commits yet"));
  }
}

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshBranches(), refreshHistory()]);
}

// ---------- tabs ----------
function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  $("#panel-changes").classList.toggle("hidden", tab !== "changes");
  $("#panel-history").classList.toggle("hidden", tab !== "history");
}

// ---------- modal (new branch / clone) ----------
function openNewBranchModal() {
  state.modalMode = "new-branch";
  $("#modal-title").textContent = "New branch";
  $("#modal-input").placeholder = "branch-name";
  $("#modal-input").value = "";
  $("#modal-error").textContent = "";
  $("#modal-confirm").textContent = "Create";
  $("#modal-backdrop").classList.remove("hidden");
  $("#modal-input").focus();
}

function closeModal() {
  $("#modal-backdrop").classList.add("hidden");
  state.modalMode = null;
}

async function confirmModal() {
  const value = $("#modal-input").value.trim();
  if (!value) {
    $("#modal-error").textContent = "This field can't be empty.";
    return;
  }
  if (state.modalMode === "new-branch") {
    try {
      await call("create_branch", { path: state.repoPath, name: value });
      toast(`Created branch ${value}`);
      closeModal();
      refreshBranches();
    } catch (e) {
      $("#modal-error").textContent = String(e);
    }
  } else if (state.modalMode === "clone") {
    const dest = await call("pick_folder");
    if (!dest) return;
    try {
      const path = await call("clone_repo", { url: value, dest });
      toast("Clone complete");
      closeModal();
      loadRepo(path);
    } catch (e) {
      $("#modal-error").textContent = String(e);
    }
  }
}

// ---------- wire up ----------
window.addEventListener("DOMContentLoaded", () => {
  nav.registerScreen("welcome", $("#empty-state"));
  nav.registerScreen("app", $("#app-shell"), async ({ path }) => {
    state.repoPath = path;
    $("#repo-name").textContent = path.split("/").filter(Boolean).pop() || path;
    await refreshAll();
  });

  $("#btn-open").addEventListener("click", openRepoPicker);
  $("#btn-init").addEventListener("click", initRepo);
  $("#btn-clone").addEventListener("click", openCloneModal);
  $("#btn-switch-repo").addEventListener("click", () => {
    $("#empty-error").textContent = "";
    nav.navigate("welcome");
  });

  $("#btn-refresh").addEventListener("click", refreshAll);
  $("#btn-pull").addEventListener("click", async () => {
    try {
      await call("pull_repo", { path: state.repoPath });
      toast("Pulled latest changes");
      refreshAll();
    } catch {}
  });
  $("#btn-push").addEventListener("click", async () => {
    try {
      await call("push_repo", { path: state.repoPath });
      toast("Pushed to remote");
      refreshAll();
    } catch {}
  });

  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));

  $("#btn-stage-all").addEventListener("click", async () => {
    const s = await call("repo_status", { path: state.repoPath });
    const files = [...s.unstaged, ...s.untracked].map((f) => f.path);
    if (files.length) await call("stage_files", { path: state.repoPath, files });
    refreshStatus();
  });
  $("#btn-unstage-all").addEventListener("click", async () => {
    const s = await call("repo_status", { path: state.repoPath });
    const files = s.staged.map((f) => f.path);
    if (files.length) await call("unstage_files", { path: state.repoPath, files });
    refreshStatus();
  });

  $("#btn-commit").addEventListener("click", async () => {
    const msg = $("#commit-message").value.trim();
    $("#changes-error").textContent = "";
    if (!msg) {
      $("#changes-error").textContent = "Write a commit message first.";
      return;
    }
    try {
      await call("commit_changes", { path: state.repoPath, message: msg });
      $("#commit-message").value = "";
      toast("Committed");
      refreshAll();
    } catch (e) {
      $("#changes-error").textContent = String(e);
    }
  });

  $("#btn-new-branch").addEventListener("click", openNewBranchModal);
  $("#modal-cancel").addEventListener("click", closeModal);
  $("#modal-confirm").addEventListener("click", confirmModal);
  $("#modal-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmModal();
    if (e.key === "Escape") closeModal();
  });
});
