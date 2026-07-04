use serde::Serialize;
use std::path::Path;
use std::process::Command;

/// Runs `git <args>` inside `repo_path` and returns trimmed stdout, or a readable error.
fn run_git(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo_path)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to launch git: {e}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim_end().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim_end().to_string();
        Err(if stderr.is_empty() {
            format!("git {} failed", args.join(" "))
        } else {
            stderr
        })
    }
}

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub path: String,
    pub status: String, // e.g. "M", "A", "D", "R", "??"
}

#[derive(Serialize, Clone)]
pub struct StatusResult {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<FileEntry>,
    pub unstaged: Vec<FileEntry>,
    pub untracked: Vec<FileEntry>,
}

#[derive(Serialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

#[derive(Serialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub refs: String,
}

pub fn is_git_repo(path: &str) -> bool {
    Path::new(path).join(".git").exists()
}

pub fn status(repo_path: &str) -> Result<StatusResult, String> {
    let branch = run_git(repo_path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .unwrap_or_else(|_| "(no branch)".to_string());

    let (mut ahead, mut behind) = (0, 0);
    if let Ok(counts) = run_git(
        repo_path,
        &["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    ) {
        let parts: Vec<&str> = counts.split_whitespace().collect();
        if parts.len() == 2 {
            ahead = parts[0].parse().unwrap_or(0);
            behind = parts[1].parse().unwrap_or(0);
        }
    }

    let raw = run_git(repo_path, &["status", "--porcelain=v1"])?;
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for line in raw.lines() {
        if line.len() < 3 {
            continue;
        }
        let index_status = &line[0..1];
        let worktree_status = &line[1..2];
        let file = line[3..].to_string();

        if index_status == "?" && worktree_status == "?" {
            untracked.push(FileEntry {
                path: file,
                status: "??".to_string(),
            });
            continue;
        }
        if index_status != " " {
            staged.push(FileEntry {
                path: file.clone(),
                status: index_status.to_string(),
            });
        }
        if worktree_status != " " {
            unstaged.push(FileEntry {
                path: file,
                status: worktree_status.to_string(),
            });
        }
    }

    Ok(StatusResult {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
    })
}

pub fn stage(repo_path: &str, files: &[String]) -> Result<String, String> {
    let mut args = vec!["add", "--"];
    let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    run_git(repo_path, &args)
}

pub fn unstage(repo_path: &str, files: &[String]) -> Result<String, String> {
    let mut args = vec!["restore", "--staged", "--"];
    let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    run_git(repo_path, &args)
}

pub fn discard(repo_path: &str, files: &[String]) -> Result<String, String> {
    let mut args = vec!["checkout", "--"];
    let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    args.extend(refs);
    run_git(repo_path, &args)
}

pub fn commit(repo_path: &str, message: &str) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    run_git(repo_path, &["commit", "-m", message])
}

pub fn push(repo_path: &str) -> Result<String, String> {
    run_git(repo_path, &["push"])
}

pub fn pull(repo_path: &str) -> Result<String, String> {
    run_git(repo_path, &["pull"])
}

pub fn branches(repo_path: &str) -> Result<Vec<BranchInfo>, String> {
    let raw = run_git(
        repo_path,
        &["branch", "-a", "--format=%(HEAD)|%(refname:short)"],
    )?;
    let mut out = Vec::new();
    for line in raw.lines() {
        let mut parts = line.splitn(2, '|');
        let head_marker = parts.next().unwrap_or("");
        let name = parts.next().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        out.push(BranchInfo {
            is_current: head_marker == "*",
            is_remote: name.starts_with("remotes/"),
            name,
        });
    }
    Ok(out)
}

pub fn create_branch(repo_path: &str, name: &str) -> Result<String, String> {
    run_git(repo_path, &["branch", name])
}

pub fn switch_branch(repo_path: &str, name: &str) -> Result<String, String> {
    run_git(repo_path, &["switch", name])
}

pub fn delete_branch(repo_path: &str, name: &str) -> Result<String, String> {
    run_git(repo_path, &["branch", "-D", name])
}

pub fn log(repo_path: &str, limit: u32) -> Result<Vec<CommitInfo>, String> {
    // Unit separator (\x1f) between fields, record separator (\x1e) between commits.
    let format = "%H\x1f%h\x1f%an\x1f%ad\x1f%s\x1f%D\x1e";
    let raw = run_git(
        repo_path,
        &[
            "log",
            &format!("-n{limit}"),
            &format!("--pretty=format:{format}"),
            "--date=short",
        ],
    )?;

    let mut commits = Vec::new();
    for record in raw.split('\x1e') {
        let record = record.trim_start_matches('\n');
        if record.trim().is_empty() {
            continue;
        }
        let fields: Vec<&str> = record.split('\x1f').collect();
        if fields.len() < 6 {
            continue;
        }
        commits.push(CommitInfo {
            hash: fields[0].to_string(),
            short_hash: fields[1].to_string(),
            author: fields[2].to_string(),
            date: fields[3].to_string(),
            message: fields[4].to_string(),
            refs: fields[5].to_string(),
        });
    }
    Ok(commits)
}

pub fn init(repo_path: &str) -> Result<String, String> {
    run_git(repo_path, &["init"])
}

pub fn clone(url: &str, dest: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["clone", url, dest])
        .output()
        .map_err(|e| format!("Failed to launch git: {e}"))?;
    if output.status.success() {
        Ok(dest.to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim_end().to_string())
    }
}
