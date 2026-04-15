# Liquid Glass 디자인 적용 가이드

> 연봉계산기 리디자인(2026-04-15)에서 확립된 패턴.
> 새 도구 또는 기존 도구 개편 시 이 문서를 기준으로 적용한다.

---

## 1. 핵심 Glass 토큰

컴포넌트 최상단에 상수로 정의한다.

```tsx
const glassCard = 'bg-white/60 dark:bg-white/[0.10] backdrop-blur-2xl border border-white/65 dark:border-white/[0.14] rounded-[28px] shadow-[0_24px_80px_rgba(59,130,246,0.12)] dark:shadow-[0_24px_80px_rgba(2,6,23,0.52),0_0_0_1px_rgba(255,255,255,0.04)]'

const glassInset = 'shadow-[inset_1px_1px_10px_rgba(255,255,255,0.30),inset_0_-1px_10px_rgba(255,255,255,0.10)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.14),inset_0_1px_18px_rgba(255,255,255,0.06),inset_0_-12px_24px_rgba(0,0,0,0.22)]'

const glassInput = 'w-full rounded-2xl border border-white/55 dark:border-white/[0.12] bg-white/70 dark:bg-white/[0.08] backdrop-blur-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50 transition-all'
```

---

## 2. 페이지 배경 (page.tsx)

각 도구 페이지의 배경은 `fixed` 레이어로 구성한다.
단색 배경이면 glass 효과가 보이지 않으므로 반드시 color blob을 배치해야 한다.

```tsx
// page.tsx 래퍼 구조
<div className="min-h-screen py-8 relative">
  {/* Fixed background layer */}
  <div className="fixed inset-0 -z-10">
    {/* Light mode base */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 dark:hidden" />
    {/* Dark mode base — flat dark navy, 보라 금지 */}
    <div className="absolute inset-0 hidden dark:block"
      style={{ background: 'linear-gradient(160deg, #080d1a 0%, #0c1120 50%, #0a0f1c 100%)' }} />

    {/* Color blobs — 5개로 뷰포트 전체 커버 */}
    <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-50 dark:opacity-70"
      style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)' }} />
    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-40 dark:opacity-55"
      style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)' }} />
    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-30 dark:opacity-40"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />
    <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-35 dark:opacity-50"
      style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.20) 0%, transparent 70%)' }} />
    <div className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none opacity-40 dark:opacity-55"
      style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)' }} />
  </div>

  <div className="relative z-10">
    <ToolComponent />
  </div>
</div>
```

### blob 색상 선택 가이드
- 도구 테마에 맞는 색상을 메인 blob으로 사용
- 보색 관계로 2~3가지 색 조합
- 다크 모드 blob opacity: light의 1.3~1.5배

---

## 3. 메인 카드 구조

```tsx
// 기본 섹션 카드
<div className={`${glassCard} ${glassInset} p-6 sm:p-8`}>
  <h2>...</h2>
  ...
</div>

// 2열 레이아웃 (입력 | 결과)
<div className="grid lg:grid-cols-2 gap-8">
  <div className={`${glassCard} ${glassInset} p-6 sm:p-8`}>
    {/* 입력 패널 */}
  </div>
  <div className={`${glassCard} ${glassInset} p-6 sm:p-8`}>
    {/* 결과 패널 */}
  </div>
</div>
```

---

## 4. 결과 Hero 카드 (핵심 숫자 표시)

파란-보라 그라데이션 금지. 프리미엄 다크 glass 사용.

```tsx
<div className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/92 dark:from-black/60 dark:to-slate-900/55 backdrop-blur-2xl border border-white/[0.15] dark:border-white/[0.10] rounded-2xl p-6 sm:p-8 shadow-[0_8px_40px_rgba(15,23,42,0.25)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_1px_1px_0_rgba(255,255,255,0.06)]">
  {/* 배경 accent */}
  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-blue-500/[0.05] pointer-events-none rounded-2xl" />
  {/* 상단 라인 포인트 */}
  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

  <div className="relative">
    {/* 레이블 + 아이콘 */}
    <div className="flex items-start justify-between gap-4 mb-1">
      <p className="text-gray-400 text-sm">월 실수령액</p>
      <TrendingUp className="w-5 h-5 shrink-0 text-emerald-400" />
    </div>

    {/* 핵심 숫자 — text-4xl sm:text-5xl */}
    <div className="text-4xl sm:text-5xl font-bold tracking-tight text-white mt-1 mb-5">
      {formatNumber(mainValue)}<span className="text-2xl sm:text-3xl ml-1 font-semibold text-gray-400">원</span>
    </div>

    {/* 2열 서브 chip */}
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3">
        <div className="text-xs text-gray-400 mb-1">서브 레이블1</div>
        <div className="text-base font-semibold text-white">값1</div>
      </div>
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3">
        <div className="text-xs text-gray-400 mb-1">서브 레이블2</div>
        <div className="text-base font-semibold text-emerald-400">값2</div>
      </div>
    </div>

    {/* 액션 버튼 */}
    <div className="flex flex-wrap gap-2">
      <button className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10] px-4 py-2 rounded-xl text-gray-300 hover:text-white text-sm transition-colors">
        ...
      </button>
    </div>
  </div>
</div>
```

