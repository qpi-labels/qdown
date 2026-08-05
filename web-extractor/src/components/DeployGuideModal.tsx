import React from 'react';
import { X, CloudUpload, Terminal, CheckCircle2, Globe } from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="pdf-panel pdf-animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          padding: '28px',
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="pdf-flex-row pdf-justify-between pdf-items-center pdf-mb-200 pdf-border-bottom" style={{ paddingBottom: '16px' }}>
          <div className="pdf-flex-row pdf-items-center pdf-gap-100">
            <CloudUpload size={22} style={{ color: 'var(--color-functional-red)' }} />
            <span className="pdf-text-heading-24" style={{ fontSize: '20px' }}>
              Cloudflare Pages 배포 방법 (Upload Guide)
            </span>
          </div>
          <button onClick={onClose} className="pdf-secondary-btn" style={{ width: '32px', height: '32px', padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div className="pdf-flex-col pdf-gap-200">
          <p className="pdf-text-copy-14 pdf-text-muted">
            이 웹앱은 서버가 필요 없는 100% 브라우저(클라이언트) 전용 어플리케이션입니다. Cloudflare Pages의 무료 플랜으로 간편하게 배포할 수 있습니다.
          </p>

          <div
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--color-border-default)',
            }}
            className="pdf-flex-col pdf-gap-150"
          >
            <div className="pdf-flex-row pdf-items-center pdf-gap-100">
              <Terminal size={18} style={{ color: 'var(--color-functional-red)' }} />
              <span className="pdf-text-label-16" style={{ fontWeight: 700 }}>
                1단계: 정적 웹 빌드 파일 생성
              </span>
            </div>
            <p className="pdf-text-copy-14">`web-extractor` 터미널 폴더에서 빌드 명령어를 실행합니다:</p>
            <div
              style={{
                backgroundColor: '#000000',
                color: '#22c55e',
                fontFamily: 'var(--font-mono)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              npm run build
            </div>
            <span className="pdf-text-copy-13-mono pdf-text-muted">
              ➡ 빌드가 완료되면 `web-extractor/dist` 폴더가 생성됩니다.
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--color-border-default)',
            }}
            className="pdf-flex-col pdf-gap-150"
          >
            <div className="pdf-flex-row pdf-items-center pdf-gap-100">
              <Globe size={18} style={{ color: '#3b82f6' }} />
              <span className="pdf-text-label-16" style={{ fontWeight: 700 }}>
                2단계: Cloudflare 대시보드에서 드래그 & 드롭 업로드
              </span>
            </div>
            <ol className="pdf-list-disc pdf-text-copy-14" style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-functional-red)' }}>
                  Cloudflare 대시보드 ↗
                </a>
                에 로그인 후 <strong>Workers & Pages</strong> 메뉴로 이동합니다.
              </li>
              <li><strong>Create application</strong> ➡ <strong>Pages</strong> ➡ <strong>Upload assets</strong>를 선택합니다.</li>
              <li>생성된 <code>web-extractor/dist</code> 폴더 전체를 파일 업로드 영역에 끌어다 놓습니다.</li>
              <li><strong>Save and Deploy</strong>를 클릭하면 끝! 무료 도메인이 바로 할당됩니다.</li>
            </ol>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-red-light)',
              borderRadius: '8px',
              padding: '14px',
              border: '1px solid var(--color-functional-red)',
            }}
            className="pdf-flex-row pdf-items-center pdf-gap-100"
          >
            <CheckCircle2 size={18} style={{ color: 'var(--color-functional-red)', flexShrink: 0 }} />
            <span className="pdf-text-copy-13-mono" style={{ color: 'var(--color-text-primary)' }}>
              `public/_headers` 파일이 포함되어 있어 Cloudflare Pages 배포 시 WebAssembly 멀티스레드 인코딩 헤더(COOP/COEP)가 자동 적용됩니다.
            </span>
          </div>
        </div>

        <div className="pdf-mt-300 pdf-flex-row pdf-justify-center">
          <button onClick={onClose} className="pdf-btn-primary pdf-w-full">
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
