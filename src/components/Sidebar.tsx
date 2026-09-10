import React from 'react';
import { ListCollapse, FileText, Calendar, AlignLeft, HardDrive } from 'lucide-react';
import { TocItem, FileMetadata } from '../types/markdown';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  tocItems: TocItem[];
  activeHeadingId: string;
  metadata: FileMetadata | null;
  onSelectHeading: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  tocItems,
  activeHeadingId,
  metadata,
  onSelectHeading,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <span>Table of Contents</span>
        <button
          className="btn btn-icon"
          onClick={onToggle}
          title="Toggle Sidebar"
        >
          <ListCollapse size={15} />
        </button>
      </div>

      <div className="toc-container">
        {tocItems.length === 0 ? (
          <div className="empty-toc">No headings found in this document</div>
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

      {metadata && (
        <div className="sidebar-footer">
          <div className="status-item" title="File Size">
            <HardDrive size={13} />
            <span>Size: {formatBytes(metadata.sizeBytes)}</span>
          </div>
          <div className="status-item" title="Lines & Words">
            <AlignLeft size={13} />
            <span>
              {metadata.lineCount} lines, {metadata.wordCount} words
            </span>
          </div>
          <div className="status-item" title="Character count">
            <FileText size={13} />
            <span>{metadata.charCount} characters</span>
          </div>
          <div className="status-item" title="Last modified">
            <Calendar size={13} />
            <span>{metadata.lastModifiedFormatted}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
