import React from 'react';
import {
  Info,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

interface AlertBlockProps {
  type: AlertType;
  children: React.ReactNode;
}

const alertConfig: Record<
  AlertType,
  { title: string; icon: React.ReactNode; className: string }
> = {
  note: {
    title: 'Note',
    icon: <Info size={16} />,
    className: 'markdown-alert markdown-alert-note',
  },
  tip: {
    title: 'Tip',
    icon: <Lightbulb size={16} />,
    className: 'markdown-alert markdown-alert-tip',
  },
  important: {
    title: 'Important',
    icon: <AlertCircle size={16} />,
    className: 'markdown-alert markdown-alert-important',
  },
  warning: {
    title: 'Warning',
    icon: <AlertTriangle size={16} />,
    className: 'markdown-alert markdown-alert-warning',
  },
  caution: {
    title: 'Caution',
    icon: <Flame size={16} />,
    className: 'markdown-alert markdown-alert-caution',
  },
};

export const AlertBlock: React.FC<AlertBlockProps> = ({ type, children }) => {
  const config = alertConfig[type] || alertConfig.note;

  return (
    <div className={config.className}>
      <div className="alert-title">
        {config.icon}
        <span>{config.title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
};
