import { state } from '../state.js';
import { listBranches, switchBranch, deleteBranch } from '../api.js';
import { $, el } from './dom.js';
import { toast } from './toast.js';

export async function refreshBranches(onRefreshAll) {
  const branches = await listBranches(state.repoPath);
  const container = $('#branch-list');
  container.innerHTML = '';
  for (const b of branches) {
    if (b.is_remote) continue;
    const row = el('div', `branch-row${b.is_current ? ' current' : ''}`);
    row.append(el('span', 'dot'), el('span', null, b.name));
    if (!b.is_current) {
      row.addEventListener('click', async () => {
        try {
          await switchBranch(state.repoPath, b.name);
          toast(`Switched to ${b.name}`);
          onRefreshAll();
        } catch { /* toast already shown by api */ }
      });
      const del = el('button', 'branch-delete', '×');
      del.title = `Delete ${b.name}`;
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (!confirm(`Delete branch "${b.name}"?`)) return;
        await deleteBranch(state.repoPath, b.name);
        refreshBranches(onRefreshAll);
      });
      row.appendChild(del);
    }
    container.appendChild(row);
  }
}
