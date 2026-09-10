import React from 'react';
import {
  FolderOpen,
  PanelLeft,
  Search,
  ZoomIn,
  ZoomOut,
  Printer,
  FileCode,
  Maximize,
  Minimize,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { ThemeSetting } from '../types/markdown';

interface HeaderProps {
  /** 現在開いているファイル名（未選択時は null） */
  fileName: string | null;
  /** 目次サイドバーの開閉状態 */
  sidebarOpen: boolean;
  /** サイドバー開閉切り替え関数 */
  onToggleSidebar: () => void;
  /** ファイルオープンダイアログを開く関数 */
  onOpenFile: () => void;
  /** 検索バーを開く関数 */
  onOpenSearch: () => void;
  /** 現在のテーマ設定（system, light, dark） */
  themeSetting: ThemeSetting;
  /** テーマ設定変更ハンドラ */
  onThemeSettingChange: (t: ThemeSetting) => void;
  /** 現在の拡大率（ズームスケール） */
  zoomLevel: number;
  /** ズームイン関数 */
  onZoomIn: () => void;
  /** ズームアウト関数 */
  onZoomOut: () => void;
  /** ズームリセット（100%）関数 */
  onZoomReset: () => void;
  /** 印刷・PDF保存呼び出し関数 */
  onPrint: () => void;
  /** ファイル変更監視（Live Watch）中かどうか */
  isWatching: boolean;
  /** 全画面モード状態 */
  isFullscreen: boolean;
  /** 全画面モード切り替え関数 */
  onToggleFullscreen: () => void;
}

/**
 * アプリケーション上部のツールバーコンポーネント
 * ファイル操作、テーマ切替、ズーム、全画面、印刷などのコントロールを提供します。
 */
export const Header: React.FC<HeaderProps> = ({
  fileName,
  sidebarOpen,
  onToggleSidebar,
  onOpenFile,
  onOpenSearch,
  themeSetting,
  onThemeSettingChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onPrint,
  isWatching,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="header-bar">
      {/* 左側エリア：サイドバートグル & ファイルを開くボタン */}
      <div className="header-left">
        <button
          className={`btn btn-icon ${sidebarOpen ? 'btn-active' : ''}`}
          onClick={onToggleSidebar}
          title="目次サイドバーの表示切替 (Ctrl+B)"
        >
          <PanelLeft size={16} />
        </button>

        <button className="btn btn-primary" onClick={onOpenFile} title="ファイルを開く (Ctrl+O)">
          <FolderOpen size={14} />
          <span>ファイルを開く</span>
        </button>
      </div>

      {/* 中央エリア：ファイル名表示 & 監視バッジ */}
      <div className="header-center">
        {fileName ? (
          <div className="file-title" title={fileName}>
            <FileCode size={15} style={{ color: 'var(--accent-color)' }} />
            <span>{fileName}</span>
            {isWatching && (
              <span className="badge" title="自動更新中 - 外部エディタでの保存を自動検知">
                <span className="pulse-dot" style={{ display: 'inline-block', marginRight: 4 }} />
                監視中
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Markdown Preview Viewer
          </span>
        )}
      </div>

      {/* 右側エリア：検索、ズーム、テーマ、全画面、印刷 */}
      <div className="header-right">
        {/* 文書内検索ボタン */}
        <button className="btn btn-icon" onClick={onOpenSearch} title="文書内検索 (Ctrl+F)">
          <Search size={15} />
        </button>

        {/* ズームコントロール */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button className="btn btn-icon" onClick={onZoomOut} title="縮小 (Ctrl+-)" style={{ width: 24, height: 24 }}>
            <ZoomOut size={13} />
          </button>
          <button
            className="btn"
            onClick={onZoomReset}
            title="拡大率リセット (Ctrl+0)"
            style={{ fontSize: '11px', padding: '0 4px', height: 24, minWidth: 42 }}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button className="btn btn-icon" onClick={onZoomIn} title="拡大 (Ctrl++)" style={{ width: 24, height: 24 }}>
            <ZoomIn size={13} />
          </button>
        </div>

        {/* テーマセレクタ（システム設定 / ホワイトモード / ダークモード） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {themeSetting === 'system' && <Monitor size={14} style={{ color: 'var(--text-muted)' }} />}
          {themeSetting === 'light' && <Sun size={14} style={{ color: '#e5a50a' }} />}
          {themeSetting === 'dark' && <Moon size={14} style={{ color: '#6fc3df' }} />}
          <select
            className="select-dropdown"
            value={themeSetting}
            onChange={(e) => onThemeSettingChange(e.target.value as ThemeSetting)}
            title="表示テーマ設定"
          >
            <option value="system">システム設定に合わせる</option>
            <option value="light">ホワイトモード</option>
            <option value="dark">ダークモード</option>
          </select>
        </div>

        {/* 全画面モード切替ボタン */}
        <button
          className={`btn btn-icon ${isFullscreen ? 'btn-active' : ''}`}
          onClick={onToggleFullscreen}
          title={isFullscreen ? '全画面解除 (F11 / Esc)' : '全画面表示 (F11)'}
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>

        {/* 印刷 / PDFエクスポート */}
        <button className="btn btn-icon" onClick={onPrint} title="印刷 / PDF保存 (Ctrl+P)">
          <Printer size={15} />
        </button>
      </div>
    </header>
  );
};
