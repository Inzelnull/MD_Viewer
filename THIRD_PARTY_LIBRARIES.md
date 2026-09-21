# 使用サードパーティ（標準外）ライブラリ一覧

本プロジェクト（Markdown Preview GUI Viewer）で使用しているサードパーティ製ライブラリ、用途、ライセンスの一覧です。
サプライチェーン攻撃・マルウェアリスク低減のため、個人や小規模有志が管理するクレート・パッケージ群（`rfd`, `notify`, `base64`, `mime_guess`, `lucide-react`、および過度に細分化された `unifiedjs / wooorm` 関連の 7 パッケージ群）は**Rust標準機能／OS標準API／Rust公式エンジン（`pulldown-cmark`）／純粋自作コンポーネントへ置き換え・完全排除**されており、残る依存関係は巨大テック企業・公的標準化財団（Tauri Foundation, Rust Core, Google, Meta, Microsoft 等）が管理する高信頼性パッケージ（Tier 1/2）に厳選されています。

---

## 1. Rust バックエンド（Cargo クレート）

| パッケージ名 | バージョン | 用途・説明 | 管理主体 | ライセンス |
| :--- | :--- | :--- | :--- | :--- |
| **tauri** | `^2.11` | デスクトップアプリケーションフレームワーク本体 | Tauri Foundation / The Commons Conservancy | MIT or Apache-2.0 |
| **tauri-build** | `^2.6` | Tauri ビルドスクリプト用マクロ・ユーティリティ | Tauri Foundation | MIT or Apache-2.0 |
| **tauri-plugin-opener** | `^2.5` | 外部URL・ブラウザ連携プラグイン | Tauri Foundation | MIT or Apache-2.0 |
| **tauri-plugin-single-instance** | `^2.4` | アプリケーションの単一起動制御・外部ファイルオープン連携 | Tauri Foundation | MIT or Apache-2.0 |
| **pulldown-cmark** | `^0.13` | CommonMark準拠の超高速・安全なMarkdown構文解析エンジン（rustdoc採用基盤） | Raph Levien (Google) / Rust Core Community | MIT |
| **serde** | `^1.0` | Rust データ構造のシリアライズ / デシリアライズ | Rust Core Team / dtolnay | MIT or Apache-2.0 |
| **serde_json** | `^1.0` | JSON データのシリアライズ / パース | Rust Core Team / dtolnay | MIT or Apache-2.0 |

| **syntect** | `^5.3` | Sublime Text互換の高速・安全なシンタックスハイライトエンジン（Pure Rust構成 / `bat` 等で採用） | Tristan Hume / syntect team | MIT |

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
| **katex** | `^0.18` | 高速な数式レンダリングライブラリ本体・CSSフォント | Khan Academy | MIT |
| **mermaid** | `^11.17` | テキスト記法によるダイアグラム（フローチャート、シーケンス図等）生成 | mermaid-js team | MIT |

> **自前化・標準API化・Rust移行により排除したパッケージ**:
> - `highlight.js` → **Rust公式基盤の `syntect` バックエンドハイライト** へ完全移行・一掃（フロントエンドのJSサプライチェーン脆弱性リスクを根絶、UIスレッド負荷ゼロ化）
> - `unifiedjs / wooorm` 管理の 7 パッケージ群（`react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-raw`, `rehype-slug`, `rehype-highlight` および関連推移的依存 134 パッケージ）  
>   → **Rust 公式基盤の `pulldown-cmark` バックエンドパース** および **ブラウザ標準 `DOMParser` を活用した自作トランスフォーマー（`src/utils/domToReact.tsx`）** へ完全移行・一掃（特定個人への集中依存およびサプライチェーン脆弱性リスクを根絶）
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

*最終更新日: 2026-09-21*

