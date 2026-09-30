/**
 * 결과 공유 카드 이미지 (1080×1350, 토스 스타일). ShareResult 컴포넌트가 사용.
 * 카톡·인스타 피드에 그대로 올릴 수 있는 세로 비율.
 */
export interface ShareCardData {
  /** 도구 이름 (예: '연봉 실수령액 계산기') */
  tool: string
  /** 파랑 블록 위 작은 라벨 (예: '연봉 5,000만원의 월 실수령액') */
  label: string
  /** 파랑 블록 큰 숫자/문구 (예: '3,471,994원') */
  headline: string
  /** 파랑 블록 아래 보조 문구 (선택) */
  sub?: string
  /** 아래 표 (최대 5줄 권장) */
  rows?: { label: string; value: string }[]
  /** 맨 아래 한 줄 (예: '나도 계산해보기 →') */
  cta?: string
}

const W = 1080
const H = 1350
const BLUE = '#3182f6'
const FG = '#191f28'
const MUTED = '#6b7684'
const LINE = '#e5e8eb'
const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 글자가 maxW를 넘으면 폰트를 줄여서 한 줄에 맞춤 */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number) {
  let s = size
  do {
    ctx.font = `${weight} ${s}px ${FONT}`
    if (ctx.measureText(text).width <= maxW) break
    s -= 4
  } while (s > 20)
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / 1024
  ctx.fillStyle = BLUE
  roundRect(ctx, x, y, size, size, 232 * k); ctx.fill()
  ctx.fillStyle = '#fff'
  for (const [rx, ry] of [[232, 232], [532, 232], [232, 532]]) {
    roundRect(ctx, x + rx * k, y + ry * k, 260 * k, 260 * k, 60 * k); ctx.fill()
  }
  ctx.beginPath(); ctx.arc(x + 662 * k, y + 662 * k, 130 * k, 0, Math.PI * 2); ctx.fill()
}

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const pad = 88

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // 헤더: 로고 + 툴허브 · 도구명
  drawLogo(ctx, pad, pad, 72)
  ctx.fillStyle = FG
  ctx.font = `800 40px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('툴허브', pad + 96, pad + 36)
  const brandW = ctx.measureText('툴허브').width
  ctx.fillStyle = MUTED
  fitText(ctx, d.tool, 500, 34, W - pad * 2 - 96 - brandW - 24)
  ctx.fillText(d.tool, pad + 96 + brandW + 20, pad + 38)

  // 파랑 결과 블록
  const bx = pad, by = 240, bw = W - pad * 2, bh = d.sub ? 400 : 340
  ctx.fillStyle = BLUE
  roundRect(ctx, bx, by, bw, bh, 44); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  fitText(ctx, d.label, 600, 40, bw - 120)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(d.label, bx + 60, by + 110)
  ctx.fillStyle = '#ffffff'
  fitText(ctx, d.headline, 800, 124, bw - 120)
  ctx.fillText(d.headline, bx + 60, by + 250)
  if (d.sub) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    fitText(ctx, d.sub, 500, 38, bw - 120)
    ctx.fillText(d.sub, bx + 60, by + 330)
  }

  // 표
  let y = by + bh + 90
  for (const r of (d.rows ?? []).slice(0, 5)) {
    ctx.fillStyle = MUTED
    ctx.font = `500 38px ${FONT}`
    ctx.fillText(r.label, pad + 8, y)
    ctx.fillStyle = FG
    fitText(ctx, r.value, 700, 40, (W - pad * 2) * 0.55)
    const vw = ctx.measureText(r.value).width
    ctx.fillText(r.value, W - pad - 8 - vw, y)
    ctx.fillStyle = LINE
    ctx.fillRect(pad, y + 36, W - pad * 2, 2)
    y += 96
  }

  // 하단: CTA + 주소
  ctx.fillStyle = BLUE
  ctx.font = `700 40px ${FONT}`
  ctx.fillText(d.cta ?? '나도 계산해보기 →', pad, H - pad - 56)
  ctx.fillStyle = MUTED
  ctx.font = `500 34px ${FONT}`
  ctx.fillText('toolhub.ai.kr', pad, H - pad)

  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
}
