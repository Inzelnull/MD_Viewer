import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchBarProps {
  /** 検索バーの表示状態 */
  isOpen: boolean;
  /** 検索バーを閉じる関数 */
  onClose: () => void;
  /** 検索文字列 */
  query: string;
  /** 検索文字列変更ハンドラ */
  onQueryChange: (q: string) => void;
  /** 次の一致箇所へ移動 */
  onNext: () => void;
  /** 前の一致箇所へ移動 */
  onPrev: () => void;
  /** 現在の一致インデックス */
  matchIndex: number;
  /** 一致した総件数 */
  totalMatches: number;
}

/**
 * 文書内検索用のフローティングバーコンポーネント (Ctrl+F)
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  onNext,
  onPrev,
  matchIndex,
  totalMatches,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // 検索バーが開いたときに入力欄へフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * キーボード操作のハンドリング（Enter: 次へ、Shift+Enter: 前へ、Esc: 閉じる）
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  return (
    <div className="search-floating-bar">
      <Search size={14} style={{ color: 'var(--text-muted)' }} />
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="文書内を検索..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-count">
        {totalMatches > 0 ? `${matchIndex + 1} / ${totalMatches}` : query ? '一致なし' : ''}
      </span>
      <button
        className="btn btn-icon"
        onClick={onPrev}
        disabled={totalMatches === 0}
        title="前の一致箇所へ (Shift+Enter)"
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="btn btn-icon"
        onClick={onNext}
        disabled={totalMatches === 0}
        title="次の一致箇所へ (Enter)"
      >
        <ChevronDown size={14} />
      </button>
      <button className="btn btn-icon" onClick={onClose} title="検索を閉じる (Esc)">
        <X size={14} />
      </button>
    </div>
  );
};
