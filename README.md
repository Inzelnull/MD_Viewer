# Markdown Preview GUI Viewer

[![Tauri Version](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-orange.svg?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v6-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

Visual Studio Code の Markdown Preview のような、リッチで高速なMarkdown閲覧専用デスクトップGUIアプリケーションです。
**Tauri v2** + **React** + **TypeScript** + **Vite** で構築されており、個人製ライブラリを極力排除した高セキュリティ・低依存アーキテクチャを採用しています。

---

## ✨ 主な機能

1. **リッチなMarkdownレンダリング (GFM対応)**
   - GitHub Flavored Markdown（テーブル、タスクリスト、取り消し線など）
   - VS Code風のシンタックスハイライト付きコードブロック（言語バッジ、ワンクリックコードコピー）
   - GitHub Alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`)
   - LaTeX 数式レンダリング（KaTeX対応: インライン `$E=mc^2$`、ブロック `$$\int...$$`）
   - Mermaid ダイアグラム描画（フローチャート、シーケンス図等）
   - 相対パス画像・ローカル画像の自動解決・表示
2. **複数タブ閲覧 (Multi-Tab)**
   - 複数のMarkdownファイルをタブで並列に開いて瞬時に切り替え
   - タブの個別クローズ、他タブ一括クローズ、中クリックで閉じる、閉じたタブの復元 (`Ctrl+Shift+T`)
   - 同名ファイルを開いた場合の親フォルダ名自動識別ヒント表示
3. **目次 (Table of Contents) サイドバー**
   - 文書内の見出し（H1〜H6）を自動抽出し階層表示
   - クリックで該当見出しへスムーズスクロール、スクロール位置連動アクティブハイライト
   - ファイルサイズ、行数、文字数、最終更新日時のリアルタイム統計表示
4. **文書内検索 (In-Document Search)**
   - `Ctrl+F` による高速キーワード検索、一致箇所の黄色ハイライト
   - 前後の一致箇所へのジャンプ（`Enter` / `Shift+Enter`）
5. **ファイル監視 & 自動更新 (Live Watch)**
   - 外部エディタ（VS Code、メモ帳など）でMarkdownを保存すると、ビューワー側が自動で検知・同期
6. **テーマ切り替え & 永続化**
   - **システム設定に合わせる（デフォルト）**（OSのダーク/ライトモードに連動）
   - **ホワイトモード** / **ダークモード**
   - 設定は次回起動時にも自動で引き継がれます
7. **デュアルディスプレイ・マルチモニター対応**
   - 起動元フォルダー（エクスプローラー）があるディスプレイを自動検出し、その画面の中央に起動
8. **サプライチェーン・セキュリティ配慮設計**
   - 個人クレート（`rfd`, `notify`, `base64`, `mime_guess`）やアイコンパッケージ（`lucide-react`）を完全撤廃し、Rust標準／OS標準API／自作SVGコンポーネントへ置換

---

## 💾 実行ファイル・インストーラーの配置場所

プロダクションビルド済みの実行ファイルおよびインストーラーは、以下のパスに出力されます。

| 種別 | パス | 説明 |
| :--- | :--- | :--- |
| **単体実行ファイル (ポータブル版)** | [`src-tauri/target/release/md-viewer.exe`](./src-tauri/target/release/md-viewer.exe) | インストール不要で即時起動可能なスタンドアロンEXE |
| **NSIS インストーラー** | [`src-tauri/target/release/bundle/nsis/md-viewer_0.1.0_x64-setup.exe`](./src-tauri/target/release/bundle/nsis/md-viewer_0.1.0_x64-setup.exe) | 標準的なWindows向けセットアップインストーラー |
| **WiX / MSI インストーラー** | [`src-tauri/target/release/bundle/msi/md-viewer_0.1.0_x64_en-US.msi`](./src-tauri/target/release/bundle/msi/md-viewer_0.1.0_x64_en-US.msi) | 企業導入や一括配布に適したWindows Installerパッケージ |

---

## ⌨️ キーボードショートカット一覧

| ショートカット | 機能 |
| :--- | :--- |
| **Ctrl + O** / **Ctrl + T** | ファイルを開く（新しいタブでオープン） |
| **Ctrl + W** | 現在のタブを閉じる |
| **Ctrl + Shift + T** | 直前に閉じたタブを復元 |
| **Ctrl + Tab** / **Ctrl + Shift + Tab** | 次 / 前のタブへ切り替え |
| **Ctrl + F** | 文書内検索バーの表示 / 非表示 |
| **Ctrl + B** | 目次サイドバーの表示 / 非表示 |
| **F5** / **Ctrl + R** | 現在のファイルを再読み込み |
| **F11** | 全画面モードの切り替え |
| **Ctrl + +** / **Ctrl + =** | 拡大（Zoom In） |
| **Ctrl + -** | 縮小（Zoom Out） |
| **Ctrl + 0** | 拡大率を 100% にリセット |
| **Ctrl + P** | 印刷 / PDFエクスポート |

---

## 🚀 開発・ビルド手順

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
ビルド完了後、上記の「実行ファイル・インストーラーの配置場所」に各バイナリが生成されます。

---

## 📦 サードパーティライブラリ一覧
使用している外部クレート・パッケージ一覧およびライセンスについては [THIRD_PARTY_LIBRARIES.md](./THIRD_PARTY_LIBRARIES.md) をご覧ください。
また、ライセンス監査記録は [LICENSE_AUDIT.md](./LICENSE_AUDIT.md) に記載されています。
