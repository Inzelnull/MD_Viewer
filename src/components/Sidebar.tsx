import React from 'react';
import { ListCollapse, FileText, Calendar, AlignLeft, HardDrive } from 'lucide-react';
import { TocItem, FileMetadata } from '../types/markdown';

interface SidebarProps {
  /** サイドバーの開閉状態 */
  isOpen: boolean;
  /** サイドバー開閉切り替え関数 */
  onToggle: () => void;
  /** 目次項目リスト */
  tocItems: TocItem[];
  /** 現在スクロール位置にある見出しのID */
  activeHeadingId: string;
  /** ファイルのメタデータ統計情報 */
  metadata: FileMetadata | null;
  /** 目次項目クリック時の選択ハンドラ */
  onSelectHeading: (id: string) => void;
}

/**
 * 目次（Table of Contents）およびファイル統計情報を表示するサイドバーコンポーネント
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  tocItems,
  activeHeadingId,
  metadata,
  onSelectHeading,
}) => {
  /**
   * バイト数を人間が読みやすい単位（KB, MB）に整形
   */
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      {/* サイドバーヘッダー */}
      <div className="sidebar-header">
        <span>Table of Contents</span>
        <button
          className="btn btn-icon"
          onClick={onToggle}
          title="目次サイドバーを閉じる"
        >
          <ListCollapse size={15} />
        </button>
      </div>

      {/* 目次リスト領域 */}
      <div className="toc-container">
        {tocItems.length === 0 ? (
          <div className="empty-toc">見出しが見つかりませんでした</div>
        ) : (
          tocItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className={`toc-item toc-level-${item.level} ${
                activeHeadingId === item.id ? 'active' : ''
              }`}
              onClick={() => onSelectHeading(item.id)}
              title={item.text}
            >
              {item.text}
            </div>
          ))
        )}
      </div>

      {/* フッター：ファイルメタデータ（サイズ、行数、文字数、更新時刻） */}
      {metadata && (
        <div className="sidebar-footer">
          <div className="status-item" title="ファイルサイズ">
            <HardDrive size={13} />
            <span>サイズ: {formatBytes(metadata.sizeBytes)}</span>
          </div>
          <div className="status-item" title="行数・単語数">
            <AlignLeft size={13} />
            <span>
              {metadata.lineCount} 行, {metadata.wordCount} 単語
            </span>
          </div>
          <div className="status-item" title="文字数">
            <FileText size={13} />
            <span>{metadata.charCount} 文字</span>
          </div>
          <div className="status-item" title="最終更新時刻">
            <Calendar size={13} />
            <span>{metadata.lastModifiedFormatted}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
