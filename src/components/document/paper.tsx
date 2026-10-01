'use client'

// A4 문서 공통 부품: 용지(Page)·서명란(Seal)·표 스타일, PDF 저장·인쇄, 도장 이미지.
// 용지는 인쇄물이라 테마와 무관하게 흰 종이·검정 글씨 + 인라인 스타일(인쇄 iframe·PDF 캡처에 그대로 복제됨).
import type { CSSProperties, ReactNode } from 'react'
import { buildStampSvg } from '@/components/StampGenerator'

export const PAPER_W = 794 // A4 210mm @96dpi
export const PAPER_H = 1123
export const SERIF = '"Batang", "BatangChe", "Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Apple SD Gothic Neo", serif'

const LINE = '1px solid #333'
export const pTable: CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }
export const pTh: CSSProperties = { border: LINE, background: '#f3f3f3', padding: '6px 8px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }
export const pTd: CSSProperties = { border: LINE, padding: '6px 8px', wordBreak: 'keep-all', overflowWrap: 'anywhere' }
export const pNum: CSSProperties = { ...pTd, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

/** A4 한 장. 내용이 넘치면 PDF는 픽셀 단위로 잘려 다음 장으로 이어짐 — 별첨은 새 <Page>로 */
export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-paper-page=""
      style={{
        width: PAPER_W,
        minHeight: PAPER_H,
        boxSizing: 'border-box',
        padding: '76px 80px',
        background: '#ffffff',
        color: '#111111',
        fontFamily: SERIF,
        fontSize: 14,
        lineHeight: 1.85,
        wordBreak: 'keep-all',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** 문서 제목: '차 용 증' (글자 사이 공백은 호출부에서) */
export function PaperTitle({ children }: { children: ReactNode }) {
  return <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, letterSpacing: '0.35em', margin: '0 0 36px' }}>{children}</div>
}

/** 조항: '제1조 (차용금액)' + 본문 */
export function Article({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700 }}>제{no}조 ({title})</div>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  )
}

/** 이름 + (인) — stamp(dataURL)가 있으면 (인) 위에 겹침 */
export function Seal({ name, stamp }: { name: string; stamp?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', paddingRight: 34 }}>
      {name || ' '.repeat(14)}
      <span style={{ position: 'absolute', right: 0, top: 0, color: '#555' }}>(인)</span>
      {stamp && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stamp} alt="" style={{ position: 'absolute', right: -14, top: -16, width: 58, height: 58, objectFit: 'contain', maxWidth: 'none' }} />
      )}
    </span>
  )
}

// ── 내보내기 ────────────────────────────────────────────────────────────────

const pagesOf = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-paper-page]'))

/** 용지(data-paper-page)마다 html2canvas → jsPDF A4. 한글 글꼴 문제 없음(이미지) */
export async function exportPdf(root: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  let first = true
  for (const el of pagesOf(root)) {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1280, // 복제 문서에서 미리보기 열이 보이도록(lg 이상)
      onclone: (d) => d.querySelectorAll<HTMLElement>('[data-paper-zoom]').forEach((z) => (z.style.zoom = '1')),
    })
    const pageH = Math.floor((canvas.width * 297) / 210)
    // ponytail: 한 장을 넘는 용지는 픽셀 단위로 자름 — 줄 중간에서 나뉠 수 있음. 길어질 내용은 양식에서 <Page>를 나눌 것
    for (let y = 0; y < canvas.height; y += pageH) {
      const h = Math.min(pageH, canvas.height - y)
      if (y > 0 && h < 40) break
      const part = document.createElement('canvas')
      part.width = canvas.width
      part.height = h
      part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
      if (!first) pdf.addPage()
      first = false
      pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, (h * 210) / canvas.width)
    }
  }
  pdf.save(`${fileName}.pdf`)
}

/** 용지만 담은 iframe을 인쇄 (페이지 레이아웃과 무관). title = 'PDF로 저장' 기본 파일명 */
export function printPaper(root: HTMLElement, title: string) {
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const d = f.contentDocument
  const w = f.contentWindow
  if (!d || !w) return
  d.open()
  d.write(
    '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0}' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '[data-paper-page]{min-height:auto!important;break-after:page}[data-paper-page]:last-child{break-after:auto}</style></head><body>' +
      pagesOf(root).map((p) => p.outerHTML).join('') +
      '</body></html>',
  )
  d.close()
  d.title = title
  w.onafterprint = () => setTimeout(() => f.remove(), 500)
  setTimeout(() => {
    w.focus()
    w.print()
  }, 300)
}

// ── 도장 ────────────────────────────────────────────────────────────────────

function rasterize(src: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, size / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.width * s))
      c.height = Math.max(1, Math.round(img.height * s))
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}

/** 이름 → 빨간 원형 도장 PNG(dataURL). 2~3글자는 '홍길동인'처럼 '인'을 붙임 */
export function nameStamp(name: string): Promise<string> {
  const text = Array.from(name.replace(/\s/g, '')).slice(0, 6).join('')
  const svg = buildStampSvg(
    {
      text,
      ring: '',
      shape: 'circle',
      suffix: text.length <= 3 ? 'in' : 'none',
      stampStyle: 'traditional',
      customColor: '#CC0000',
      fontStyle: 'serif',
      borderWidth: 6,
      doubleBorder: false,
      opacity: 92,
      ink: true,
    },
    text.length + 3,
  )
  return rasterize('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), 200)
}

/** 업로드한 도장 이미지: 최대 200px, 흰 배경 투명 처리 */
export async function loadStampImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const png = await rasterize(url, 200)
    const img = new Image()
    img.src = png
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 225 && d.data[i + 1] > 225 && d.data[i + 2] > 225) d.data[i + 3] = 0
    }
    ctx.putImageData(d, 0, 0)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
