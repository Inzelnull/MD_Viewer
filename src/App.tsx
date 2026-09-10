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

const THEME_STORAGE_KEY = 'md_viewer_theme_setting';

export function App() {
  const [currentFile, setCurrentFile] = useState<MarkdownFileInfo | null>(null);

  // Theme state with local persistence (default: 'system')
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      return saved as ThemeSetting;
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Listen to OS system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute resolved theme ('light' or 'dark')
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeSetting === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return themeSetting;
  }, [themeSetting, systemIsDark]);

  // Apply data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Save theme setting to localStorage
  const handleThemeSettingChange = (newSetting: ThemeSetting) => {
    setThemeSetting(newSetting);
    localStorage.setItem(THEME_STORAGE_KEY, newSetting);
  };

  // Toggle Fullscreen mode
  const handleToggleFullscreen = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const currentStatus = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!currentStatus);
      setIsFullscreen(!currentStatus);
    } catch {
      // Browser / Fallback fullscreen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  }, []);

  // Load file helper
  const loadFileByPath = useCallback(async (filePath: string) => {
    try {
      const result = await invoke<MarkdownFileInfo>('read_markdown_file', { path: filePath });
      setCurrentFile(result);

      // Start watching file for live reload
      try {
        await invoke('start_watch_file', { path: filePath });
        setIsWatching(true);
      } catch (watchErr) {
        console.warn('Failed to start file watcher:', watchErr);
      }
    } catch (err) {
      console.error('Error loading markdown file:', err);
      alert(`ファイルを開けませんでした: ${err}`);
    }
  }, []);

  // Open file dialog
  const handleOpenFile = async () => {
    try {
      const selectedPath = await invoke<string | null>('open_file_dialog');
      if (selectedPath) {
        await loadFileByPath(selectedPath);
      }
    } catch (err) {
      console.error('Error opening file dialog:', err);
    }
  };

  // Load sample demo
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

  // Listen for Tauri backend file-changed events
  useEffect(() => {
    const unlistenPromise = listen<string>('file-changed', async (event) => {
      if (currentFile && event.payload === currentFile.path) {
        try {
          const freshData = await invoke<MarkdownFileInfo>('read_markdown_file', {
            path: currentFile.path,
          });
          setCurrentFile(freshData);
        } catch (err) {
          console.error('Failed to reload changed file:', err);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [currentFile]);

  // Listen for window drag-and-drop
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

  // Calculate file metadata
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

  // Scroll spy for active heading in TOC
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

  // TOC click handler: smoothly scroll to exact heading position inside previewContainer
  const handleSelectHeading = useCallback((id: string) => {
    const container = previewContainerRef.current;
    const target = document.getElementById(id);
    if (target && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 24;

      container.scrollTo({
        top: Math.max(0, scrollOffset),
        behavior: 'smooth',
      });
      setActiveHeadingId(id);
    }
  }, []);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoomLevel(1.0);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcuts
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

  return (
    <div className="app-container">
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
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
          tocItems={tocItems}
          activeHeadingId={activeHeadingId}
          metadata={metadata}
          onSelectHeading={handleSelectHeading}
        />

        <div className="preview-container" ref={previewContainerRef}>
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
