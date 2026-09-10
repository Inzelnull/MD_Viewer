export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface MarkdownFileInfo {
  path: string;
  fileName: string;
  parentDir: string;
  content: string;
  lastModified: number;
}

export interface FileMetadata {
  sizeBytes: number;
  wordCount: number;
  charCount: number;
  lineCount: number;
  lastModifiedFormatted: string;
}

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
