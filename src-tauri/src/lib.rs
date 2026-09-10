use base64::Engine;
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct FilePayload {
    pub content: String,
    pub path: String,
    pub file_name: String,
    pub parent_dir: String,
    pub last_modified: u64,
}

pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watching_path: Mutex<Option<String>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            watching_path: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn open_file_dialog() -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown & Text Files", &["md", "markdown", "mdown", "mkd", "txt"])
        .pick_file();

    file.map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<FilePayload, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }

    let content = fs::read_to_string(p)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))?;

    let file_name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled.md".to_string());

    let parent_dir = p
        .parent()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default();

    let last_modified = fs::metadata(p)
        .and_then(|m| m.modified())
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64)
        .unwrap_or(0);

    Ok(FilePayload {
        content,
        path,
        file_name,
        parent_dir,
        last_modified,
    })
}

#[tauri::command]
fn read_local_asset(asset_path: String, base_dir: Option<String>) -> Result<String, String> {
    let mut path = PathBuf::from(&asset_path);

    // If path is relative and base_dir is provided, join them
    if !path.is_absolute() {
        if let Some(base) = base_dir {
            path = Path::new(&base).join(path);
        }
    }

    // Canonicalize if possible
    let clean_path = path.canonicalize().unwrap_or(path.clone());

    if !clean_path.exists() {
        return Err(format!("Asset not found: {}", clean_path.display()));
    }

    let bytes = fs::read(&clean_path)
        .map_err(|e| format!("Failed to read asset {}: {}", clean_path.display(), e))?;

    let mime = mime_guess::from_path(&clean_path)
        .first_or_octet_stream()
        .to_string();

    let base64_data = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, base64_data))
}

#[tauri::command]
fn start_watch_file(
    app: AppHandle,
    state: State<'_, WatcherState>,
    path: String,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("File does not exist to watch: {}", path));
    }

    // Stop previous watcher if any
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut watching_path_guard = state.watching_path.lock().map_err(|e| e.to_string())?;

    *watcher_guard = None;
    *watching_path_guard = None;

    let target_path_str = path.clone();
    let app_handle = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            if event.kind.is_modify() || event.kind.is_create() {
                let _ = app_handle.emit("file-changed", &target_path_str);
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&p, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    *watcher_guard = Some(watcher);
    *watching_path_guard = Some(path);

    Ok(())
}

#[tauri::command]
fn stop_watch_file(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut watching_path_guard = state.watching_path.lock().map_err(|e| e.to_string())?;

    *watcher_guard = None;
    *watching_path_guard = None;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            read_markdown_file,
            read_local_asset,
            start_watch_file,
            stop_watch_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
