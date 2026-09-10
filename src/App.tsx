import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MarkdownView } from './components/MarkdownView';
import { SearchBar } from './components/SearchBar';
import { WelcomeView } from './components/WelcomeView';

import { sampleMarkdown } from './utils/sampleMarkdown';
import {
  MarkdownFileInfo,
  FileMetadata,
  ThemeSetting,
  ResolvedTheme,
  TocItem,
} from './types/markdown';

import './styles/theme.css';
import './styles/markdown.css';
import './styles/components.css';

/** テーマ設定をローカルストレージに保存する際のキー名 */
const THEME_STORAGE_KEY = 'md_viewer_theme_setting';

/**
 * Markdown Viewer アプリケーションのルートメインコンポーネント
 * 状態管理、Tauriネイティブ機能連携、キーボードショートカット、UIレイアウトを担当します。
 */
export function App() {
  // -------------------------------------------------------------
  // ステート管理 (State Management)
  // -------------------------------------------------------------

  /** 現在読み込まれているMarkdownファイルの情報 */
  const [currentFile, setCurrentFile] = useState<MarkdownFileInfo | null>(null);

  /**
   * テーマ設定（'system' | 'light' | 'dark'）
   * 初回は localStorage から復元し、存在しない場合は 'system'（システム設定準拠）を初期値とします。
   */
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      return saved as ThemeSetting;
    }
    return 'system';
  });

  /** OSのカラーテーマがダークモードかどうか */
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /** 全画面モード（Fullscreen）の状態 */
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  /** プレビューの拡大縮小率（1.0 = 100%） */
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  /** 目次サイドバーの開閉状態 */
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  /** 文書内検索バーの表示状態 */
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  /** 検索クエリ文字列 */
  const [searchQuery, setSearchQuery] = useState<string>('');

  /** 現在スクロール位置にある見出しのID（TOCのアクティブハイライト用） */
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  /** ファイル監視（Live Watch）中かどうか */
  const [isWatching, setIsWatching] = useState<boolean>(false);

  /** レンダリングされたDOMから抽出された目次項目一覧 */
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  /** プレビュー領域のスクロールコンテナ参照 */
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // テーマ連動・永続化処理 (Theme Handling)
  // -------------------------------------------------------------

  /**
   * OSのテーマ変更（ライト/ダーク）をリアルタイム検知するリスナー
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  /**
   * ユーザー設定とOS状態から、実際に適用するテーマ（'light' または 'dark'）を計算
   */
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeSetting === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return themeSetting;
  }, [themeSetting, systemIsDark]);

  /**
   * 計算されたテーマをルート要素の data-theme 属性に適用
   */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  /**
   * テーマ設定の変更および localStorage への永続化保存
   */
  const handleThemeSettingChange = (newSetting: ThemeSetting) => {
    setThemeSetting(newSetting);
    localStorage.setItem(THEME_STORAGE_KEY, newSetting);
  };

  // -------------------------------------------------------------
  // 全画面モード処理 (Fullscreen Handling)
  // -------------------------------------------------------------

  /**
   * 全画面モードの切り替え（Tauri ネイティブAPI および フォールバックHTML5 API）
   */
  const handleToggleFullscreen = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const currentStatus = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!currentStatus);
      setIsFullscreen(!currentStatus);
    } catch {
      // ブラウザ環境またはTauri API利用不可時のフォールバック
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  }, []);

  // -------------------------------------------------------------
  // ファイル読み込み & 監視処理 (File Loading & Live Watching)
  // -------------------------------------------------------------

  /**
   * 指定パスのMarkdownファイルを読み込み、監視を開始する関数
   */
  const loadFileByPath = useCallback(async (filePath: string) => {
    try {
      // Rustバックエンドからファイル内容を取得
      const result = await invoke<MarkdownFileInfo>('read_markdown_file', { path: filePath });
      setCurrentFile(result);

      // ファイルの更新監視を開始（外部エディタでの保存を自動検知）
      try {
        await invoke('start_watch_file', { path: filePath });
        setIsWatching(true);
      } catch (watchErr) {
        console.warn('ファイル監視の開始に失敗しました:', watchErr);
      }
    } catch (err) {
      console.error('Markdownファイルの読み込みエラー:', err);
      alert(`ファイルを開けませんでした: ${err}`);
    }
  }, []);

  /**
   * ネイティブOSのファイルオープンダイアログを表示
   */
  const handleOpenFile = async () => {
    try {
      const selectedPath = await invoke<string | null>('open_file_dialog');
      if (selectedPath) {
        await loadFileByPath(selectedPath);
      }
    } catch (err) {
      console.error('ファイルダイアログ表示エラー:', err);
    }
  };

  /**
   * デモ用サンプルMarkdownの読み込み
   */
  const handleLoadSample = () => {
    setCurrentFile({
      path: 'Demo Document',
      fileName: 'Demo_Markdown_Preview.md',
      parentDir: '',
      content: sampleMarkdown,
      lastModified: Date.now(),
    });
    setIsWatching(false);
  };

  /**
   * Tauriバックエンドからのファイル変更（file-changed）イベントを購読
   * 外部エディタで保存されたら自動で最新の内容を再読み込みして画面を更新します。
   */
  useEffect(() => {
    const unlistenPromise = listen<string>('file-changed', async (event) => {
      if (currentFile && event.payload === currentFile.path) {
        try {
          const freshData = await invoke<MarkdownFileInfo>('read_markdown_file', {
            path: currentFile.path,
          });
          setCurrentFile(freshData);
        } catch (err) {
          console.error('変更されたファイルの再読み込みに失敗しました:', err);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [currentFile]);

  /**
   * ウィンドウへのドラッグ＆ドロップ（Tauri drag-drop イベント）のリスナー
   */
  useEffect(() => {
    const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
      if (event.payload.paths && event.payload.paths.length > 0) {
        const filePath = event.payload.paths[0];
        if (
          filePath.endsWith('.md') ||
          filePath.endsWith('.markdown') ||
          filePath.endsWith('.mdown') ||
          filePath.endsWith('.txt')
        ) {
          await loadFileByPath(filePath);
        }
      }
    });

    return () => {
      unlistenDrop.then((unlisten) => unlisten());
    };
  }, [loadFileByPath]);

  // -------------------------------------------------------------
  // メタデータ統計計算 (Metadata Statistics)
  // -------------------------------------------------------------

  /**
   * ファイルのサイズ、単語数、文字数、行数、更新日時の統計を算出
   */
  const metadata: FileMetadata | null = useMemo(() => {
    if (!currentFile) return null;
    const content = currentFile.content;
    const lines = content.split('\n').length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    const size = new Blob([content]).size;
    const date = new Date(currentFile.lastModified || Date.now());

    return {
      sizeBytes: size,
      wordCount: words,
      charCount: chars,
      lineCount: lines,
      lastModifiedFormatted: date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  }, [currentFile]);

  // -------------------------------------------------------------
  // スクロール追従 & 目次ジャンプ処理 (Scroll Spy & Jump)
  // -------------------------------------------------------------

  /**
   * スクロール位置に応じて、現在閲覧中の見出しを判定してTOCをアクティブ化
   */
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || !currentFile) return;

    const handleScroll = () => {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const scrollTop = container.scrollTop + 80;

      let currentActive = '';
      headings.forEach((heading) => {
        const top = (heading as HTMLElement).offsetTop;
        if (scrollTop >= top) {
          currentActive = heading.id;
        }
      });

      if (currentActive) {
        setActiveHeadingId(currentActive);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentFile]);

  /**
   * 目次項目クリック時に対象の見出し位置へ正確にスムーズスクロールする処理
   */
  const handleSelectHeading = useCallback((id: string) => {
    const container = previewContainerRef.current;
    const target = document.getElementById(id);
    if (target && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      // 上部余白（24px）を空けてスクロール
      const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 24;

      container.scrollTo({
        top: Math.max(0, scrollOffset),
        behavior: 'smooth',
      });
      setActiveHeadingId(id);
    }
  }, []);

  // -------------------------------------------------------------
  // ズーム & 印刷 (Zoom & Print)
  // -------------------------------------------------------------

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoomLevel(1.0);
  const handlePrint = () => window.print();

  // -------------------------------------------------------------
  // キーボードショートカット (Keyboard Shortcuts)
  // -------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFile, handleToggleFullscreen]);

  // -------------------------------------------------------------
  // JSX レンダリング (Render)
  // -------------------------------------------------------------

  return (
    <div className="app-container">
      {/* 上部ツールバー */}
      <Header
        fileName={currentFile ? currentFile.fileName : null}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenFile={handleOpenFile}
        onOpenSearch={() => setSearchOpen((prev) => !prev)}
        themeSetting={themeSetting}
        onThemeSettingChange={handleThemeSettingChange}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onPrint={handlePrint}
        isWatching={isWatching}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <div className="main-content">
        {/* 左側：目次 (TOC) & メタデータサイドバー */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
          tocItems={tocItems}
          activeHeadingId={activeHeadingId}
          metadata={metadata}
          onSelectHeading={handleSelectHeading}
        />

        {/* 右側：Markdownプレビュー表示領域 */}
        <div className="preview-container" ref={previewContainerRef}>
          {/* 文書内検索バー (Ctrl+F) */}
          <SearchBar
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onNext={() => {}}
            onPrev={() => {}}
            matchIndex={0}
            totalMatches={0}
          />

          {/* ファイル表示 or ウェルカム初期画面 */}
          {currentFile ? (
            <MarkdownView
              content={currentFile.content}
              parentDir={currentFile.parentDir}
              zoomLevel={zoomLevel}
              onHeadingsExtracted={setTocItems}
            />
          ) : (
            <WelcomeView
              onOpenFile={handleOpenFile}
              onLoadSample={handleLoadSample}
              onDropFile={(file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result as string;
                  setCurrentFile({
                    path: file.name,
                    fileName: file.name,
                    parentDir: '',
                    content: text,
                    lastModified: file.lastModified,
                  });
                };
                reader.readAsText(file);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
