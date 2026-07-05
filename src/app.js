import { state } from './state.js';
import { pickFolder, isGitRepo, initRepo } from './api.js';
import { toast } from './ui/toast.js';
import { refreshStatus, setupChanges } from './ui/changes.js';
import { refreshBranches } from './ui/branches.js';
import { refreshHistory } from './ui/history.js';
import { setupModal, openNewBranchModal, openCloneModal } from './ui/modal.js';
import { setupToolbar } from './ui/toolbar.js';

const $ = (sel) => document.querySelector(sel);

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshBranches(refreshAll), refreshHistory()]);
}

async function loadRepo(path) {
  window.nav.navigate('app', { path });
}

async function openRepoPicker() {
  const path = await pickFolder();
  if (!path) return;
  const ok = await isGitRepo(path);
  if (!ok) {
    $('#empty-error').textContent = "That folder isn't a git repository yet. Try Init instead.";
    return;
  }
  loadRepo(path);
}

async function handleInitRepo() {
  const path = await pickFolder();
  if (!path) return;
  await initRepo(path);
  toast('Initialized empty repository');
  loadRepo(path);
}

function setupSidebarResizer() {
  const sidebar = $('#sidebar');
  const resizer = $('#sidebar-resizer');
  let startX, startWidth;

  resizer.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(e) {
      const newWidth = Math.min(480, Math.max(140, startWidth + (e.clientX - startX)));
      sidebar.style.width = newWidth + 'px';
    }

    function onMouseUp() {
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  window.nav.registerScreen('welcome', $('#empty-state'));
  window.nav.registerScreen('app', $('#app-shell'), async ({ path }) => {
    state.repoPath = path;
    $('#repo-name').textContent = path.split('/').filter(Boolean).pop() || path;
    await refreshAll();
  });

  setupToolbar(refreshAll);
  setupChanges(refreshAll);
  setupModal(() => refreshBranches(refreshAll), loadRepo);
  setupSidebarResizer();

  $('#btn-open').addEventListener('click', openRepoPicker);
  $('#btn-init').addEventListener('click', handleInitRepo);
  $('#btn-clone').addEventListener('click', openCloneModal);
  $('#btn-switch-repo').addEventListener('click', () => {
    $('#empty-error').textContent = '';
    window.nav.navigate('welcome');
  });
  $('#btn-new-branch').addEventListener('click', openNewBranchModal);
});