### 도구별 accent 색상 변형
| 도구 유형 | 상단 라인 | 아이콘 | 서브값 |
|-----------|-----------|--------|--------|
| 급여/금융 | `via-emerald-400/60` | `text-emerald-400` | `text-emerald-400` |
| 세금 | `via-amber-400/60` | `text-amber-400` | `text-amber-400` |
| 건강/BMI | `via-blue-400/60` | `text-blue-400` | `text-blue-400` |
| 대출 | `via-indigo-400/60` | `text-indigo-400` | `text-indigo-400` |

---

## 5. 인풋 컴포넌트

### 텍스트 input
```tsx
<input
  className={`${glassInput} px-4 py-3`}
  // 큰 입력(연봉): px-4 py-4 text-lg font-semibold pr-14
/>
```

### Select
```tsx
<select className={`${glassInput} px-3 py-3`}>
  ...
</select>
```

### 연봉/월급 타입 토글 (라디오 대신 pill toggle)
```tsx
<div className="flex p-1 rounded-2xl bg-white/40 dark:bg-white/[0.06] border border-white/50 dark:border-white/[0.10] backdrop-blur-lg">
  {(['annual', 'monthly'] as const).map((type) => (
    <button
      key={type}
      onClick={() => setType(type)}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        activeType === type
          ? 'bg-white dark:bg-white/[0.20] text-indigo-700 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  ))}
</div>
```

---

## 6. 정보 박스 (Tips / Notice)

색상 배경 금지. glass + 좌측 accent border 사용.

```tsx
{/* ❌ 금지 */}
<div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">

{/* ✅ 올바른 패턴 */}
<div className="bg-white/40 dark:bg-white/[0.05] border-l-4 border-emerald-400/70 border border-white/30 dark:border-white/[0.08] rounded-2xl p-4">
  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">💡 제목</h3>
  <p className="text-sm text-gray-600 dark:text-gray-400">내용</p>
</div>
```

### 색상 코딩이 필요할 때 — 텍스트/border만 사용
```tsx
// 성공/긍정
border-l-4 border-emerald-400/70

// 경고/주의
border-l-4 border-amber-400/70

// 정보
border-l-4 border-blue-400/70

// 위험/세금
border-l-4 border-red-400/70
```

---

## 7. 섹션 구분 카드 (가이드/설명 영역)

```tsx
{/* ❌ 금지 — 그라데이션 배경 */}
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 ...">

{/* ✅ 올바른 패턴 — 배경 없이 내부 구분만 */}
<div className="rounded-2xl p-2">
  <h3>섹션 제목</h3>
  {/* 내부 카드들은 glassCard 사용 */}
</div>
```

---

## 8. 중첩 내부 카드 (sub-card)

```tsx
{/* ❌ 금지 — solid 컬러 */}
<div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-lg">
<div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">

{/* ✅ 올바른 패턴 — 배경 없이 구분선만 */}
<div className="border-b border-white/20 dark:border-white/[0.06] pb-4">

{/* 또는 — 연한 glass */}
<div className="bg-white/50 dark:bg-white/[0.06] border border-white/40 dark:border-white/[0.08] p-3 rounded-xl">
```

---

## 9. 접이식 고급 설정 (details)

선택적 설정 항목은 기본 접힌 상태로.

```tsx
<details className="group rounded-2xl border border-white/45 dark:border-white/[0.10] bg-white/40 dark:bg-white/[0.05] backdrop-blur-xl overflow-hidden">
  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 select-none list-none">
    <span>⚙️ 고급 설정</span>
    <span className="text-gray-400 transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
  </summary>
  <div className="border-t border-white/40 dark:border-white/[0.08] px-5 py-5 space-y-5">
    {/* 내용 */}
  </div>
</details>
```

