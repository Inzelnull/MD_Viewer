import React, { useState } from 'react';
import { FileUp, FolderOpen, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  onOpenFile: () => void;
  onLoadSample: () => void;
  onDropFile?: (file: File) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onOpenFile,
  onLoadSample,
  onDropFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (onDropFile) {
        onDropFile(file);
      }
    }
  };

  return (
    <div
      className="welcome-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`welcome-card ${isDragOver ? 'drag-over' : ''}`}>
        <FileUp className="welcome-icon" />
        <h2 className="welcome-title">Markdown Preview Viewer</h2>
        <p className="welcome-desc">
          Drag and drop any Markdown (<code>.md</code>, <code>.markdown</code>) file here,
          or choose an action below to get started.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn btn-primary" onClick={onOpenFile} style={{ height: 34, padding: '0 16px' }}>
            <FolderOpen size={16} />
            <span>Open Markdown File</span>
          </button>
          <button className="btn" onClick={onLoadSample} style={{ height: 34, padding: '0 16px', border: '1px solid var(--border-color)' }}>
            <Sparkles size={16} />
            <span>Load Demo Markdown</span>
          </button>
        </div>

        <div
          style={{
            marginTop: '24px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'left',
          }}
        >
          <div><strong>Ctrl + O</strong>: Open File</div>
          <div><strong>Ctrl + F</strong>: Find Text</div>
          <div><strong>Ctrl + B</strong>: Toggle TOC Sidebar</div>
          <div><strong>Ctrl + P</strong>: Print / PDF Export</div>
          <div><strong>Ctrl + +/-</strong>: Zoom In / Out</div>
          <div><strong>Ctrl + 0</strong>: Reset Zoom</div>
        </div>
      </div>
    </div>
  );
};
