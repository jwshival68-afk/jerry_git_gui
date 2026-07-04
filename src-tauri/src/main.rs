// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod git;

use git::{BranchInfo, CommitInfo, StatusResult};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn is_git_repo(path: String) -> bool {
    git::is_git_repo(&path)
}

#[tauri::command]
fn repo_status(path: String) -> Result<StatusResult, String> {
    git::status(&path)
}

#[tauri::command]
fn stage_files(path: String, files: Vec<String>) -> Result<(), String> {
    git::stage(&path, &files).map(|_| ())
}

#[tauri::command]
fn unstage_files(path: String, files: Vec<String>) -> Result<(), String> {
    git::unstage(&path, &files).map(|_| ())
}

#[tauri::command]
fn discard_files(path: String, files: Vec<String>) -> Result<(), String> {
    git::discard(&path, &files).map(|_| ())
}

#[tauri::command]
fn commit_changes(path: String, message: String) -> Result<String, String> {
    git::commit(&path, &message)
}

#[tauri::command]
fn push_repo(path: String) -> Result<String, String> {
    git::push(&path)
}

#[tauri::command]
fn pull_repo(path: String) -> Result<String, String> {
    git::pull(&path)
}

#[tauri::command]
fn list_branches(path: String) -> Result<Vec<BranchInfo>, String> {
    git::branches(&path)
}

#[tauri::command]
fn create_branch(path: String, name: String) -> Result<(), String> {
    git::create_branch(&path, &name).map(|_| ())
}

#[tauri::command]
fn switch_branch(path: String, name: String) -> Result<(), String> {
    git::switch_branch(&path, &name).map(|_| ())
}

#[tauri::command]
fn delete_branch(path: String, name: String) -> Result<(), String> {
    git::delete_branch(&path, &name).map(|_| ())
}

#[tauri::command]
fn commit_log(path: String, limit: u32) -> Result<Vec<CommitInfo>, String> {
    git::log(&path, limit)
}

#[tauri::command]
fn init_repo(path: String) -> Result<(), String> {
    git::init(&path).map(|_| ())
}

#[tauri::command]
fn clone_repo(url: String, dest: String) -> Result<String, String> {
    git::clone(&url, &dest)
}

#[tauri::command]
async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    match rx.recv() {
        Ok(Some(file_path)) => file_path
            .into_path()
            .ok()
            .map(|p| p.to_string_lossy().to_string()),
        _ => None,
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            is_git_repo,
            repo_status,
            stage_files,
            unstage_files,
            discard_files,
            commit_changes,
            push_repo,
            pull_repo,
            list_branches,
            create_branch,
            switch_branch,
            delete_branch,
            commit_log,
            init_repo,
            clone_repo,
            pick_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
