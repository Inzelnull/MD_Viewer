import React, { useRef, useEffect, useState } from 'react';
import { FileCode, Plus, X } from './icons';
import { TabItem } from '../types/markdown';

interface TabBarProps {
  /** 開いているタブの一覧 */
  tabs: TabItem[];
  /** 現在アクティブなタブのID */
  activeTabId: string | null;
  /** タブ選択時のハンドラ */
  onSelectTab: (tabId: string) => void;
  /** タブを閉じるハンドラ */
  onCloseTab: (tabId: string, e?: React.MouseEvent) => void;
  /** 新規タブ（ファイルを開く）ハンドラ */
  onNewTab: () => void;
  /** タブの並び替えハンドラ */
  onReorderTabs?: (sourceTabId: string, targetTabId: string, position: 'left' | 'right') => void;
  /** 閉じたタブを再度開くハンドラ */
  onRestoreClosedTab?: () => void;
  /** 閉じたタブが復元可能かどうか */
  canRestoreClosedTab?: boolean;
  /** 外部更新が検知されたファイルパスの一覧 */
  pendingUpdatePaths?: string[];
  /** 他のタブをすべて閉じるハンドラ */
  onCloseOtherTabs?: (tabId: string) => void;
  /** すべてのタブを閉じるハンドラ */
  onCloseAllTabs?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

// ファイルパスからファイル名を抽出するフォールバック関数
const getDisplayFileName = (tab: TabItem): string => {
  if (tab.fileName && tab.fileName !== 'Untitled.md' && tab.fileName !== 'Untitled') {
    return tab.fileName;
  }
  if (!tab.filePath || tab.filePath === 'Demo Document') {
    return tab.fileName || 'Demo_Markdown_Preview.md';
  }
  const normalized = tab.filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : (tab.fileName || 'Untitled.md');
};

// 親ディレクトリ名（最後のフォルダ名）を抽出するヘルパー
const getParentFolderName = (parentDir?: string, filePath?: string): string => {
  let dir = parentDir;
  if (!dir && filePath && filePath !== 'Demo Document') {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length > 1) {
      dir = parts.slice(0, -1).join('/');
    }
  }
  if (!dir) return '';
  const normalized = dir.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
};

/**
 * 複数Markdown文書のタブ切り替えバーコンポーネント
 */
