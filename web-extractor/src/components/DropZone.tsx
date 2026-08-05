import React, { useRef, useState } from 'react';
import { Upload, Film, FileVideo, AlertCircle, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  videoDuration: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  selectedFile,
  videoDuration,
  videoWidth,
  videoHeight,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov|avi|flv|wmv)$/i)) {
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="pdf-panel" style={{ padding: '24px' }}>
      <div className="pdf-panel-header pdf-flex-row pdf-justify-between pdf-items-center">
        <div className="pdf-flex-row pdf-items-center pdf-gap-100">
          <Film size={18} style={{ color: 'var(--color-functional-red)' }} />
          <span className="pdf-text-label-16" style={{ fontWeight: 700 }}>
            1. 비디오 파일 선택 (Local File Input)
          </span>
        </div>
        <span className="pdf-text-copy-13-mono pdf-text-muted">
          100% 사용자 로컬 컴퓨터에서 처리
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mkv,.mov,.avi"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver
              ? '2px dashed var(--color-functional-red)'
              : '2px dashed var(--color-border-default)',
            borderRadius: '12px',
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: isDragOver
              ? 'var(--color-red-light)'
              : 'var(--color-bg-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div className="pdf-flex-col pdf-items-center pdf-gap-150">
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border-default)',
              }}
            >
              <Upload size={24} style={{ color: 'var(--color-functional-red)' }} />
            </div>
            <div>
              <p className="pdf-text-heading-24" style={{ fontSize: '16px', marginBottom: '4px' }}>
                영상을 이곳으로 끌어다 놓거나 클릭하여 선택하세요
              </p>
              <p className="pdf-text-copy-13-mono pdf-text-muted">
                지원 포맷: MP4, WebM, MKV, MOV, AVI (최대 용량 제한 없음)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="pdf-flex-row pdf-items-center pdf-justify-between"
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-default)',
          }}
        >
          <div className="pdf-flex-row pdf-items-center pdf-gap-150">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-red-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-functional-red)',
              }}
            >
              <FileVideo size={24} style={{ color: 'var(--color-functional-red)' }} />
            </div>
            <div className="pdf-flex-col">
              <span className="pdf-text-label-16" style={{ fontSize: '15px', fontWeight: 700 }}>
                {selectedFile.name}
              </span>
              <div className="pdf-flex-row pdf-gap-150 pdf-text-copy-13-mono pdf-text-muted" style={{ marginTop: '2px' }}>
                <span>용량: {formatFileSize(selectedFile.size)}</span>
                {videoWidth && videoHeight && (
                  <span>해상도: {videoWidth}x{videoHeight}</span>
                )}
                {videoDuration && (
                  <span>길이: {Math.floor(videoDuration)}초</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="pdf-secondary-btn pdf-btn-sm"
          >
            다른 파일 선택
          </button>
        </div>
      )}
    </div>
  );
};
