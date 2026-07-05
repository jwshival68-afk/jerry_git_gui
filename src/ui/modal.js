import { state } from '../state.js';
import { pickFolder, createBranch, cloneRepo } from '../api.js';
import { $ } from './dom.js';
import { toast } from './toast.js';

function openModal(title, placeholder, confirmText, mode) {
  state.modalMode = mode;
  $('#modal-title').textContent = title;
  $('#modal-input').placeholder = placeholder;
  $('#modal-input').value = '';
  $('#modal-error').textContent = '';
  $('#modal-confirm').textContent = confirmText;
  $('#modal-backdrop').classList.remove('hidden');
  $('#modal-input').focus();
}

function closeModal() {
  $('#modal-backdrop').classList.add('hidden');
  state.modalMode = null;
}

export function openNewBranchModal() {
  openModal('New branch', 'branch-name', 'Create', 'new-branch');
}

export function openCloneModal() {
  openModal('Clone repository', 'https://github.com/user/repo.git', 'Clone', 'clone');
}

export function setupModal(onRefreshBranches, onLoadRepo) {
  async function confirmModal() {
    const value = $('#modal-input').value.trim();
    if (!value) {
      $('#modal-error').textContent = "This field can't be empty.";
      return;
    }
    if (state.modalMode === 'new-branch') {
      try {
        await createBranch(state.repoPath, value);
        toast(`Created branch ${value}`);
        closeModal();
        onRefreshBranches();
      } catch (e) {
        $('#modal-error').textContent = String(e);
      }
    } else if (state.modalMode === 'clone') {
      const dest = await pickFolder();
      if (!dest) return;
      try {
        const path = await cloneRepo(value, dest);
        toast('Clone complete');
        closeModal();
        onLoadRepo(path);
      } catch (e) {
        $('#modal-error').textContent = String(e);
      }
    }
  }

  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-confirm').addEventListener('click', confirmModal);
  $('#modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmModal();
    if (e.key === 'Escape') closeModal();
  });
}
