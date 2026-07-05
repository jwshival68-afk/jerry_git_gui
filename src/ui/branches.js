import { state } from '../state.js';
import { listBranches, switchBranch, deleteBranch } from '../api.js';
import { $, el } from './dom.js';
import { toast } from './toast.js';

// Tracks which folder keys are collapsed. Key format: "local", "local/feature", "origin", "origin/feature"
const collapsed = new Set();

// ── Context menu (singleton) ──────────────────────────────────────
let ctxMenu = null;
let ctxBranch = null;
let ctxRefresh = null;

function getCtxMenu() {
  if (ctxMenu) return ctxMenu;
  ctxMenu = el('div', 'branch-ctx-menu hidden');
  const delBtn = el('button', 'ctx-menu-item', 'Delete branch');
  delBtn.addEventListener('click', async () => {
    hideCtxMenu();
    if (!ctxBranch) return;
    if (!confirm(`Delete branch "${ctxBranch.name}"?`)) return;
    try {
      await deleteBranch(state.repoPath, ctxBranch.name);
      toast(`Deleted ${ctxBranch.name}`);
      if (ctxRefresh) ctxRefresh();
    } catch { /* toast already shown by api */ }
  });
  ctxMenu.appendChild(delBtn);
  document.body.appendChild(ctxMenu);

  document.addEventListener('click', hideCtxMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideCtxMenu(); });
  return ctxMenu;
}

function showCtxMenu(x, y, branch, onRefresh) {
  ctxBranch = branch;
  ctxRefresh = onRefresh;
  const menu = getCtxMenu();
  menu.classList.remove('hidden');
  const menuW = 160;
  const menuH = 36;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function hideCtxMenu() {
  if (ctxMenu) ctxMenu.classList.add('hidden');
  ctxBranch = null;
}

// ── Tree rendering ────────────────────────────────────────────────

function makeFolderKey(groupName, prefix) {
  return prefix ? `${groupName}/${prefix}` : groupName;
}

function renderGroup(container, groupName, prefixMap, isSwitchable, onRefreshAll) {
  const groupKey = groupName;
  const groupHeader = el('div', 'branch-group-header');
  const arrow = el('span', 'tree-arrow', '▾');
  if (collapsed.has(groupKey)) arrow.classList.add('collapsed');
  groupHeader.append(arrow, el('span', null, groupName));

  const groupBody = el('div', 'branch-group-body');
  if (collapsed.has(groupKey)) groupBody.classList.add('hidden');

  groupHeader.addEventListener('click', () => {
    if (collapsed.has(groupKey)) {
      collapsed.delete(groupKey);
      arrow.classList.remove('collapsed');
      groupBody.classList.remove('hidden');
    } else {
      collapsed.add(groupKey);
      arrow.classList.add('collapsed');
      groupBody.classList.add('hidden');
    }
  });

  container.appendChild(groupHeader);
  container.appendChild(groupBody);

  const prefixes = Object.keys(prefixMap).sort((a, b) => {
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });

  for (const prefix of prefixes) {
    const branches = prefixMap[prefix];

    if (prefix === '') {
      for (const b of branches) {
        groupBody.appendChild(makeBranchRow(b, 'group-child', isSwitchable, onRefreshAll));
      }
    } else {
      const folderKey = makeFolderKey(groupName, prefix);
      const folderRow = el('div', 'branch-folder-row');
      const folderArrow = el('span', 'tree-arrow', '▾');
      if (collapsed.has(folderKey)) folderArrow.classList.add('collapsed');
      folderRow.append(folderArrow, el('span', null, prefix));

      const folderBody = el('div', 'branch-folder-body');
      if (collapsed.has(folderKey)) folderBody.classList.add('hidden');

      folderRow.addEventListener('click', () => {
        if (collapsed.has(folderKey)) {
          collapsed.delete(folderKey);
          folderArrow.classList.remove('collapsed');
          folderBody.classList.remove('hidden');
        } else {
          collapsed.add(folderKey);
          folderArrow.classList.add('collapsed');
          folderBody.classList.add('hidden');
        }
      });

      groupBody.appendChild(folderRow);
      groupBody.appendChild(folderBody);

      for (const b of branches) {
        folderBody.appendChild(makeBranchRow(b, 'indented', isSwitchable, onRefreshAll));
      }
    }
  }
}

function makeBranchRow(b, indentCls, isSwitchable, onRefreshAll) {
  const row = el('div', `branch-row ${indentCls}${b.is_current ? ' current' : ''}`);
  row.append(el('span', 'dot'), el('span', null, b.leaf));

  if (isSwitchable && !b.is_current) {
    row.addEventListener('click', async () => {
      try {
        await switchBranch(state.repoPath, b.name);
        toast(`Switched to ${b.name}`);
        onRefreshAll();
      } catch { /* toast already shown by api */ }
    });

    row.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showCtxMenu(ev.clientX, ev.clientY, b, () => refreshBranches(onRefreshAll));
    });
  }

  return row;
}

// ── Public API ───────────────────────────────────────────────────

export async function refreshBranches(onRefreshAll) {
  const branches = await listBranches(state.repoPath);
  const { local, origin } = window.branchTree.buildBranchTree(branches);

  const container = $('#branch-list');
  container.innerHTML = '';

  renderGroup(container, 'local', local, true, onRefreshAll);
  renderGroup(container, 'origin', origin, false, onRefreshAll);
}
