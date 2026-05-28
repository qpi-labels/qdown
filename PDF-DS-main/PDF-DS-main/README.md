# 🎛️ PDF-DS (Physical-Digital Fusion Design System)

**PDF-DS**는 물리적 제품의 촉각적 경험과 디지털 인터페이스의 미니멀리즘을 결합한 CSS 디자인 가이드라인 및 라이브러리입니다. 복잡한 설치 없이 여러분의 웹사이트에 빠르고 일관된 디자인 시스템을 적용할 수 있습니다.

<br/>
<a href="http://pdf-ds.qpi.digital" class="pdf-btn-primary pdf-btn-md" style="text-decoration: none;">Design Guideline & 샌드박스 보기</a>
<br/><br/>

---

## 🚀 내 웹사이트에 적용하기 (Getting Started)

PDF-DS는 순수 CSS(Vanilla CSS) 기반으로 작성되어 있어 어떠한 프레임워크(React, Vue, HTML 등)와도 쉽게 호환됩니다.

### 옵션 1. CDN을 통한 빠른 적용 (권장)
가장 쉬운 방법은 HTML 파일의 `<head>` 영역에 아래의 CDN 링크를 추가하는 것입니다.

```html
<!-- index.html -->
<head>
  <!-- ...기타 태그들... -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/qpi-labels/PDF-DS@main/src/index.css">
</head>
```

### 옵션 2. 로컬 파일로 적용
전체 CSS 파일을 다운로드하여 커스터마이징하고 싶다면, `src/index.css` 파일을 프로젝트의 스타일 폴더로 복사한 뒤 임포트하세요.

```javascript
// React/Vue 등 진입점 파일 (예: main.tsx, App.vue)
import './styles/pdf-ds.css'; 
```

---

## 🎨 주요 컴포넌트 사용 가이드 (Usage Guide)

CSS가 로드되었다면, HTML 클래스명(`pdf-`)을 부여하는 것만으로 디자인이 즉시 적용됩니다.

### 1. 기본 레이아웃 구성 (Layout)
전체 앱의 형태를 잡고, 사이드바와 메인 뷰를 나눌 수 있습니다.

```html
<div class="pdf-app">
  <!-- 좌측 사이드바 (데스크탑에서만 노출, 모바일에서는 하단 팝업) -->
  <aside class="pdf-sidebar">
    <nav>
      <div class="pdf-nav-item active">홈</div>
      <div class="pdf-nav-item">설정</div>
    </nav>
  </aside>

  <!-- 우측 메인 콘텐츠 영역 -->
  <main class="pdf-main-view">
    <div class="pdf-main-content">
      <!-- 콘텐츠 입력 -->
    </div>
  </main>
</div>
```

### 2. 버튼 및 인터랙션 (Buttons)
물리적 버튼의 저항감과 형태 변형(Shape-morphing) 애니메이션이 기본적으로 포함되어 있습니다. 사이즈(`sm`, `md`, `lg`)를 조합하여 사용하세요.

```html
<!-- 프라이머리 버튼 (레드 포인트) -->
<button class="pdf-btn-primary pdf-btn-md">
  시작하기
</button>

<!-- 세컨더리 버튼 (모노톤 테두리) -->
<button class="pdf-secondary-btn">
  취소
</button>
```

### 3. 패널 및 카드 (Panels)
정보를 그룹화할 때 사용하는 하드웨어 디스플레이 느낌의 미세한 곡률(Bevel) 패널입니다.

```html
<div class="pdf-panel">
  <div class="pdf-panel-header">
    <h3 class="pdf-text-label-16">시스템 설정</h3>
  </div>
  <p class="pdf-text-copy-14 pdf-text-muted">
    이곳에 세부 설정 내용을 입력합니다.
  </p>
</div>
```

### 4. 타이포그래피 (Typography)
황금비(Golden Ratio) 기반의 시각적 안정감을 주는 폰트 크기 및 굵기를 제공합니다.

```html
<h1 class="pdf-text-heading-72">72px 거대한 헤딩</h1>
<h2 class="pdf-text-heading-32">32px 기본 제목</h2>
<strong class="pdf-text-label-16">16px 강조 라벨</strong>
<p class="pdf-text-copy-14">14px 본문 텍스트입니다. 가독성을 최우선으로 합니다.</p>
```

### 5. 폼 및 입력 창 (Inputs)

```html
<input type="text" class="pdf-input pdf-input-md" placeholder="텍스트를 입력하세요" />
```

---

## 🌙 다크 모드 (Dark Mode)

PDF-DS는 다크 모드를 완벽하게 지원합니다. 다크 모드를 활성화하려면 `<body>` 또는 최상위 부모 컨테이너에 `data-theme="dark"` 속성을 추가하기만 하면 됩니다.

```html
<!-- 다크 모드 활성화 -->
<body data-theme="dark">
  <div class="pdf-app">
    ...
  </div>
</body>
```

---

## 🛠️ 유틸리티 클래스 (Utility Classes)

CSS 파일을 흩트리지 않고 HTML 태그 내에서 간격과 배치를 빠르게 조절할 수 있습니다.

- **Flexbox**: `pdf-flex-row`, `pdf-flex-col`, `pdf-items-center`, `pdf-justify-between`
- **여백 (Margin/Padding)**: `pdf-mt-200`, `pdf-mb-300`, `pdf-p-200`, `pdf-px-200`
- **색상**: `pdf-text-red`, `pdf-text-muted`, `pdf-bg-secondary`
- **시각 효과**: `pdf-shadow-bevel`, `pdf-shadow-glow`

*모든 여백 토큰(`100`, `200`, `300` 등)은 자체 디자인 시스템의 황금비 배수를 따릅니다.*
