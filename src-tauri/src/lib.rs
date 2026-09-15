use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

/// フロントエンドに返却するMarkdownファイルの情報構造体
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePayload {
    /// ファイルのテキスト全文
    pub content: String,
    /// ファイルの絶対パス
    pub path: String,
    /// ファイル名（例: README.md）
    pub file_name: String,
    /// 親ディレクトリのパス（相対画像パスの解決に使用）
    pub parent_dir: String,
    /// 最終更新日時（エポックミリ秒）
    pub last_modified: u64,
}

/// ファイル変更監視（標準スレッドポーリング方式：サードパーティ依存ゼロ・高信頼性）
pub struct WatcherState {
    /// バックグラウンド監視ループの稼働フラグ
    pub is_running: Arc<AtomicBool>,
    /// 現在監視しているファイルパスの集合
    pub watching_paths: Arc<Mutex<HashSet<String>>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            watching_paths: Arc::new(Mutex::new(HashSet::new())),
        }
    }
}

/// アプリ起動時にコマンドライン引数として渡されたファイルパスを保持する構造体
pub struct InitialFileState(pub Mutex<Option<String>>);

/// OSネイティブのファイル選択ダイアログを開き、選択されたMarkdown/テキストファイルのパスを返します。
/// （サードパーティクレートを使わずOS標準のPowerShell / Win32インターフェース経由で安全に実行）
#[tauri::command]
fn open_file_dialog() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = "Markdown & Text Files (*.md;*.markdown;*.mdown;*.mkd;*.txt)|*.md;*.markdown;*.mdown;*.mkd;*.txt|All Files (*.*)|*.*"
$dialog.Title = "Markdownファイルを開く"
$dialog.RestoreDirectory = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::Write($dialog.FileName)
}
"#;
        let output = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .ok()?;

        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() && Path::new(&path_str).exists() {
                return Some(path_str);
            }
        }
    }
    None
}

/// アプリ起動時の引数（ファイル関連付け起動）として渡された初期ファイルパスを取得します。
#[tauri::command]
fn get_initial_file(state: State<'_, InitialFileState>) -> Option<String> {
    let mut guard = state.0.lock().ok()?;
    guard.take()
}

/// 指定されたパスのMarkdownファイルを読み込み、内容・ファイル名・親ディレクトリ・更新日時を返します。
#[tauri::command]
fn read_markdown_file(path: String) -> Result<FilePayload, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }

    // ファイル内容をUTF-8文字列として読み込み
    let content = fs::read_to_string(p)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))?;

    // ファイル名を取得
    let file_name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled.md".to_string());

    // 相対画像解決用に親ディレクトリを取得
    let parent_dir = p
        .parent()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default();

    // 最終更新日時を取得
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

/// ファイルパスからMIMEタイプを判定（サードパーティクレート不使用・標準Rust実装）
fn guess_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("avif") => "image/avif",
        Some("pdf") => "application/pdf",
        Some("txt") | Some("md") | Some("markdown") => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

