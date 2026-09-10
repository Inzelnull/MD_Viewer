use base64::Engine;
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter, State};

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
/// TauriのStateとしてアプリケーション全体で共有されます。
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

/// OSネイティブのファイル選択ダイアログを開き、選択されたMarkdown/テキストファイルのパスを返します。
/// ユーザーがキャンセルした場合は None を返します。
#[tauri::command]
fn open_file_dialog() -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown & Text Files", &["md", "markdown", "mdown", "mkd", "txt"])
        .pick_file();

    file.map(|p| p.to_string_lossy().to_string())
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
/// 相対パスが指定された場合は、Markdownファイルの親ディレクトリ（base_dir）を基準に絶対パスを解決します。
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
/// 外部エディタでファイルが保存（更新）された際、フロントエンドへ `file-changed` イベントを送信します。
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
            // ファイルの更新または作成イベントが発生した場合にフロントエンドへ通知
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

/// Tauri アプリケーションの初期化と起動
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ファイル監視用の状態管理を登録
        .manage(WatcherState::default())
        // 外部URLオープナープラグイン
        .plugin(tauri_plugin_opener::init())
        // フロントエンドから呼び出し可能なRustコマンド群を登録
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