export const TabBar: React.FC<TabBarProps> = React.memo(
  ({
    tabs,
    activeTabId,
    onSelectTab,
    onCloseTab,
    onNewTab,
    onReorderTabs,
    onRestoreClosedTab,
    canRestoreClosedTab,
    pendingUpdatePaths,
    onCloseOtherTabs,
    onCloseAllTabs,
  }) => {
    const tabListRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'left' | 'right'>('left');

    const pointerStateRef = useRef<{
      tabId: string | null;
      startX: number;
      startY: number;
      isDragging: boolean;
      targetTabId: string | null;
      position: 'left' | 'right';
    }>({
      tabId: null,
      startX: 0,
      startY: 0,
      isDragging: false,
      targetTabId: null,
      position: 'left',
    });

    // アクティブなタブが変更された際、そのタブが見えるようにスクロール
    useEffect(() => {
      if (activeTabId && tabListRef.current) {
        const activeElement = tabListRef.current.querySelector<HTMLElement>(
          `[data-tab-id="${activeTabId}"]`
        );
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }
    }, [activeTabId]);

    // コンテキストメニュー以外のクリックでメニューを閉じる
    useEffect(() => {
      const handleClickOutside = () => setContextMenu(null);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        tabId,
      });
    };

    const handleAuxClick = (e: React.MouseEvent, tabId: string) => {
      // マウスの中央クリック（ホイールクリック）でタブを閉じる
      if (e.button === 1) {
        e.preventDefault();
        onCloseTab(tabId, e);
      }
    };

    // ポインター（マウスドラッグ）によるタブの並び替え処理
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, tabId: string) => {
      // 左クリックのみ対象
      if (e.button !== 0) return;
      // 閉じるボタンのクリックはドラッグ対象外
      if ((e.target as HTMLElement).closest('.tab-close-btn')) return;

      pointerStateRef.current = {
        tabId,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        targetTabId: null,
        position: 'left',
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const state = pointerStateRef.current;
        if (!state.tabId) return;

        const deltaX = Math.abs(moveEvent.clientX - state.startX);
        const deltaY = Math.abs(moveEvent.clientY - state.startY);

        // 4px 以上動いた時点でドラッグ状態へ移行
        if (!state.isDragging) {
          if (deltaX > 4 || deltaY > 4) {
            state.isDragging = true;
            setDraggedTabId(state.tabId);
          } else {
            return;
          }
        }

        // カーソル下のタブ要素を検索
        const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
        const tabElement = elements.find(
          (el) => el.classList && el.classList.contains('tab-item')
        ) as HTMLElement | undefined;

        if (tabElement) {
          const hoveredTabId = tabElement.getAttribute('data-tab-id');
          if (hoveredTabId) {
            const rect = tabElement.getBoundingClientRect();
            const isRight = moveEvent.clientX - rect.left > rect.width / 2;
            const pos = isRight ? 'right' : 'left';
            state.targetTabId = hoveredTabId;
            state.position = pos;
            setDragOverTabId(hoveredTabId);
            setDropPosition(pos);
            return;
          }
        }

        // カーソルがタブ間や上下に外れている場合、最も近いタブを算出
        if (tabListRef.current) {
          const tabNodes = Array.from(tabListRef.current.querySelectorAll<HTMLElement>('.tab-item'));
          let closestTab: HTMLElement | null = null;
          let minDistance = Infinity;

          for (const node of tabNodes) {
            const rect = node.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const dist = Math.abs(moveEvent.clientX - centerX);
            if (dist < minDistance) {
              minDistance = dist;
              closestTab = node;
            }
          }

          if (closestTab) {
            const hoveredTabId = closestTab.getAttribute('data-tab-id');
            if (hoveredTabId) {
              const rect = closestTab.getBoundingClientRect();
              const isRight = moveEvent.clientX - rect.left > rect.width / 2;
              const pos = isRight ? 'right' : 'left';
              state.targetTabId = hoveredTabId;
              state.position = pos;
              setDragOverTabId(hoveredTabId);
              setDropPosition(pos);
            }
          }
        }
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        const state = pointerStateRef.current;
        if (state.isDragging) {
          // ドラッグ完了：並び替えコールバックを発火
          if (
            state.tabId &&
            state.targetTabId &&
            state.tabId !== state.targetTabId &&
            onReorderTabs
          ) {
            onReorderTabs(state.tabId, state.targetTabId, state.position);
          }
        } else if (state.tabId) {
          // クリック：タブを選択
          onSelectTab(state.tabId);
        }

        state.tabId = null;
        state.isDragging = false;
        state.targetTabId = null;
        setDraggedTabId(null);
        setDragOverTabId(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    };

    // 同名ファイルが存在するか判定するためのファイル名出現数マップ
    const duplicateNameCounts = React.useMemo(() => {
      const counts: Record<string, number> = {};
      tabs.forEach((t) => {
        const name = getDisplayFileName(t);
        counts[name] = (counts[name] || 0) + 1;
      });
      return counts;
    }, [tabs]);

    if (tabs.length === 0) {
      return null;
    }

    return (
      <div className="tab-bar-wrapper">
        <div className="tab-list" ref={tabListRef}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const displayName = getDisplayFileName(tab);
            const isDuplicateName = (duplicateNameCounts[displayName] || 0) > 1;
            const folderHint = isDuplicateName ? getParentFolderName(tab.parentDir, tab.filePath) : '';
            const hasPendingUpdate = pendingUpdatePaths?.includes(tab.filePath);
            const isDragging = tab.id === draggedTabId;
            const isDragOver = tab.id === dragOverTabId && draggedTabId !== tab.id;
            const dragOverClass = isDragOver
              ? dropPosition === 'right'
                ? 'tab-drag-over-right'
                : 'tab-drag-over-left'
              : '';

            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onPointerDown={(e) => handlePointerDown(e, tab.id)}
                onAuxClick={(e) => handleAuxClick(e, tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                className={`tab-item ${isActive ? 'tab-item-active' : ''} ${
                  isDragging ? 'tab-item-dragging' : ''
                } ${dragOverClass}`}
                title={`${displayName}${hasPendingUpdate ? ' (更新あり)' : ''}${
                  tab.filePath ? `\n${tab.filePath}` : ''
                }`}
              >
                <FileCode size={14} className="tab-icon" />
                <span className="tab-title-container">
                  <span className="tab-title">{displayName}</span>
                  {folderHint && <span className="tab-folder-hint">{folderHint}</span>}
                  {hasPendingUpdate && (
                    <span
                      className="tab-update-dot"
                      title="ファイルが更新されました (再読み込み可能)"
                    />
                  )}
                </span>
                <button
                  type="button"
                  className="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id, e);
                  }}
                  title="タブを閉じる (Ctrl+W / 中クリック)"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>



      <div className="tab-actions">
        <button
          type="button"
          className="tab-new-btn"
          onClick={onNewTab}
          title="ファイルを開いて新しいタブを作成 (Ctrl+O / Ctrl+T)"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <div
          className="tab-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="tab-context-menu-item"
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            このタブを閉じる
          </div>
          {canRestoreClosedTab && onRestoreClosedTab && (
            <div
              className="tab-context-menu-item"
              onClick={() => {
                onRestoreClosedTab();
                setContextMenu(null);
              }}
            >
              閉じたタブを再度開く (Ctrl+Shift+T)
            </div>
          )}
          {tabs.length > 1 && onCloseOtherTabs && (
            <div
              className="tab-context-menu-item"
              onClick={() => {
                onCloseOtherTabs(contextMenu.tabId);
                setContextMenu(null);
              }}
            >
              他のタブをすべて閉じる
            </div>
          )}
          {onCloseAllTabs && (
            <div
              className="tab-context-menu-item"
              onClick={() => {
                onCloseAllTabs();
                setContextMenu(null);
              }}
            >
              すべてのタブを閉じる
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TabBar.displayName = 'TabBar';