/// バイト列をBase64文字列にエンコード（サードパーティクレート不使用・標準Rust実装）
fn encode_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(CHARSET[(b2 & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// ローカル画像やアセットファイルを読み込み、フロントエンドで直接表示可能な Data URL (Base64) に変換して返します。
#[tauri::command]
fn read_local_asset(asset_path: String, base_dir: Option<String>) -> Result<String, String> {
    let mut path = PathBuf::from(&asset_path);

    // 相対パスの場合は base_dir と結合
    if !path.is_absolute() {
        if let Some(base) = base_dir {
            path = Path::new(&base).join(path);
        }
    }

    // 正規化
    let clean_path = path.canonicalize().unwrap_or(path.clone());

    if !clean_path.exists() {
        return Err(format!("Asset not found: {}", clean_path.display()));
    }

    // バイナリデータを読み込み
    let bytes = fs::read(&clean_path)
        .map_err(|e| format!("Failed to read asset {}: {}", clean_path.display(), e))?;

    // 拡張子からMIMEタイプを推定
    let mime = guess_mime_type(&clean_path);

    // 自前Base64エンコーダでData URLを構築
    let base64_data = encode_base64(&bytes);
    Ok(format!("data:{};base64,{}", mime, base64_data))
}

/// 指定されたMarkdownファイルの変更監視（ホットリロード）を開始・追加します。
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

    let mut paths_guard = state.watching_paths.lock().map_err(|e| e.to_string())?;
    paths_guard.insert(path);

    // ポーリングスレッドが未起動なら起動
    if !state.is_running.swap(true, Ordering::SeqCst) {
        let is_running = Arc::clone(&state.is_running);
        let watching_paths = Arc::clone(&state.watching_paths);
        let app_handle = app.clone();

        thread::spawn(move || {
            let mut last_modified_map: HashMap<String, u64> = HashMap::new();
            let mut path_buffer: Vec<String> = Vec::new();

            while is_running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(500));

                path_buffer.clear();
                if let Ok(guard) = watching_paths.lock() {
                    if guard.is_empty() {
                        continue;
                    }
                    path_buffer.extend(guard.iter().cloned());
                } else {
                    continue;
                }

                for file_path in &path_buffer {
                    let p = Path::new(file_path);
                    if let Ok(meta) = fs::metadata(p) {
                        if let Ok(mod_time) = meta.modified() {
                            let mod_millis = mod_time
                                .duration_since(UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64;

                            if let Some(&prev_mod) = last_modified_map.get(file_path) {
                                if mod_millis > prev_mod {
                                    last_modified_map.insert(file_path.clone(), mod_millis);
                                    let _ = app_handle.emit("file-changed", file_path);
                                }
                            } else {
                                last_modified_map.insert(file_path.clone(), mod_millis);
                            }
                        }
                    }
                }
            }
        });
    }

    Ok(())
}

/// 指定されたファイルの変更監視を解除します。
#[tauri::command]
fn unwatch_file(state: State<'_, WatcherState>, path: String) -> Result<(), String> {
    let mut paths_guard = state.watching_paths.lock().map_err(|e| e.to_string())?;
    paths_guard.remove(&path);

    if paths_guard.is_empty() {
        state.is_running.store(false, Ordering::SeqCst);
    }

    Ok(())
}

/// すべてのファイル監視を停止します。
#[tauri::command]
fn stop_watch_file(state: State<'_, WatcherState>) -> Result<(), String> {
    state.is_running.store(false, Ordering::SeqCst);
    let mut paths_guard = state.watching_paths.lock().map_err(|e| e.to_string())?;
    paths_guard.clear();

    Ok(())
}

/// コマンドライン引数からファイルパスを抽出するヘルパー関数
fn extract_target_file_from_args(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        let p = Path::new(arg);
        if p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

#[cfg(target_os = "windows")]
mod win_cursor {
    #[repr(C)]
    #[derive(Clone, Copy, Debug)]
    pub struct POINT {
        pub x: i32,
        pub y: i32,
    }

    #[link(name = "user32")]
    extern "system" {
        pub fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    }

    /// 起動時のマウスカーソル座標を取得します
    pub fn get_cursor_pos() -> Option<(i32, i32)> {
        let mut pt = POINT { x: 0, y: 0 };
        unsafe {
            if GetCursorPos(&mut pt) != 0 {
                Some((pt.x, pt.y))
            } else {
                None
            }
        }
    }
}

/// Tauri アプリケーションの初期化と起動
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = env::args().collect();
    let initial_file = extract_target_file_from_args(&args);

    tauri::Builder::default()
        .manage(WatcherState::default())
        .manage(InitialFileState(Mutex::new(initial_file)))
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    if let Some((cx, cy)) = win_cursor::get_cursor_pos() {
                        if let Ok(monitors) = window.available_monitors() {
                            let target_monitor = monitors.into_iter().find(|m| {
                                let pos = m.position();
                                let size = m.size();
                                cx >= pos.x
                                    && cx < pos.x + size.width as i32
                                    && cy >= pos.y
                                    && cy < pos.y + size.height as i32
                            });

                            if let Some(monitor) = target_monitor {
                                let m_pos = monitor.position();
                                let m_size = monitor.size();
                                let win_size = window
                                    .outer_size()
                                    .unwrap_or(tauri::PhysicalSize::new(1100, 750));

                                let x = m_pos.x
                                    + ((m_size.width as i32 - win_size.width as i32) / 2).max(0);
                                let y = m_pos.y
                                    + ((m_size.height as i32 - win_size.height as i32) / 2).max(0);

                                let _ = window.set_position(tauri::Position::Physical(
                                    tauri::PhysicalPosition::new(x, y),
                                ));
                            } else {
                                let _ = window.center();
                            }
                        }
                    } else {
                        let _ = window.center();
                    }
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = window.center();
                }

                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(file_path) = extract_target_file_from_args(&args) {
                let _ = app.emit("open-file-requested", file_path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            get_initial_file,
            read_markdown_file,
            read_local_asset,
            start_watch_file,
            unwatch_file,
            stop_watch_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
