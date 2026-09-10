// Windowsのリリースビルド時に追加のコンソールウィンドウが開かないようにする設定
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// アプリケーションのエントリーポイント
fn main() {
    // lib.rs で定義された Tauri アプリケーションの実行ルーチンを呼び出します
    md_viewer_lib::run()
}
