import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
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
  TabItem,
} from './types/markdown';

import './styles/theme.css';
import './styles/markdown.css';
import './styles/components.css';

/** テーマ設定をローカルストレージに保存する際のキー名 */
const THEME_STORAGE_KEY = 'md_viewer_theme_setting';
/** 複数タブモード設定をローカルストレージに保存する際のキー名 */
const MULTI_TAB_STORAGE_KEY = 'md_viewer_multi_tab_enabled';

/**
 * Markdown Viewer アプリケーションのルートメインコンポーネント
 * 状態管理、Tauriネイティブ機能連携、キーボードショートカット、UIレイアウトを担当します。
 */
export function App() {
  // -------------------------------------------------------------
  // ステート管理 (State Management)
  // -------------------------------------------------------------

  /**
   * 複数タブモードが有効かどうか
   * 初回は localStorage から復元（デフォルト: 有効）
   */
  const [multiTabEnabled, setMultiTabEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(MULTI_TAB_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  /** 開いているタブの一覧 */
  const [tabs, setTabs] = useState<TabItem[]>([]);

  /** 現在アクティブなタブのID */
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  /** 現在アクティブなタブのデータ */
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  /** 現在アクティブなMarkdownファイルの情報（互換用） */
  const currentFile: MarkdownFileInfo | null = useMemo(() => {
    if (!activeTab) return null;
    return {
      path: activeTab.filePath,
      fileName: activeTab.fileName,
      parentDir: activeTab.parentDir,
      content: activeTab.content,
      lastModified: activeTab.lastModified,
    };
  }, [activeTab]);

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

  /**
   * 複数タブモードの切り替えおよび localStorage への永続化保存
   */
  const handleToggleMultiTab = () => {
    const nextValue = !multiTabEnabled;
    setMultiTabEnabled(nextValue);
    localStorage.setItem(MULTI_TAB_STORAGE_KEY, String(nextValue));

    // 複数タブが無効化された場合、現在のアクティブタブのみ残して他を閉じる
    if (!nextValue && tabs.length > 1 && activeTabId) {
      handleCloseOtherTabs(activeTabId);
    }
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
  // タブ操作 & ファイル読み込み (Tab & File Management)
  // -------------------------------------------------------------

  /**
   * 指定パスのMarkdownファイルを読み込み、タブに追加・選択する関数
   */
  const loadFileByPath = useCallback(
    async (filePath: string) => {
      try {
        // Rustバックエンドからファイル内容を取得
        const result = await invoke<MarkdownFileInfo>('read_markdown_file', { path: filePath });

        // 現在のスクロール位置を現在のタブに退避
        const currentScroll = previewContainerRef.current ? previewContainerRef.current.scrollTop : 0;

        setTabs((prevTabs) => {
          // すでに同じパスのタブが開いているか確認
          const existingTab = prevTabs.find((t) => t.filePath === filePath);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            // 最新内容に更新
            return prevTabs.map((t) =>
              t.id === existingTab.id
                ? {
                    ...t,
                    content: result.content,
                    fileName: result.fileName,
                    parentDir: result.parentDir,
                    lastModified: result.lastModified,
                  }
                : t.id === activeTabId
                ? { ...t, scrollTop: currentScroll }
                : t
            );
          }

          const newTabId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          const newTab: TabItem = {
            id: newTabId,
            filePath: result.path,
            fileName: result.fileName,
            parentDir: result.parentDir,
            content: result.content,
            lastModified: result.lastModified,
            scrollTop: 0,
          };

          if (multiTabEnabled) {
            setActiveTabId(newTab.id);
            const updated = prevTabs.map((t) =>
              t.id === activeTabId ? { ...t, scrollTop: currentScroll } : t
            );
            return [...updated, newTab];
          } else {
            // 単一モード：既存タブの監視をすべて解除し、新しいファイルのみにする
            prevTabs.forEach((t) => {
              if (t.filePath && t.filePath !== 'Demo Document') {
                invoke('unwatch_file', { path: t.filePath }).catch(() => {});
              }
            });
            setActiveTabId(newTab.id);
            return [newTab];
          }
        });

        // 監視を開始
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
    },
    [multiTabEnabled, activeTabId]
  );

  /**
   * ネイティブOSのファイルオープンダイアログを表示
   */
  const handleOpenFile = useCallback(async () => {
    try {
      const selectedPath = await invoke<string | null>('open_file_dialog');
      if (selectedPath) {
        await loadFileByPath(selectedPath);
      }
    } catch (err) {
      console.error('ファイルダイアログ表示エラー:', err);
    }
  }, [loadFileByPath]);

  /**
   * タブ切り替え処理（スクロール位置の保存と復元）
   */
  const handleSelectTab = useCallback(
    (targetTabId: string) => {
      if (targetTabId === activeTabId) return;

      // 現在のタブのスクロール位置を保存
      const currentScroll = previewContainerRef.current ? previewContainerRef.current.scrollTop : 0;
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, scrollTop: currentScroll } : t))
      );

      setActiveTabId(targetTabId);

      // 切り替え先タブのスクロール位置を復元
      const targetTab = tabs.find((t) => t.id === targetTabId);
      const targetScroll = targetTab?.scrollTop || 0;
      setTimeout(() => {
        if (previewContainerRef.current) {
          previewContainerRef.current.scrollTop = targetScroll;
        }
      }, 0);
    },
    [activeTabId, tabs]
  );

  /**
   * タブを閉じる処理
   */
  const handleCloseTab = useCallback(
    (tabId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      setTabs((prevTabs) => {
        const tabToClose = prevTabs.find((t) => t.id === tabId);
        if (tabToClose && tabToClose.filePath && tabToClose.filePath !== 'Demo Document') {
          invoke('unwatch_file', { path: tabToClose.filePath }).catch(() => {});
        }

        const nextTabs = prevTabs.filter((t) => t.id !== tabId);

        // 閉じたタブがアクティブだった場合、隣接するタブをアクティブ化
        if (activeTabId === tabId) {
          if (nextTabs.length > 0) {
            const closedIndex = prevTabs.findIndex((t) => t.id === tabId);
            const newIndex = Math.min(closedIndex, nextTabs.length - 1);
            const nextActiveTab = nextTabs[newIndex];
            setActiveTabId(nextActiveTab.id);
            setTimeout(() => {
              if (previewContainerRef.current) {
                previewContainerRef.current.scrollTop = nextActiveTab.scrollTop || 0;
              }
            }, 0);
          } else {
            setActiveTabId(null);
            setIsWatching(false);
          }
        }
        return nextTabs;
      });
    },
    [activeTabId]
  );

  /**
   * 指定タブ以外のすべてのタブを閉じる処理
   */
  const handleCloseOtherTabs = useCallback(
    (keepTabId: string) => {
      setTabs((prevTabs) => {
        prevTabs.forEach((t) => {
          if (t.id !== keepTabId && t.filePath && t.filePath !== 'Demo Document') {
            invoke('unwatch_file', { path: t.filePath }).catch(() => {});
          }
        });
        const kept = prevTabs.filter((t) => t.id === keepTabId);
        setActiveTabId(keepTabId);
        return kept;
      });
    },
    []
  );

  /**
   * すべてのタブを閉じる処理
   */
  const handleCloseAllTabs = useCallback(() => {
    tabs.forEach((t) => {
      if (t.filePath && t.filePath !== 'Demo Document') {
        invoke('unwatch_file', { path: t.filePath }).catch(() => {});
      }
    });
    setTabs([]);
    setActiveTabId(null);
    setIsWatching(false);
  }, [tabs]);

  /**
   * デモ用サンプルMarkdownの読み込み
   */
  const handleLoadSample = useCallback(() => {
    const sampleTabId = 'demo-sample-tab';
    const sampleTab: TabItem = {
      id: sampleTabId,
      filePath: 'Demo Document',
      fileName: 'Demo_Markdown_Preview.md',
      parentDir: '',
      content: sampleMarkdown,
      lastModified: Date.now(),
      scrollTop: 0,
    };

    setTabs((prevTabs) => {
      const existing = prevTabs.find((t) => t.id === sampleTabId);
      if (existing) {
        setActiveTabId(sampleTabId);
        return prevTabs;
      }
      if (multiTabEnabled) {
        setActiveTabId(sampleTab.id);
        return [...prevTabs, sampleTab];
      } else {
        prevTabs.forEach((t) => {
          if (t.filePath && t.filePath !== 'Demo Document') {
            invoke('unwatch_file', { path: t.filePath }).catch(() => {});
          }
        });
        setActiveTabId(sampleTab.id);
        return [sampleTab];
      }
    });
  }, [multiTabEnabled]);

  /**
   * アプリ起動時にコマンドライン引数（Windowsファイル関連付けなど）で渡されたファイルを確認して読み込み
   */
  useEffect(() => {
    invoke<string | null>('get_initial_file')
      .then((initialFile) => {
        if (initialFile) {
          loadFileByPath(initialFile);
        }
      })
      .catch((err) => {
        console.warn('初期ファイルの取得に失敗しました:', err);
      });
  }, [loadFileByPath]);

  /**
   * 既にアプリが起動している状態で別のmdファイルを開いた時（シングルインスタンス連携）のリスナー
   */
  useEffect(() => {
    const unlistenPromise = listen<string>('open-file-requested', async (event) => {
      if (event.payload) {
        await loadFileByPath(event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [loadFileByPath]);

  /**
   * Tauriバックエンドからのファイル変更（file-changed）イベントを購読
   * 外部エディタで保存されたら自動で該当タブの最新内容を再読み込みして更新します。
   */
  useEffect(() => {
    const unlistenPromise = listen<string>('file-changed', async (event) => {
      const changedPath = event.payload;
      if (!changedPath) return;

      try {
        const freshData = await invoke<MarkdownFileInfo>('read_markdown_file', {
          path: changedPath,
        });

        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.filePath === changedPath
              ? {
                  ...tab,
                  content: freshData.content,
                  fileName: freshData.fileName,
                  parentDir: freshData.parentDir,
                  lastModified: freshData.lastModified,
                }
              : tab
          )
        );
      } catch (err) {
        console.error('変更されたファイルの再読み込みに失敗しました:', err);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  /**
   * ウィンドウへのドラッグ＆ドロップ（Tauri drag-drop イベント）のリスナー
   */
  useEffect(() => {
    const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
      if (event.payload.paths && event.payload.paths.length > 0) {
        for (const filePath of event.payload.paths) {
          if (
            filePath.endsWith('.md') ||
            filePath.endsWith('.markdown') ||
            filePath.endsWith('.mdown') ||
            filePath.endsWith('.txt')
          ) {
            await loadFileByPath(filePath);
          }
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
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 't')) {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
      } else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          if (currentIndex !== -1) {
            const nextIndex = e.shiftKey
              ? (currentIndex - 1 + tabs.length) % tabs.length
              : (currentIndex + 1) % tabs.length;
            handleSelectTab(tabs[nextIndex].id);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < tabs.length) {
          e.preventDefault();
          handleSelectTab(tabs[index].id);
        }
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
  }, [
    tabs,
    activeTabId,
    handleToggleFullscreen,
    handleOpenFile,
    handleCloseTab,
    handleSelectTab,
  ]);

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
        multiTabEnabled={multiTabEnabled}
        onToggleMultiTab={handleToggleMultiTab}
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

        {/* 右側：タブバー + Markdownプレビュー表示領域 */}
        <div className="content-area">
          {/* 複数タブバー */}
          {multiTabEnabled && tabs.length > 0 && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onNewTab={handleOpenFile}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseAllTabs={handleCloseAllTabs}
            />
          )}

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
                    const manualTab: TabItem = {
                      id: `dropped_${Date.now()}`,
                      filePath: file.name,
                      fileName: file.name,
                      parentDir: '',
                      content: text,
                      lastModified: file.lastModified,
                      scrollTop: 0,
                    };
                    setTabs((prev) =>
                      multiTabEnabled ? [...prev, manualTab] : [manualTab]
                    );
                    setActiveTabId(manualTab.id);
                  };
                  reader.readAsText(file);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
