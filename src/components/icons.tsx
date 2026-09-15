import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const defaultProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const FolderOpen: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m6 14 1.5-6h13l-2.5 6H6Z" />
    <path d="M4 18h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" />
  </svg>
);

export const PanelLeft: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

export const Search: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const ZoomIn: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="11" x2="11" y1="8" y2="14" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </svg>
);

export const ZoomOut: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </svg>
);

export const Printer: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect width="12" height="8" x="6" y="14" />
  </svg>
);

export const FileCode: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 17 2-2-2-2" />
  </svg>
);

export const Maximize: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const Minimize: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

export const Sun: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

export const Moon: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const Monitor: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

export const Layers: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const ListCollapse: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m3 10 2.5-2.5L3 5" />
    <path d="m3 19 2.5-2.5L3 14" />
    <path d="M10 6h11" />
    <path d="M10 12h11" />
    <path d="M10 18h11" />
  </svg>
);

export const FileText: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

export const Calendar: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export const AlignLeft: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

export const HardDrive: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <line x1="22" x2="2" y1="12" y2="12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <line x1="6" x2="6.01" y1="16" y2="16" />
    <line x1="10" x2="10.01" y1="16" y2="16" />
  </svg>
);

export const Plus: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const X: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const ChevronUp: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export const ChevronDown: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const Check: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Copy: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const Info: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const Lightbulb: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

export const AlertCircle: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export const AlertTriangle: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
);

export const Flame: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
  </svg>
);

export const FileUp: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M12 12v6" />
    <path d="m15 15-3-3-3 3" />
  </svg>
);

export const Sparkles: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg width={size} height={size} {...defaultProps} {...props}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
