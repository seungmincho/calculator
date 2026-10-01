'use client'

// 위임장 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개
import type { CSSProperties, ReactNode } from 'react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, PaperTitle, Seal, pTable, pTh, pTd } from '@/components/document/paper'
import { Section, DateField, TextField, Segmented, Check, PartyFields, labelCls, segCls } from '@/components/document/fields'
import { EMPTY_PARTY, maskId, krDate, docFileName, type Party } from '@/utils/document'
import { addMonths } from '@/utils/dday'
import { PURPOSES, MATTERS, matterList, checkPoa, SEAL_VALID_MONTHS, type Purpose, type PoaCode } from '@/utils/powerOfAttorney'

interface Corp {
  name: string
  rep: string
  regNo: string
}

interface Poa {
  purpose: Purpose
  principalType: 'person' | 'corp'
  principal: Party
  corp: Corp
  agent: Party
  relation: string
  items: string[]
  extra: string
  target: string
  submitTo: string
  periodMode: 'range' | 'done'
  from: string
  to: string
  written: string
  attachId: boolean
  attachSeal: boolean
}

const initial = (today: string): Poa => ({
  purpose: 'resident',
  principalType: 'person',
  principal: { ...EMPTY_PARTY },
  corp: { name: '', rep: '', regNo: '' },
  agent: { ...EMPTY_PARTY },
  relation: '',
  items: [MATTERS.resident[0]],
  extra: '',
  target: '',
  submitTo: '',
  periodMode: 'range',
  from: today,
  to: today ? addMonths(today, 1) : '',
  written: today,
  attachId: true,
  attachSeal: false,
})

// 인감증명서를 함께 내는 게 보통인 용도
const SEAL_USUAL: Purpose[] = ['car', 'bank', 'realty', 'corp']

// ── 검사·안내 ───────────────────────────────────────────────────────────────

const LEVEL: Record<PoaCode, Insight['level']> = {
  noMatters: 'error',
  periodOrder: 'error',
  sealOver6m: 'warn',
  periodLong: 'warn',
  sealForm: 'warn',
  broad: 'warn',
  noTarget: 'info',
}

