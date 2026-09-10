# Markdown Preview GUI Viewer

[![Tauri Version](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-orange.svg?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v6-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

Visual Studio Code の Markdown Preview のような、リッチなMarkdown閲覧専用GUIアプリケーションです。
**Tauri v2** + **React** + **TypeScript** + **Vite** で構築されています。

---

## ✨ 主な機能

1. **リッチなMarkdownレンダリング (GFM対応)**
   - GitHub Flavored Markdown（テーブル、タスクリスト、取り消し線など）
   - VS Code風のシンタックスハイライト付きコードブロック（言語バッジ、ワンクリックコードコピー）
   - GitHub Alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`)
   - LaTeX 数式レンダリング（KaTeX対応: インライン `$E=mc^2$`、ブロック `$$\int...$$`）
   - Mermaid ダイアグラム描画（フローチャート、シーケンス図等）
   - 相対パス画像・ローカル画像の安全な読み込み
2. **目次 (Table of Contents) サイドバー**
   - 文書内の見出し（H1〜H6）を自動抽出し階層表示
   - クリックで該当見出しへスムーズスクロール
   - スクロール位置に追従したアクティブハイライト
3. **ファイル監視 & 自動更新 (Live Watch)**
   - 外部エディタ（VS Code、メモ帳など）でMarkdownを保存すると、ビューワー側が自動で即時リロード
4. **テーマ切り替え & 永続化**
   - **システム設定に合わせる（デフォルト）**（OSのダーク/ライトモードに連動）
   - **ホワイトモード**
   - **ダークモード**
   - 設定は次回起動時にも自動で引き継がれます
5. **全画面モード & ズーム**
   - F11キーまたはツールバーボタンで全画面表示の切り替え
   - 拡大・縮小（60% 〜 200%）
6. **ファイル操作 & ドラッグ＆ドロップ**
   - ファイル選択ダイアログ (`Ctrl+O`)
   - ウィンドウへの `.md` ファイルのドラッグ＆ドロップ対応
   - 印刷 / PDF保存 (`Ctrl+P`)

---

## ⌨️ キーボードショートカット一覧

| ショートカット | 機能 |
| :--- | :--- |
| **Ctrl + O** | ファイルを開く（ダイアログ） |
| **Ctrl + F** | 文書内検索バーの表示 / 非表示 |
| **Ctrl + B** | 目次サイドバーの表示 / 非表示 |
| **F11** | 全画面モードの切り替え |
| **Ctrl + +** / **Ctrl + =** | 拡大（Zoom In） |
| **Ctrl + -** | 縮小（Zoom Out） |
| **Ctrl + 0** | 拡大率を 100% にリセット |
| **Ctrl + P** | 印刷 / PDFエクスポート |

---

## 🚀 開発・起動手順

### 動作前提条件
- **Node.js**: v18+
- **Rust**: 1.75+ (MSVC ツールチェーン)

### 開発起動
```bash
# 依存関係のインストール
npm.cmd install

# 開発モード起動 (Vite + Tauri)
npm.cmd run tauri dev
```

### プロダクションビルド
```bash
npm.cmd run tauri build
```

---

## 📦 サードパーティライブラリ一覧
使用している外部クレート・パッケージ一覧およびライセンスについては [THIRD_PARTY_LIBRARIES.md](./THIRD_PARTY_LIBRARIES.md) をご覧ください。