---

## 10. 아이콘 원형 배경

```tsx
{/* ❌ 금지 — solid 색상 */}
<div className="bg-blue-600 p-3 rounded-full">
  <Icon className="w-6 h-6 text-white" />
</div>

{/* ✅ 올바른 패턴 — tinted glass */}
<div className="bg-blue-500/15 dark:bg-blue-500/20 p-3 rounded-full">
  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
</div>
```

| 색상 | light | dark |
|------|-------|------|
| 파랑 | `bg-blue-500/15` | `dark:bg-blue-500/20` |
| 초록 | `bg-emerald-500/15` | `dark:bg-emerald-500/20` |
| 보라 | `bg-purple-500/15` | `dark:bg-purple-500/20` |
| 주황 | `bg-amber-500/15` | `dark:bg-amber-500/20` |
| 인디고 | `bg-indigo-500/15` | `dark:bg-indigo-500/20` |

---

## 11. 테이블 스타일

```tsx
<div className="overflow-x-auto bg-white/30 dark:bg-white/[0.04] backdrop-blur-sm border border-white/30 dark:border-white/[0.08] rounded-xl">
  <table className="w-full text-sm">
    <thead className="border-b border-white/30 dark:border-white/[0.10]">
      <tr>
        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">...</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/20 dark:divide-white/[0.06]">
      {rows.map((row, index) => (
        <tr
          key={row.id}
          className={`${index % 2 === 0 ? 'bg-white/20 dark:bg-white/[0.03]' : ''} hover:bg-white/40 dark:hover:bg-white/[0.07] transition-colors`}
        >
          ...
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 12. 버튼

```tsx
{/* 기본 액션 버튼 */}
<button className="inline-flex items-center gap-2 bg-white/40 dark:bg-white/[0.08] hover:bg-white/60 dark:hover:bg-white/[0.14] border border-white/40 dark:border-white/[0.12] px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors backdrop-blur-sm">

{/* 다크 hero 내부 버튼 */}
<button className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10] px-4 py-2 rounded-xl text-gray-300 hover:text-white text-sm transition-colors">
```

---

## 13. 금지 패턴 체크리스트

페이지 작업 전 아래 패턴이 있으면 전부 교체한다.

| 금지 패턴 | 대체 |
|-----------|------|
| `bg-blue-50 dark:bg-blue-900/30` | glass + `border-l-4 border-blue-400/70` |
| `bg-green-50 dark:bg-green-900/30` | glass + `border-l-4 border-emerald-400/70` |
| `bg-amber-50 dark:bg-amber-900/30` | glass + `border-l-4 border-amber-400/70` |
| `bg-gradient-to-r from-*-50 to-*-50` | 배경 제거 (`rounded-2xl p-2`) |
| `bg-gradient-to-r from-*-900/30` | 배경 제거 |
| `bg-white dark:bg-gray-800 shadow` | `glassCard glassInset` |
| `bg-gray-50 dark:bg-gray-700` | `bg-white/20 dark:bg-white/[0.03]` |
| `bg-blue-600 rounded-full` (아이콘) | `bg-blue-500/15 rounded-full` |
| `bg-blue-100 dark:bg-blue-800/50` | `bg-white/50 dark:bg-white/[0.06] border ...` |
| `linear-gradient(...purple...)` (배경) | dark navy only (`#080d1a ~ #0a0f1c`) |
| `text-3xl` (핵심 숫자) | `text-4xl sm:text-5xl` |
| `<input type="radio">` (타입 선택) | pill toggle `<button>` |

---

## 14. 적용 순서

1. `page.tsx` 배경 구조 교체 (fixed blob 레이어)
2. 컴포넌트 상단에 `glassCard`, `glassInset`, `glassInput` 토큰 추가
3. 메인 카드들 → `glassCard glassInset`
4. 인풋 → `glassInput`
5. 결과 hero → 다크 glass 템플릿
6. 정보박스 → glass + border-l accent
7. 섹션 그라데이션 배경 → 제거
8. 내부 sub-card → 배경 제거 or 연한 glass
9. 아이콘 원 → tinted glass
10. 테이블 → glass 래퍼 + 투명 교차행
