# 使用サードパーティ（標準外）ライブラリ一覧

本プロジェクト（Markdown Preview GUI Viewer）で使用しているサードパーティ製ライブラリ、用途、ライセンスの一覧です。
ライブラリの追加・削除・更新が行われた際は、本ドキュメントも更新します。

---

## 1. Rust バックエンド（Cargo クレート）

| パッケージ名 | バージョン | 用途・説明 | ライセンス |
| :--- | :--- | :--- | :--- |
| **tauri** | `^2.11` | デスクトップアプリケーションフレームワーク本体 | MIT or Apache-2.0 |
| **tauri-build** | `^2.6` | Tauri ビルドスクリプト用マクロ・ユーティリティ | MIT or Apache-2.0 |
| **tauri-plugin-opener** | `^2.5` | 外部URL・ブラウザ連携プラグイン | MIT or Apache-2.0 |
| **serde** | `^1.0` | Rust データ構造のシリアライズ / デシリアライズ | MIT or Apache-2.0 |
| **serde_json** | `^1.0` | JSON データのシリアライズ / パース | MIT or Apache-2.0 |
| **rfd** (Rusty File Dialog) | `^0.15` | ネイティブOSファイル選択ダイアログの表示 | MIT |
| **notify** | `^6.1` | クロスプラットフォームなファイル変更監視（ホットリロード用） | CC0-1.0 or Artistic-2.0 |
| **base64** | `^0.22` | ローカル画像・アセットをData URL形式へエンコード | MIT or Apache-2.0 |
| **mime_guess** | `^2.0` | ファイル拡張子に基づくMIMEタイプの自動判定 | MIT |

---

## 2. フロントエンド（Node.js / npm パッケージ）

### 2.1 実行時依存パッケージ (Dependencies)

| パッケージ名 | バージョン | 用途・説明 | ライセンス |
| :--- | :--- | :--- | :--- |
| **react** | `^19.1` | ユーザーインターフェース構築用UIライブラリ | MIT |
| **react-dom** | `^19.1` | React の DOM レンダリング用パッケージ | MIT |
| **@tauri-apps/api** | `^2.0` | Tauri IPC通信・イベントハンドリング用JSクライアント | MIT or Apache-2.0 |
| **@tauri-apps/plugin-opener** | `^2.0` | 外部ブラウザ・URL起動用TauriプラグインAPI | MIT or Apache-2.0 |
| **react-markdown** | `^10.1` | React 向け Markdown レンダリングコンポーネント | MIT |
| **remark-gfm** | `^4.0` | GitHub Flavored Markdown 拡張構文（表、タスクリスト、取り消し線など） | MIT |
| **remark-math** | `^6.0` | LaTeX 数式記法（`$...$`, `$$...$$`）の構文解析 | MIT |
| **rehype-katex** | `^7.0` | 数式 AST を KaTeX HTML 構造へ変換 | MIT |
| **katex** | `^0.16` | 高速な数式レンダリングライブラリ本体・CSSフォント | MIT |
| **rehype-raw** | `^7.0` | Markdown 内の安全な HTML タグの描画サポート | MIT |
| **rehype-slug** | `^6.0` | 見出し（H1〜H6）への自動アンカー ID 付与（目次連動用） | MIT |
| **rehype-highlight** | `^7.0` | コードブロックのシンタックスハイライト | MIT |
| **highlight.js** | `^11.11` | シンタックスハイライトエンジン本体・テーマ | BSD-3-Clause |
| **mermaid** | `^11.12` | テキスト記法によるダイアグラム（フローチャート、シーケンス図等）生成 | MIT |
| **lucide-react** | `^1.16` | VS Code風のクリーンなアイコンセット | ISC |

### 2.2 開発時依存パッケージ (DevDependencies)

| パッケージ名 | バージョン | 用途・説明 | ライセンス |
| :--- | :--- | :--- | :--- |
| **vite** | `^8.0` | 高速なフロントエンドビルドツール・開発サーバー | MIT |
| **typescript** | `~6.0` | 静的型付け JavaScript 言語 | Apache-2.0 |
| **@vitejs/plugin-react** | `^6.0` | Vite 用 React (Fast Refresh) プラグイン | MIT |
| **@tauri-apps/cli** | `^2.0` | Tauri アプリケーションのビルド・開発用 CLI | MIT or Apache-2.0 |
| **@types/react** | `^19.1` | React 向けの TypeScript 型定義 | MIT |
| **@types/react-dom** | `^19.1` | React DOM 向けの TypeScript 型定義 | MIT |
| **@types/katex** | `^0.16` | KaTeX 向けの TypeScript 型定義 | MIT |

---

*最終更新日: 2026-09-10*