function insights(v: Poa, t: TFn): Insight[] {
  return checkPoa(v).map((code) => ({ level: LEVEL[code], text: t(`insight.${code}`, { months: SEAL_VALID_MONTHS }) }))
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Form({ v, set, t }: { v: Poa; set: (p: Partial<Poa>) => void; t: TFn }) {
  const pick = (purpose: Purpose) =>
    set({
      purpose,
      items: MATTERS[purpose].slice(0, 1),
      principalType: purpose === 'corp' ? 'corp' : v.principalType,
      attachSeal: SEAL_USUAL.includes(purpose),
    })
  const toggle = (m: string, on: boolean) => set({ items: on ? MATTERS[v.purpose].filter((x) => x === m || v.items.includes(x)) : v.items.filter((x) => x !== m) })
  const docs = t.raw(`docs.${v.purpose}`) as string[]
  const corp = v.principalType === 'corp'
  const setCorp = (p: Partial<Corp>) => set({ corp: { ...v.corp, ...p } })

  return (
    <>
      <Section title={t('section.purpose')} hint={t('sectionHint.purpose')}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('section.purpose')}>
          {PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => pick(p)} className={segCls(v.purpose === p)} aria-pressed={v.purpose === p}>
              {t(`purposes.${p}`)}
            </button>
          ))}
        </div>
        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm font-semibold text-fg">{t('docsTitle')}</p>
          <ul className="mt-2 space-y-1 list-disc pl-4 text-sm text-sub">
            {docs.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      </Section>

      <Section title={t('section.principal')} hint={t('sectionHint.principal')}>
        <Segmented
          label={t('principalType')}
          value={v.principalType}
          onChange={(principalType) => set({ principalType })}
          options={(['person', 'corp'] as const).map((k) => ({ value: k, label: t(`principalTypes.${k}`) }))}
        />
        {corp && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField className="sm:col-span-2" label={t('corp.name')} value={v.corp.name} onChange={(name) => setCorp({ name })} placeholder={t('corp.namePlaceholder')} maxLength={60} />
            <TextField label={t('corp.rep')} value={v.corp.rep} onChange={(rep) => setCorp({ rep })} maxLength={30} />
            <TextField label={t('corp.regNo')} value={v.corp.regNo} onChange={(regNo) => setCorp({ regNo })} placeholder="000000-0000000" inputMode="numeric" maxLength={20} />
          </div>
        )}
        <PartyFields value={v.principal} onChange={(principal) => set({ principal })} hide={corp ? ['name', 'idFront'] : []} />
      </Section>

      <Section title={t('section.agent')} hint={t('sectionHint.agent')}>
        <PartyFields value={v.agent} onChange={(agent) => set({ agent })} />
        <TextField label={t('relation')} value={v.relation} onChange={(relation) => set({ relation })} placeholder={t(corp ? 'relationPlaceholderCorp' : 'relationPlaceholder')} maxLength={20} />
      </Section>

      <Section title={t('section.matters')} hint={t('sectionHint.matters')}>
        {MATTERS[v.purpose].length > 0 && (
          <div className="space-y-2">
            {MATTERS[v.purpose].map((m) => (
              <Check key={m} label={m} checked={v.items.includes(m)} onChange={(on) => toggle(m, on)} />
            ))}
          </div>
        )}
        <TextField label={t('extra')} value={v.extra} onChange={(extra) => set({ extra })} placeholder={t(`extraPlaceholder.${v.purpose === 'custom' ? 'custom' : 'other'}`)} hint={t('extraHint')} rows={3} maxLength={1000} />
        <TextField label={t(`target.${v.purpose}`)} value={v.target} onChange={(target) => set({ target })} placeholder={t(`targetPlaceholder.${v.purpose}`)} maxLength={120} />
        <TextField label={t('submitTo')} value={v.submitTo} onChange={(submitTo) => set({ submitTo })} placeholder={t(`submitToPlaceholder.${v.purpose}`)} maxLength={60} />
      </Section>

      <Section title={t('section.period')}>
        <Segmented
          label={t('periodMode')}
          value={v.periodMode}
          onChange={(periodMode) => set({ periodMode })}
          options={(['range', 'done'] as const).map((k) => ({ value: k, label: t(`periodModes.${k}`) }))}
        />
        {v.periodMode === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <DateField label={t('from')} value={v.from} onChange={(from) => set({ from })} />
            <DateField label={t('to')} value={v.to} min={v.from} onChange={(to) => set({ to })} />
          </div>
        )}
        <DateField label={t('written')} value={v.written} onChange={(written) => set({ written })} />
        <div>
          <p className={labelCls}>{t('attach')}</p>
          <div className="space-y-2">
            <Check label={t(corp ? 'attachIdCorp' : 'attachId')} checked={v.attachId} onChange={(attachId) => set({ attachId })} />
            <Check label={t(corp ? 'attachSealCorp' : 'attachSeal')} hint={t('attachSealHint')} checked={v.attachSeal} onChange={(attachSeal) => set({ attachSeal })} />
          </div>
        </div>
      </Section>
    </>
  )
}

// ── A4 본문 (법률 문서이므로 한국어 고정) ───────────────────────────────────

const lab: CSSProperties = { ...pTh, width: 92 }

const roleCls: CSSProperties = { ...pTh, letterSpacing: '0.1em' }

function PersonRows({ role, p, extra }: { role: ReactNode; p: Party; extra?: [string, string] }) {
  return (
    <>
      <tr>
        <td rowSpan={3} style={roleCls}>{role}</td>
        <td style={lab}>성 명</td>
        <td style={{ ...pTd, height: 36 }}>{p.name}</td>
        <td style={lab}>주민등록번호</td>
        <td style={{ ...pTd, fontVariantNumeric: 'tabular-nums' }}>{maskId(p)}</td>
      </tr>
      <tr>
        <td style={lab}>주 소</td>
        <td colSpan={3} style={pTd}>{p.address}</td>
      </tr>
      <tr>
        <td style={lab}>연 락 처</td>
        <td colSpan={extra ? 1 : 3} style={pTd}>{p.phone}</td>
        {extra && (
          <>
            <td style={lab}>{extra[0]}</td>
            <td style={pTd}>{extra[1]}</td>
          </>
        )}
      </tr>
    </>
  )
}

const Cols = () => (
  <colgroup>
    <col style={{ width: 82 }} />
    <col style={{ width: 92 }} />
    <col />
    <col style={{ width: 110 }} />
    <col style={{ width: 150 }} />
  </colgroup>
)

