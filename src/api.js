import { toast } from './ui/toast.js';

const { invoke } = window.__TAURI__.core;

async function call(cmd, args = {}) {
  try {
    return await invoke(cmd, args);
  } catch (err) {
    toast(typeof err === 'string' ? err : JSON.stringify(err), true);
    throw err;
  }
}

export const pickFolder = () => call('pick_folder');
export const isGitRepo = (path) => call('is_git_repo', { path });
export const repoStatus = (path) => call('repo_status', { path });
export const stageFiles = (path, files) => call('stage_files', { path, files });
export const unstageFiles = (path, files) => call('unstage_files', { path, files });
export const commitChanges = (path, message) => call('commit_changes', { path, message });
export const pushRepo = (path) => call('push_repo', { path });
export const pullRepo = (path) => call('pull_repo', { path });
export const listBranches = (path) => call('list_branches', { path });
export const createBranch = (path, name) => call('create_branch', { path, name });
export const switchBranch = (path, name) => call('switch_branch', { path, name });
export const deleteBranch = (path, name) => call('delete_branch', { path, name });
export const commitLog = (path, limit) => call('commit_log', { path, limit });
export const initRepo = (path) => call('init_repo', { path });
export const cloneRepo = (url, dest) => call('clone_repo', { url, dest });
