import { state } from '../state.js';
import { repoStatus, stageFiles, unstageFiles, commitChanges } from '../api.js';
import { $, el } from './dom.js';
import { toast } from './toast.js';

function statusBadgeChar(code) {
  const map = { M: 'M', A: 'A', D: 'D', R: 'R', '??': 'U' };
  return map[code] || code;
}

function statusClass(code) {
  if (code === '??') return 'status-Q';
  if (code === 'M') return 'status-M';
  if (code === 'A') return 'status-A';
  if (code === 'D') return 'status-D';
  if (code === 'R') return 'status-R';
  return 'status-M';
}

function renderFileList(container, files, actionLabel, onAction) {
  container.innerHTML = '';
  if (files.length === 0) {
    container.appendChild(el('div', 'empty-hint', 'Nothing here'));
    return;
  }
  for (const f of files) {
    const row = el('div', 'file-row');
    const badge = el('span', `status-badge ${statusClass(f.status)}`, statusBadgeChar(f.status));
    const path = el('span', 'file-path', f.path);
    const btn = el('button', 'file-action', actionLabel);
    btn.addEventListener('click', () => onAction(f.path));
    row.append(badge, path, btn);
    container.appendChild(row);
  }
}

export async function refreshStatus() {
  const s = await repoStatus(state.repoPath);
  $('#current-branch-pill').textContent = s.branch;
  const ab = [];
  if (s.ahead > 0) ab.push(`↑${s.ahead}`);
  if (s.behind > 0) ab.push(`↓${s.behind}`);
  $('#ahead-behind').textContent = ab.join(' ');

  renderFileList($('#staged-list'), s.staged, 'Unstage', async (path) => {
    await unstageFiles(state.repoPath, [path]);
    refreshStatus();
  });

  const unstagedCombined = [...s.unstaged, ...s.untracked];
  renderFileList($('#unstaged-list'), unstagedCombined, 'Stage', async (path) => {
    await stageFiles(state.repoPath, [path]);
    refreshStatus();
  });

  $('#btn-commit').disabled = s.staged.length === 0;
}

export function setupChanges(onRefreshAll) {
  $('#btn-stage-all').addEventListener('click', async () => {
    const s = await repoStatus(state.repoPath);
    const files = [...s.unstaged, ...s.untracked].map((f) => f.path);
    if (files.length) await stageFiles(state.repoPath, files);
    refreshStatus();
  });

  $('#btn-unstage-all').addEventListener('click', async () => {
    const s = await repoStatus(state.repoPath);
    const files = s.staged.map((f) => f.path);
    if (files.length) await unstageFiles(state.repoPath, files);
    refreshStatus();
  });

  $('#btn-commit').addEventListener('click', async () => {
    const msg = $('#commit-message').value.trim();
    $('#changes-error').textContent = '';
    if (!msg) {
      $('#changes-error').textContent = 'Write a commit message first.';
      return;
    }
    try {
      await commitChanges(state.repoPath, msg);
      $('#commit-message').value = '';
      toast('Committed');
      onRefreshAll();
    } catch (e) {
      $('#changes-error').textContent = String(e);
    }
  });
}