const corpLabel = (v: Poa) => `${v.corp.name.trim() || ' '.repeat(12)}  대표이사 ${v.corp.rep.trim() || ' '.repeat(8)}`

function Paper({ v, stamps }: { v: Poa; stamps: Record<string, string> }) {
  const corp = v.principalType === 'corp'
  const matters = matterList(v.items, v.extra)
  const period = v.periodMode === 'done' ? `${krDate(v.written)}부터 위임 사무 완료 시까지` : `${krDate(v.from)}부터 ${krDate(v.to)}까지`
  const attach = [
    v.attachId && (corp ? '대리인 재직증명서 또는 신분증 사본 1부' : '위임인 신분증 사본 1부'),
    v.attachSeal && (corp ? '법인인감증명서 1부' : '위임인 인감증명서 1부'),
  ].filter(Boolean) as string[]

  return (
    <Page>
      <PaperTitle>위 임 장</PaperTitle>

      <table style={pTable}>
        <Cols />
        <tbody>
          {corp ? (
            <>
              <tr>
                <td rowSpan={3} style={roleCls}>위 임 인</td>
                <td style={lab}>법 인 명</td>
                <td style={{ ...pTd, height: 36 }}>{v.corp.name}</td>
                <td style={lab}>법인등록번호</td>
                <td style={{ ...pTd, fontVariantNumeric: 'tabular-nums' }}>{v.corp.regNo}</td>
              </tr>
              <tr>
                <td style={lab}>대 표 자</td>
                <td style={pTd}>{v.corp.rep}</td>
                <td style={lab}>연 락 처</td>
                <td style={pTd}>{v.principal.phone}</td>
              </tr>
              <tr>
                <td style={lab}>소 재 지</td>
                <td colSpan={3} style={pTd}>{v.principal.address}</td>
              </tr>
            </>
          ) : (
            <PersonRows role="위 임 인" p={v.principal} />
          )}
          <PersonRows role={<>수 임 인<br />(대리인)</>} p={v.agent} extra={[corp ? '직 위' : '관 계', v.relation]} />
        </tbody>
      </table>

      <table style={{ ...pTable, marginTop: 20 }}>
        <colgroup>
          <col style={{ width: 120 }} />
          <col />
        </colgroup>
        <tbody>
          {v.submitTo.trim() && (
            <tr>
              <td style={pTh}>제 출 처</td>
              <td style={pTd}>{v.submitTo}</td>
            </tr>
          )}
          {v.target.trim() && (
            <tr>
              <td style={pTh}>위임 대상</td>
              <td style={pTd}>{v.target}</td>
            </tr>
          )}
          <tr>
            <td style={pTh}>위임 사항</td>
            <td style={{ ...pTd, height: 120, verticalAlign: 'top' }}>
              {matters.map((m, i) => <div key={i}>{i + 1}. {m}</div>)}
            </td>
          </tr>
          <tr>
            <td style={pTh}>위임 기간</td>
            <td style={pTd}>{period}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: '28px 0 0', textIndent: '1em' }}>
        본인은 위 사람을 대리인으로 정하여 위 사항에 관한 일체의 권한을 위임합니다.
      </p>
      {attach.length > 0 && (
        <div style={{ margin: '16px 0 0' }}>
          {attach.map((a, i) => <div key={a}>{i === 0 ? '첨부: ' : '　　 '}{a}</div>)}
        </div>
      )}

      <div style={{ textAlign: 'center', margin: '40px 0 32px', fontSize: 15 }}>{krDate(v.written)}</div>

      <div style={{ textAlign: 'right', fontSize: 15, paddingRight: 24 }}>
        위 임 인&nbsp;&nbsp;&nbsp;
        <Seal name={corp ? corpLabel(v) : v.principal.name} stamp={stamps.principal} />
      </div>
      {v.submitTo.trim() && (
        <div style={{ marginTop: 48, fontSize: 16, fontWeight: 700 }}>{v.submitTo.trim()} 귀중</div>
      )}
    </Page>
  )
}

const poa: DocTemplate<Poa> = {
  id: 'poa',
  ns: 'powerOfAttorney',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [{ id: 'principal', name: v.principalType === 'corp' ? v.corp.name : v.principal.name }],
  fileName: (v) => docFileName('위임장', v.principalType === 'corp' ? v.corp.name : v.principal.name, v.written),
}

export default function PowerOfAttorney() {
  return <DocumentGenerator template={poa} />
}
