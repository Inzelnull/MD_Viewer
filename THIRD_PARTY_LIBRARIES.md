# 使用サードパーティ（標準外）ライブラリ一覧

本プロジェクト（Markdown Preview GUI Viewer）で使用しているサードパーティ製ライブラリ、用途、ライセンスの一覧です。
サプライチェーン攻撃・マルウェアリスク低減のため、個人や小規模有志が管理するクレート・パッケージ（`rfd`, `notify`, `base64`, `mime_guess`, `lucide-react` 等）は**Rust標準機能／OS標準API／純粋自作コンポーネントへ置き換え・完全排除**されており、残る依存関係は巨大テック企業・公的標準化財団（Tauri Foundation, Rust Core, Meta, Microsoft 等）が管理する高信頼性パッケージ（Tier 1/2）に厳選されています。

---

## 1. Rust バックエンド（Cargo クレート）

| パッケージ名 | バージョン | 用途・説明 | 管理主体 | ライセンス |
| :--- | :--- | :--- | :--- | :--- |
| **tauri** | `^2.11` | デスクトップアプリケーションフレームワーク本体 | Tauri Foundation / The Commons Conservancy | MIT or Apache-2.0 |
| **tauri-build** | `^2.6` | Tauri ビルドスクリプト用マクロ・ユーティリティ | Tauri Foundation | MIT or Apache-2.0 |
| **tauri-plugin-opener** | `^2.5` | 外部URL・ブラウザ連携プラグイン | Tauri Foundation | MIT or Apache-2.0 |
| **tauri-plugin-single-instance** | `^2.4` | アプリケーションの単一起動制御・外部ファイルオープン連携 | Tauri Foundation | MIT or Apache-2.0 |
| **serde** | `^1.0` | Rust データ構造のシリアライズ / デシリアライズ | Rust Core Team / dtolnay | MIT or Apache-2.0 |
| **serde_json** | `^1.0` | JSON データのシリアライズ / パース | Rust Core Team / dtolnay | MIT or Apache-2.0 |

> **自前化・標準API化により排除したクレート**:
> - `rfd` → Windows標準API（PowerShell / Win32 ダイアログ連携）へ自前化
> - `notify` → Rust標準スレッド＋タイムスタンプポーリング監視へ自前化
> - `mime_guess` → Rust標準の拡張子マッチング関数（`guess_mime_type`）へ自前化
> - `base64` → Rust標準のビット演算エンコーダ（`encode_base64`）へ自前化

---

## 2. フロントエンド（Node.js / npm パッケージ）

### 2.1 実行時依存パッケージ (Dependencies)

| パッケージ名 | バージョン | 用途・説明 | 管理主体 | ライセンス |
| :--- | :--- | :--- | :--- | :--- |
| **react** | `^19.1` | ユーザーインターフェース構築用UIライブラリ | Meta Platforms, Inc. | MIT |
| **react-dom** | `^19.1` | React の DOM レンダリング用パッケージ | Meta Platforms, Inc. | MIT |
| **@tauri-apps/api** | `^2.11` | Tauri IPC通信・イベントハンドリング用JSクライアント | Tauri Foundation | MIT or Apache-2.0 |
| **@tauri-apps/plugin-opener** | `^2.5` | 外部ブラウザ・URL起動用TauriプラグインAPI | Tauri Foundation | MIT or Apache-2.0 |
| **react-markdown** | `^10.1` | React 向け Markdown レンダリングコンポーネント | unifiedjs / wooorm | MIT |
| **remark-gfm** | `^4.0` | GitHub Flavored Markdown 拡張構文（表、タスクリスト、取り消し線など） | unifiedjs / wooorm | MIT |
| **remark-math** | `^6.0` | LaTeX 数式記法（`$...$`, `$$...$$`）の構文解析 | unifiedjs / wooorm | MIT |
| **rehype-katex** | `^7.0` | 数式 AST を KaTeX HTML 構造へ変換 | unifiedjs / wooorm | MIT |
| **katex** | `^0.18` | 高速な数式レンダリングライブラリ本体・CSSフォント | Khan Academy | MIT |
| **rehype-raw** | `^7.0` | Markdown 内の安全な HTML タグの描画サポート | unifiedjs / wooorm | MIT |
| **rehype-slug** | `^6.0` | 見出し（H1〜H6）への自動アンカー ID 付与（目次連動用） | unifiedjs / wooorm | MIT |
| **rehype-highlight** | `^7.0` | コードブロックのシンタックスハイライト | unifiedjs / wooorm | MIT |
| **highlight.js** | `^11.12` | シンタックスハイライトエンジン本体・テーマ | highlight.js team | BSD-3-Clause |
| **mermaid** | `^11.17` | テキスト記法によるダイアグラム（フローチャート、シーケンス図等）生成 | mermaid-js team | MIT |

> **自前化により排除したパッケージ**:
> - `lucide-react` → 自作純粋インラインSVGコンポーネント（`src/components/icons.tsx`）へ完全置換（依存ゼロ）

### 2.2 開発時依存パッケージ (DevDependencies)

| パッケージ名 | バージョン | 用途・説明 | 管理主体 | ライセンス |
| :--- | :--- | :--- | :--- | :--- |
| **vite** | `^8.2` | 高速なフロントエンドビルドツール・開発サーバー | Vite Team / VoidZero | MIT |
| **typescript** | `~6.0` | 静的型付け JavaScript 言語 | Microsoft Corporation | Apache-2.0 |
| **@vitejs/plugin-react** | `^6.1` | Vite 用 React プラグイン | Vite Team | MIT |
| **@tauri-apps/cli** | `^2.11` | Tauri アプリケーションのビルド・開発用 CLI | Tauri Foundation | MIT or Apache-2.0 |
| **@types/react** | `^19.3` | React 向けの TypeScript 型定義 | DefinitelyTyped / MS Community | MIT |
| **@types/react-dom** | `^19.3` | React DOM 向けの TypeScript 型定義 | DefinitelyTyped / MS Community | MIT |

---

*最終更新日: 2026-09-16*

