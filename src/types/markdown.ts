/**
 * 目次（Table of Contents）の各見出し項目
 */
export interface TocItem {
  /** 見出し要素のDOM ID（例: 'heading-1'） */
  id: string;
  /** 見出しのテキスト内容 */
  text: string;
  /** 見出しレベル (1 = H1, 2 = H2, ..., 6 = H6) */
  level: number;
}

/**
 * Tauri バックエンドから取得するMarkdownファイルの情報
 */
export interface MarkdownFileInfo {
  /** ファイルの絶対パス */
  path: string;
  /** ファイル名（例: README.md） */
  fileName: string;
  /** 親ディレクトリの絶対パス（相対画像パスの解決に使用） */
  parentDir: string;
  /** ファイルのテキスト内容 */
  content: string;
  /** 最終更新日時のタイムスタンプ（ミリ秒） */
  lastModified: number;
}

/**
 * ファイルの統計・メタデータ情報
 */
export interface FileMetadata {
  /** ファイルサイズ（バイト） */
  sizeBytes: number;
  /** 単語数 */
  wordCount: number;
  /** 文字数 */
  charCount: number;
  /** 行数 */
  lineCount: number;
  /** フォーマット済み最終更新時刻 */
  lastModifiedFormatted: string;
}

/**
 * ユーザーが選択可能なテーマ設定値
 * - system: OSのダーク/ライト設定に自動連動
 * - light: ホワイトモード（固定）
 * - dark: ダークモード（固定）
 */
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * 実際にDOMに適用されるテーマ（light または dark）
 */
export type ResolvedTheme = 'light' | 'dark';
