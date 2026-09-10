use base64::Engine;
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter, Manager, State};

/// フロントエンドに返却するMarkdownファイルの情報構造体
#[derive(Debug, Serialize, Deserialize)]
pub struct FilePayload {
    /// ファイルのテキスト全文
    pub content: String,
    /// ファイルの絶対パス
    pub path: String,
    /// ファイル名（例: README.md）
    pub file_name: String,
    /// 親ディレクトリのパス（相対画像パスの解決に使用）
    pub parent_dir: String,
    /// 最終更新日時（エポック秒ミリ秒）
    pub last_modified: u64,
}

/// ファイル変更監視（notify）の状態を保持する構造体
pub struct WatcherState {
    /// 稼働中のファイル監視インスタンス
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    /// 現在監視しているファイルのパス
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

/// アプリ起動時にコマンドライン引数として渡されたファイルパスを保持する構造体
pub struct InitialFileState(pub Mutex<Option<String>>);

/// OSネイティブのファイル選択ダイアログを開き、選択されたMarkdown/テキストファイルのパスを返します。
#[tauri::command]
fn open_file_dialog() -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown & Text Files", &["md", "markdown", "mdown", "mkd", "txt"])
        .pick_file();

    file.map(|p| p.to_string_lossy().to_string())
}

/// アプリ起動時の引数（ファイル関連付け起動）として渡された初期ファイルパスを取得します。
/// 一度取得された後は None にリセットされます。
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

    // 拡張子からMIMEタイプを推定（例: image/png）
    let mime = mime_guess::from_path(&clean_path)
        .first_or_octet_stream()
        .to_string();

    // Base64にエンコードしてData URLを構築
    let base64_data = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, base64_data))
}

/// 指定されたMarkdownファイルの変更監視（ホットリロード）を開始します。
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

    // 前回の監視インスタンスが存在する場合は停止・破棄
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut watching_path_guard = state.watching_path.lock().map_err(|e| e.to_string())?;

    *watcher_guard = None;
    *watching_path_guard = None;

    let target_path_str = path.clone();
    let app_handle = app.clone();

    // ファイル更新イベントハンドラの設定
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            if event.kind.is_modify() || event.kind.is_create() {
                let _ = app_handle.emit("file-changed", &target_path_str);
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // 対象ファイルを監視
    watcher
        .watch(&p, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    *watcher_guard = Some(watcher);
    *watching_path_guard = Some(path);

    Ok(())
}

/// 現在のファイル監視を停止します。
#[tauri::command]
fn stop_watch_file(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut watching_path_guard = state.watching_path.lock().map_err(|e| e.to_string())?;

    *watcher_guard = None;
    *watching_path_guard = None;

    Ok(())
}

/// コマンドライン引数からファイルパスを抽出するヘルパー関数
fn extract_target_file_from_args(args: &[String]) -> Option<String> {
    // 最初の引数は通常実行ファイルのパスなので、1番目以降を確認
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
    // 起動時のコマンドライン引数（Windowsのファイル関連付け起動等）を取得
    let args: Vec<String> = env::args().collect();
    let initial_file = extract_target_file_from_args(&args);

    tauri::Builder::default()
        // ファイル監視状態の管理
        .manage(WatcherState::default())
        // 初期ファイルパスの状態管理
        .manage(InitialFileState(Mutex::new(initial_file)))
        // デュアルディスプレイ対応：起動元画面へのウィンドウ配置
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    if let Some((cx, cy)) = win_cursor::get_cursor_pos() {
                        if let Ok(monitors) = window.available_monitors() {
                            // カーソルが存在するモニター（実行ファイルを起動した画面）を検出
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

                // 画面配置完了後に表示してフォーカス
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        // シングルインスタンスプラグイン（2重起動防止 & 既存ウィンドウへファイルを開くリクエストを送信）
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(file_path) = extract_target_file_from_args(&args) {
                // フロントエンドへファイルオープンリクエストを通知
                let _ = app.emit("open-file-requested", file_path);
            }
            // 既存のメインウィンドウにフォーカスを当てる
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        // 外部URLオープナープラグイン
        .plugin(tauri_plugin_opener::init())
        // フロントエンドから呼び出し可能なRustコマンド群を登録
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            get_initial_file,
            read_markdown_file,
            read_local_asset,
            start_watch_file,
            stop_watch_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
