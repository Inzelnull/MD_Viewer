# Markdown Preview GUI Viewer

[![Tauri Version](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-orange.svg?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v6-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

Visual Studio Code の Markdown Preview のような、リッチで高速なMarkdown閲覧専用デスクトップGUIアプリケーションです。
**Tauri v2** + **Rust (pulldown-cmark)** + **React** + **TypeScript** + **Vite** で構築されており、個人製・過度に細分化されたライブラリを極力排除した高セキュリティ・低依存アーキテクチャを採用しています。

---

## ✨ 主な機能

1. **リッチなMarkdownレンダリング (Rust基盤 pulldown-cmark + syntect 採用)**
   - **Rust バックエンドパース & 構文着色**: `rustdoc` 公式採用の `pulldown-cmark` と Sublime Text互換の `syntect`（Pure Rust構成）による超高速・メモリ安全な構文解析・着色処理
   - GitHub Flavored Markdown（テーブル、タスクリスト、取り消し線など）
   - VS Code風のシンタックスハイライト付きコードブロック（Rustネイティブ処理、言語バッジ、ワンクリックコードコピー）
   - GitHub Alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`)
   - LaTeX 数式レンダリング（KaTeX対応: インライン `$E=mc^2$`、ブロック `$$\int...$$`）
   - Mermaid ダイアグラム描画（フローチャート、シーケンス図等）
   - 相対パス画像・ローカル画像の自動解決・表示
   - ブラウザ標準 `DOMParser` を活用した自作トランスフォーマーによる軽量レンダリング
2. **複数タブ閲覧 & ドラッグ＆ドロップ並び替え (Multi-Tab & Drag Reorder)**
   - 複数のMarkdownファイルをタブで並列に開いて瞬時に切り替え
   - **タブをクリック＆ドラッグして直感的に並び順序を入れ替え**（インジケーター線表示）
   - タブの個別クローズ、他タブ一括クローズ、中クリック（ホイールクリック）で閉じる
   - 直前に閉じたタブの復元 (`Ctrl+Shift+T` / コンテキストメニュー)
   - 同名ファイルを開いた場合の親フォルダ名自動識別ヒント表示
3. **ファイル関連付け & ダブルクリック起動対応 (File Associations)**
   - **macOS Finder**: Markdownファイルをダブルクリックして直接起動・自動オープン（Apple Events `RunEvent::Opened` 対応）
   - **Windows エクスプローラー**: ファイル関連付けによる直接起動および単一起動（Single Instance）連携
   - ウィンドウへのドラッグ＆ドロップによる即時オープン
4. **目次 (Table of Contents) サイドバー**
   - 文書内の見出し（H1〜H6）を自動抽出し階層表示
   - クリックで該当見出しへスムーズスクロール、スクロール位置連動アクティブハイライト
   - `requestAnimationFrame` スロットリングによる高リフレッシュレートでの滑らかなスクロール
   - ファイルサイズ、行数、単語数、文字数、最終更新日時のリアルタイム統計表示（ゼロアロケーション・単一パス集計）
5. **文書内検索 (In-Document Search)**
   - `Ctrl+F` による高速キーワード検索、一致件数のリアルタイム集計表示
   - 前後の一致箇所へのジャンプ（`Enter` / `Shift+Enter` / 上下矢印ボタン）
6. **ファイル監視 & 自動更新 (Live Watch)**
   - 外部エディタ（VS Code、メモ帳など）でMarkdownを保存すると、ビューワー側が自動で検知・同期
   - 監視スレッド内のバッファ再利用によるアイドル時アロケーションゼロ設計
7. **テーマ切り替え & 永続化**
   - **システム設定に合わせる（デフォルト）**（OSのダーク/ライトモードに連動）
   - **ホワイトモード** / **ダークモード**
   - 設定は次回起動時にも自動で引き継がれます
8. **デュアルディスプレイ・マルチモニター対応**
   - 起動元フォルダーがあるディスプレイを自動検出し、その画面の中央に起動
9. **徹底したサプライチェーン・セキュリティ**
   - フロントエンドの `highlight.js` を完全排除し、Rustネイティブの `syntect` へ統合（UIスレッド負荷ゼロ、JSサプライチェーン脆弱性リスクを根絶）
   - `unifiedjs / wooorm` の 7 パッケージ（推移的依存含め 134 パッケージ）を完全排除
   - 個人製クレート（`rfd`, `notify`, `base64`, `mime_guess`）やアイコンパッケージ（`lucide-react`）を完全撤廃し、Rust標準／OS標準API／自作SVGコンポーネントへ置換

---

## 💾 実行ファイル・インストーラーの配置場所

プロダクションビルド済みの実行ファイルおよびインストーラーは、各プラットフォームごとに以下のパスに出力されます。

### Windows 向け
| 種別 | パス | 説明 |
| :--- | :--- | :--- |
| **単体実行ファイル (ポータブル版)** | [`src-tauri/target/release/md-viewer.exe`](./src-tauri/target/release/md-viewer.exe) | インストール不要で即時起動可能なスタンドアロンEXE |
| **NSIS インストーラー** | [`src-tauri/target/release/bundle/nsis/md-viewer_0.1.0_x64-setup.exe`](./src-tauri/target/release/bundle/nsis/md-viewer_0.1.0_x64-setup.exe) | 標準的なWindows向けセットアップインストーラー |
| **WiX / MSI インストーラー** | [`src-tauri/target/release/bundle/msi/md-viewer_0.1.0_x64_en-US.msi`](./src-tauri/target/release/bundle/msi/md-viewer_0.1.0_x64_en-US.msi) | 企業導入や一括配布に適したWindows Installerパッケージ |

### macOS 向け
| 種別 | パス | 説明 |
| :--- | :--- | :--- |
| **macOS アプリケーション** | [`src-tauri/target/release/bundle/macos/md-viewer.app`](./src-tauri/target/release/bundle/macos/md-viewer.app) | macOS向けアプリケーションバンドル |
| **macOS DMG インストーラー** | [`src-tauri/target/release/bundle/dmg/md-viewer_0.1.0_aarch64.dmg`](./src-tauri/target/release/bundle/dmg/md-viewer_0.1.0_aarch64.dmg) | ドラッグ＆ドロップインストール用DMGイメージ |

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

## 📁 プロジェクト構成 (File Structure)

```text
MD_Viewer/
├── src/                          # フロントエンド (React + TypeScript)
│   ├── assets/                   # 静的アセット（画像等）
│   ├── components/               # UIコンポーネント
│   │   ├── AlertBlock.tsx        # GitHub Alerts表示コンポーネント
│   │   ├── CodeBlock.tsx         # シンタックスハイライト・コードブロック (Rust syntect連携)
│   │   ├── Header.tsx            # アプリケーションヘッダー・ツールバー
│   │   ├── MarkdownView.tsx      # Markdownプレビュー描画領域
│   │   ├── MermaidBlock.tsx      # Mermaid図描画コンポーネント
│   │   ├── SearchBar.tsx         # 文書内検索バー
│   │   ├── Sidebar.tsx           # 目次 (TOC) ・文書統計サイドバー
│   │   ├── TabBar.tsx            # ドラッグ＆ドロップ対応タブバー
│   │   ├── WelcomeView.tsx       # ファイル未読込時のウェルカム画面
│   │   └── icons.tsx             # 自作SVGアイコン定義群 (サードパーティ非依存)
│   ├── styles/                   # スタイルシート (CSS)
│   │   ├── components.css        # 各UIコンポーネント用スタイル
│   │   ├── markdown.css          # Markdownレンダリング用スタイル
│   │   ├── syntax.css            # syntect構文ハイライト用スタイル (Dark/Light対応)
│   │   └── theme.css             # カラーテーマ定義 (Light/Dark)
│   ├── types/                    # TypeScript 型定義
│   │   └── markdown.ts           # タブ、目次、設定等の型定義
│   ├── utils/                    # ユーティリティ関数
│   │   ├── domToReact.tsx        # 標準DOMParserベースのHTML→ReactNodeトランスフォーマー
│   │   ├── sampleMarkdown.ts     # 初期表示用サンプルMarkdown
│   │   └── toc.ts                # 目次抽出・統計計算ユーティリティ
│   ├── App.tsx                   # メインアプリケーションコンポーネント
│   ├── App.css                   # 全体レイアウトスタイル
│   └── main.tsx                  # フロントエンドエントリーポイント
│
├── src-tauri/                    # バックエンド (Tauri v2 + Rust)
│   ├── capabilities/             # Tauri v2 権限・ケイパビリティ設定
│   ├── icons/                    # アプリアイコンリソース
│   ├── src/
│   │   ├── lib.rs                # ネイティブ処理 (pulldown-cmark+syntect/ファイル監視/関連付け)
│   │   └── main.rs               # Rustエントリーポイント
│   ├── tests/                    # バックエンド単体・結合テスト
│   │   └── markdown_test.rs      # pulldown-cmark + syntect HTML出力テスト
│   ├── Cargo.toml                # Rust依存関係定義 (pulldown-cmark, syntect追加)
│   └── tauri.conf.json           # Tauri設定ファイル (クロスプラットフォーム対応)
│
├── LICENSE                       # MITライセンス
├── LICENSE_AUDIT.md              # ライセンス監査・サプライチェーン監査記録
├── package.json                  # Node.js依存関係・スクリプト定義
├── README.md                     # 本ドキュメント
├── THIRD_PARTY_LIBRARIES.md      # サードパーティライセンス一覧
└── vite.config.ts                # Viteビルド設定
```

---

## 🚀 開発・ビルド手順

### 動作前提条件
- **Node.js**: v18+
- **Rust**: 1.75+

### 開発起動
```bash
# 依存関係のインストール
npm install

# 開発モード起動 (Vite + Tauri)
npm run tauri dev
```

### プロダクションビルド
```bash
npm run tauri build
```
ビルド完了後、上記の「実行ファイル・インストーラーの配置場所」に各バイナリが生成されます。

---

## 📦 サードパーティライブラリ一覧
使用している外部クレート・パッケージ一覧およびライセンスについては [THIRD_PARTY_LIBRARIES.md](./THIRD_PARTY_LIBRARIES.md) をご覧ください。
また、ライセンス監査記録は [LICENSE_AUDIT.md](./LICENSE_AUDIT.md) に記載されています。
