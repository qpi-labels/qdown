import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'components', 'ChapterContent.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Increment chapters 8 down to 1
for (let i = 8; i >= 1; i--) {
  content = content.replace(new RegExp(`{/\\* CHAPTER ${i} \\*/}`, 'g'), `{/* CHAPTER ${i+1} */}`);
  content = content.replace(new RegExp(`activeChapter === ${i}`, 'g'), `activeChapter === ${i+1}`);
  content = content.replace(new RegExp(`<section id="ch-${i}">`, 'g'), `<section id="ch-${i+1}">`);
  content = content.replace(new RegExp(`<h2 className="pdf-text-heading-32 pdf-mb-100">${i}\\.`, 'g'), `<h2 className="pdf-text-heading-32 pdf-mb-100">${i+1}.`);
}

// Now insert new Chapter 1
const newChapter1 = `      {/* CHAPTER 1 */}
      {activeChapter === 1 && (
        <section id="ch-1">
          <div className="pdf-mb-300">
            <h2 className="pdf-text-heading-32 pdf-mb-100">1. PDF-DS 시작하기 및 설치 가이드</h2>
            <p className="pdf-text-copy-14 pdf-text-muted">
              PDF-DS(Physical-Digital Fusion Design System)는 별도의 프레임워크나 빌드 도구 없이, 오직 CSS 파일 하나만으로도 완벽한 디자인 시스템을 구축할 수 있도록 설계되었습니다.
            </p>
          </div>

          <div className="pdf-mb-300">
            <h3 className="pdf-text-label-16 pdf-mb-100">설치 및 로드 방법 (CDN)</h3>
            <p className="pdf-text-copy-14 pdf-mb-100">
              HTML 문서의 <code>&lt;head&gt;</code> 태그 내에 아래의 jsDelivr CDN 링크를 복사하여 붙여넣으세요. 이 링크는 GitHub 저장소의 원본 CSS를 실시간으로 가져와 적용합니다.
            </p>
            <div className="pdf-code-block pdf-mb-100">
              {\`<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/antigravity/PDF-DS@main/src/index.css" />\`}
            </div>
            <p className="pdf-text-copy-14 pdf-text-muted">
              * 위 코드는 <code>antigravity/PDF-DS</code> 리포지토리의 main 브랜치에 있는 index.css를 불러옵니다. 포크(Fork)하여 사용하실 경우 사용자명(Username) 부분을 변경하세요.
            </p>
          </div>

          <div className="pdf-mb-300">
            <h3 className="pdf-text-label-16 pdf-mb-100">기본 마크업 보일러플레이트 (Boilerplate)</h3>
            <p className="pdf-text-copy-14 pdf-mb-100">
              CSS를 로드한 후, 아래의 HTML 구조를 사용하여 즉시 PDF-DS 앱 레이아웃을 구성할 수 있습니다.
            </p>
            <div className="pdf-code-block pdf-mb-100" style={{ whiteSpace: 'pre-wrap' }}>
{\`<!-- 전체 앱 컨테이너 -->
<div class="pdf-app">
  <!-- 좌측 사이드바 -->
  <aside class="pdf-sidebar">
    <div class="pdf-content-relative pdf-p-300">
      <h1 class="pdf-text-heading-32">PDF-DS System</h1>
    </div>
  </aside>
  <!-- 우측 메인 콘텐츠 뷰 -->
  <main class="pdf-main-view">
    <div class="pdf-panel">
      <h2 class="pdf-text-heading-32">메인 콘텐츠</h2>
      <button class="pdf-btn-primary">시작하기</button>
    </div>
  </main>
</div>\`}
            </div>
          </div>
        </section>
      )}

`;

content = content.replace('{/* CHAPTER 2 */}', newChapter1 + '{/* CHAPTER 2 */}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('ChapterContent.tsx updated successfully.');
