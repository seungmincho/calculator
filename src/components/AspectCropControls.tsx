'use client'

import { useId } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/aspectRatio'
import { ASPECT_CROP_POSITIONS } from '@/utils/aspectRatioImage'

export interface AspectCropControlsProps { x: number; y: number; canMoveX: boolean; canMoveY: boolean; onChange: (x: number, y: number) => void; disabled?: boolean }
export default function AspectCropControls({ x, y, canMoveX, canMoveY, onChange, disabled = false }: AspectCropControlsProps) {
  const t = useTranslations('aspectRatio'), id = useId()
  return <section data-aspect-crop-controls="" className="min-w-0 space-y-4 rounded-2xl bg-subtle p-4" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} className="font-semibold text-fg">{t('cropPosition.title')}</h4>
    <p className="text-sm text-sub">{t('cropPosition.hint')}</p>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('cropPosition.presets')}>
      {ASPECT_CROP_POSITIONS.map(position => <button key={position.id} type="button" data-aspect-crop-position={position.id}
        disabled={disabled} aria-pressed={x === position.x && y === position.y} onClick={() => onChange(position.x, position.y)}
        className={'min-h-11 min-w-0 rounded-xl px-2 py-2 text-sm whitespace-normal disabled:opacity-40 ' + (x === position.x && y === position.y ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-field')}>
        {t(`cropPosition.positions.${position.id}`)}
      </button>)}
    </div>
    {(['x', 'y'] as const).map(axis => {
      const value = axis === 'x' ? x : y, movable = axis === 'x' ? canMoveX : canMoveY
      return <div key={axis} className="space-y-1">
        <label htmlFor={`${id}-${axis}`} className="flex flex-wrap justify-between gap-2 text-sm font-medium text-body"><span>{t(`cropPosition.${axis}`)}</span><span className="tabular-nums">{t('cropPosition.percent', { value })}</span></label>
        <input id={`${id}-${axis}`} data-aspect-crop-axis={axis} type="range" min={0} max={100} step={1} value={value}
          disabled={disabled || !movable} aria-valuetext={t('cropPosition.percent', { value })} aria-describedby={!movable ? `${id}-${axis}-fixed` : undefined}
          onChange={event => { const next = Number(event.target.value); if (Number.isFinite(next) && next >= 0 && next <= 100) onChange(axis === 'x' ? next : x, axis === 'y' ? next : y) }}
          className="min-h-11 w-full min-w-0 text-base accent-primary disabled:opacity-40" />
        {!movable && <p id={`${id}-${axis}-fixed`} className="text-sm text-sub">{t('cropPosition.fixedAxis')}</p>}
      </div>
    })}
  </section>
}
