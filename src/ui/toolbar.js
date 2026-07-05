import { state } from '../state.js';
import { pullRepo, pushRepo } from '../api.js';
import { $ } from './dom.js';
import { toast } from './toast.js';

export function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  $('#panel-changes').classList.toggle('hidden', tab !== 'changes');
  $('#panel-history').classList.toggle('hidden', tab !== 'history');
}

export function setupToolbar(onRefreshAll) {
  const appWin = window.__TAURI__.window.getCurrentWindow();
  let lastClickTime = 0;
  ['#titlebar-spacer', '#toolbar', '#sidebar'].forEach((sel) => {
    const domEl = $(sel);
    if (!domEl) return;
    domEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('button, input, a, select, .branch-row')) return;
      const now = Date.now();
      const isDoubleClick = now - lastClickTime < 300;
      lastClickTime = now;
      if (isDoubleClick) {
        appWin.isFullscreen().then((full) => appWin.setFullscreen(!full));
      } else {
        appWin.startDragging();
      }
    });
  });

  $('#btn-refresh').addEventListener('click', onRefreshAll);

  $('#btn-pull').addEventListener('click', async () => {
    try {
      await pullRepo(state.repoPath);
      toast('Pulled latest changes');
      onRefreshAll();
    } catch {}
  });

  $('#btn-push').addEventListener('click', async () => {
    try {
      await pushRepo(state.repoPath);
      toast('Pushed to remote');
      onRefreshAll();
    } catch {}
  });

  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => setTab(t.dataset.tab))
  );
}
