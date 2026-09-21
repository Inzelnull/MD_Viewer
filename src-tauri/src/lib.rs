use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex};
use std::thread;
use std::time::{Duration, UNIX_EPOCH};
use syntect::html::{ClassStyle, ClassedHTMLGenerator};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;
use tauri::{AppHandle, Emitter, Manager, State};

/// Sublime Text / TextMate 互換の構文定義セット（初回アクセス時に一度だけ初期化）
static SYNTAX_SET: LazyLock<SyntaxSet> = LazyLock::new(|| SyntaxSet::load_defaults_newlines());


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

/// アプリ起動時または実行中に渡されたファイルパスキュー（macOS double-click や Windows 関連付け対応）
pub struct PendingFilesState(pub Arc<Mutex<Vec<String>>>);

impl Default for PendingFilesState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(Vec::new())))
    }
}

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

/// アプリ起動時に渡された未処理のファイルパス一覧を取得してキューを空にします。
#[tauri::command]
fn get_pending_files(state: State<'_, PendingFilesState>) -> Vec<String> {
    if let Ok(mut guard) = state.0.lock() {
        std::mem::take(&mut *guard)
    } else {
        Vec::new()
    }
}

/// 互換用: アプリ起動時の初期ファイルパスを1件取得します。
#[tauri::command]
fn get_initial_file(state: State<'_, PendingFilesState>) -> Option<String> {
    if let Ok(mut guard) = state.0.lock() {
        if !guard.is_empty() {
            Some(guard.remove(0))
        } else {
            None
        }
    } else {
        None
    }
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

/// ファイルオープン要求を処理し、保留キューへの追加とフロントエンドへのイベント送信を行います
fn notify_file_opened(app: &AppHandle, path: &str) {
    let p = Path::new(path);
    if !p.exists() {
        return;
    }
    let abs_path = match p.canonicalize() {
        Ok(canon) => {
            let s = canon.to_string_lossy().to_string();
            // WindowsのUNCプレフィックス (\\?\) を除去
            #[cfg(target_os = "windows")]
            {
                s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()
            }
            #[cfg(not(target_os = "windows"))]
            {
                s
            }
        }
        Err(_) => path.to_string(),
    };

    if let Some(state) = app.try_state::<PendingFilesState>() {
        if let Ok(mut guard) = state.0.lock() {
            if !guard.contains(&abs_path) {
                guard.push(abs_path.clone());
            }
        }
    }
    let _ = app.emit("open-file-requested", &abs_path);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tauri アプリケーションの初期化と起動
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = env::args().collect();
    let initial_pending = match extract_target_file_from_args(&args) {
        Some(path) => vec![path],
        None => Vec::new(),
    };
    let pending_state = PendingFilesState(Arc::new(Mutex::new(initial_pending)));

    let app = tauri::Builder::default()
        .manage(WatcherState::default())
        .manage(pending_state)
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
                notify_file_opened(app, &file_path);
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            get_initial_file,
            get_pending_files,
            read_markdown_file,
            read_local_asset,
            start_watch_file,
            unwatch_file,
            stop_watch_file,
            render_markdown
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            for url in urls {
                if let Ok(file_path) = url.to_file_path() {
                    let path_str = file_path.to_string_lossy().to_string();
                    notify_file_opened(_app_handle, &path_str);
                }
            }
        }
    });
}

/// pulldown-cmark と syntect を使用して Markdown を HTML 文字列にパース・構文ハイライト変換するコア関数
pub fn parse_markdown_to_html(content: &str) -> String {
    use pulldown_cmark::{html, CodeBlockKind, CowStr, Event, Options, Parser, Tag, TagEnd};

    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_MATH);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    let parser = Parser::new_ext(content, options);

    let mut in_code_block = false;
    let mut code_lang = String::new();
    let mut code_buffer = String::new();
    let mut events = Vec::new();

    for event in parser {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                in_code_block = true;
                code_buffer.clear();
                code_lang = match kind {
                    CodeBlockKind::Fenced(lang) => lang.to_string(),
                    CodeBlockKind::Indented => String::new(),
                };
            }
            Event::End(TagEnd::CodeBlock) => {
                if in_code_block {
                    in_code_block = false;
                    let trimmed_lang = code_lang
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .to_lowercase();

                    if trimmed_lang == "mermaid" {
                        // フロントエンドの Mermaid.js 描画用に標準コードブロックとして保持
                        events.push(Event::Start(Tag::CodeBlock(CodeBlockKind::Fenced(
                            CowStr::Boxed(code_lang.clone().into_boxed_str()),
                        ))));
                        events.push(Event::Text(CowStr::Boxed(
                            code_buffer.clone().into_boxed_str(),
                        )));
                        events.push(Event::End(TagEnd::CodeBlock));
                    } else {
                        // syntect を使用して TextMate クラス付き HTML に変換
                        let syntax = if trimmed_lang.is_empty() {
                            SYNTAX_SET.find_syntax_plain_text()
                        } else {
                            SYNTAX_SET
                                .find_syntax_by_token(&trimmed_lang)
                                .unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text())
                        };

                        let mut generator = ClassedHTMLGenerator::new_with_class_style(
                            syntax,
                            &SYNTAX_SET,
                            ClassStyle::Spaced,
                        );

                        for line in LinesWithEndings::from(&code_buffer) {
                            let _ = generator.parse_html_for_line_which_includes_newline(line);
                        }

                        let highlighted_inner = generator.finalize();
                        let lang_class = if trimmed_lang.is_empty() {
                            String::new()
                        } else {
                            format!(" class=\"language-{}\"", trimmed_lang)
                        };

                        let html = format!(
                            "<pre><code{}>{}</code></pre>\n",
                            lang_class, highlighted_inner
                        );
                        events.push(Event::Html(CowStr::Boxed(html.into_boxed_str())));
                    }
                }
            }
            Event::Text(text) => {
                if in_code_block {
                    code_buffer.push_str(&text);
                } else {
                    events.push(Event::Text(text));
                }
            }
            other => {
                if !in_code_block {
                    events.push(other);
                }
            }
        }
    }

    let mut html_output = String::with_capacity(content.len() * 3 / 2);
    html::push_html(&mut html_output, events.into_iter());
    html_output
}

/// フロントエンドから呼び出される Tauri コマンド
#[tauri::command]
fn render_markdown(content: String) -> Result<String, String> {
    Ok(parse_markdown_to_html(&content))
}

