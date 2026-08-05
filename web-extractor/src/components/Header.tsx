import React from 'react';
import { Cpu, Cloud, HelpCircle, HardDrive, Terminal } from 'lucide-react';

interface HeaderProps {
  onOpenDeployGuide: () => void;
  hardwareConcurrency: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDeployGuide, hardwareConcurrency }) => {
  return (
    <header
      className="pdf-border-bottom pdf-flex-row pdf-items-center pdf-justify-between"
      style={{
        height: '56px',
        padding: '0 24px',
        backgroundColor: 'var(--color-bg-primary)',
        zIndex: 50,
      }}
    >
      {/* Brand & Identity */}
      <div className="pdf-flex-row pdf-items-center pdf-gap-150">
        <img src="/logo.svg" alt="qDown Logo" style={{ width: '28px', height: '28px' }} />
        <div className="pdf-flex-row pdf-items-center pdf-gap-100">
          <span className="pdf-text-heading-24" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            qDown
          </span>
          <span className="pdf-badge pdf-badge-red" style={{ fontSize: '11px', fontWeight: 700 }}>
            WEB EXTRACTOR
          </span>
        </div>
      </div>

      {/* Hardware / Cloudflare Badges */}
      <div className="pdf-flex-row pdf-items-center pdf-gap-150">
        <div
          className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-text-label-14-mono pdf-text-muted"
          style={{ fontSize: '12px', background: 'var(--color-bg-secondary)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-border-default)' }}
        >
          <Cpu size={14} style={{ color: 'var(--color-functional-red)' }} />
          <span>CPU: {hardwareConcurrency || 4} Cores (Client WASM)</span>
        </div>

        <div
          className="pdf-flex-row pdf-items-center pdf-gap-050 pdf-text-label-14-mono pdf-text-muted"
          style={{ fontSize: '12px', background: 'var(--color-bg-secondary)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-border-default)' }}
        >
          <HardDrive size={14} style={{ color: '#22c55e' }} />
          <span>Serverless Zero Backend</span>
        </div>

        <button
          onClick={onOpenDeployGuide}
          className="pdf-secondary-btn pdf-btn-sm"
          style={{ height: '32px', fontSize: '12px', gap: '6px' }}
        >
          <Cloud size={14} style={{ color: '#3b82f6' }} />
          <span>Cloudflare Pages 가이드</span>
          <HelpCircle size={13} />
        </button>
      </div>
    </header>
  );
};
