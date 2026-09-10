import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  matchIndex: number;
  totalMatches: number;
}

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        placeholder="Find in document..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-count">
        {totalMatches > 0 ? `${matchIndex + 1} of ${totalMatches}` : query ? 'No matches' : ''}
      </span>
      <button
        className="btn btn-icon"
        onClick={onPrev}
        disabled={totalMatches === 0}
        title="Previous match (Shift+Enter)"
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="btn btn-icon"
        onClick={onNext}
        disabled={totalMatches === 0}
        title="Next match (Enter)"
      >
        <ChevronDown size={14} />
      </button>
      <button className="btn btn-icon" onClick={onClose} title="Close search (Esc)">
        <X size={14} />
      </button>
    </div>
  );
};
