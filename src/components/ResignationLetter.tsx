'use client'

// 사직서 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, PaperTitle, Seal, pTable, pTh, pTd } from '@/components/document/paper'
import { Section, DateField, TextField, Segmented, Check } from '@/components/document/fields'
import { krDate, docFileName } from '@/utils/document'
import { addMonths, addYears, daysBetween, isValidDate } from '@/utils/dday'
import { leaveForYears } from '@/utils/annualLeave'
import { noticeLastDay, severance, tenure, anniversaryEve, REASONS, REASON_TEXT, type ReasonKey } from '@/utils/resignation'

interface Resign {
  name: string
  dept: string
  position: string
  phone: string
  hireDate: string
  quitDate: string // 마지막 근무일
  submitDate: string
  company: string
  ceo: string
  reason: ReasonKey
  reasonText: string
  handover: boolean
}

const initial = (today: string): Resign => ({
  name: '',
  dept: '',
  position: '',
  phone: '',
  hireDate: today ? addYears(today, -2) : '',
  quitDate: today ? addMonths(today, 1) : '',
  submitDate: today,
  company: '',
  ceo: '',
  reason: 'personal',
  reasonText: REASON_TEXT.personal,
  handover: true,
})

const datesOk = (v: Resign) => isValidDate(v.hireDate) && isValidDate(v.quitDate) && v.hireDate <= v.quitDate

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: Resign, t: TFn): Insight[] {
  const out: Insight[] = []
  if (isValidDate(v.hireDate) && isValidDate(v.quitDate) && v.quitDate < v.hireDate) out.push({ level: 'error', text: t('insight.hireAfterQuit') })
  if (isValidDate(v.submitDate) && isValidDate(v.quitDate)) {
    if (v.quitDate < v.submitDate) out.push({ level: 'error', text: t('insight.quitBeforeSubmit') })
    else {
      const n = noticeLastDay(v.submitDate)
      if (v.quitDate < n.general) {
        out.push({ level: 'warn', text: t('insight.notice', { days: daysBetween(v.submitDate, v.quitDate), general: n.general, monthly: n.monthly }) })
      }
    }
  }

  if (v.reason === 'recommended') out.push({ level: 'warn', text: t('insight.recommended') })
  if (v.reason === 'contract') out.push({ level: 'warn', text: t('insight.contract') })
  if (v.reason === 'health' || v.reason === 'family') out.push({ level: 'info', text: t('insight.healthFamily') })

  if (datesOk(v)) {
    const s = severance(v.hireDate, v.quitDate)
    const ten = tenure(v.hireDate, v.quitDate)
    if (s.eligible) out.push({ level: 'info', text: t('insight.severanceOk', { y: ten.years, m: ten.months }) })
    else if (s.shortDays <= 90) out.push({ level: 'warn', text: t('insight.severanceShort', { n: s.shortDays, date: s.needLastDay }) })
    else out.push({ level: 'info', text: t('insight.severanceNone') })
    const eve = anniversaryEve(v.hireDate, v.quitDate)
    if (eve) out.push({ level: 'warn', text: t('insight.anniversary', { n: eve, days: leaveForYears(eve) }) })
  }
  out.push({ level: 'info', text: t('insight.leave') })
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Form({ v, set, t }: { v: Resign; set: (p: Partial<Resign>) => void; t: TFn }) {
  const ok = datesOk(v)
  const ten = ok ? tenure(v.hireDate, v.quitDate) : null
  const sev = ok ? severance(v.hireDate, v.quitDate) : null
  const notice = isValidDate(v.submitDate) ? noticeLastDay(v.submitDate) : null
  const gap = isValidDate(v.submitDate) && isValidDate(v.quitDate) ? daysBetween(v.submitDate, v.quitDate) : null

  return (
    <>
      <Section title={t('section.reason')} hint={t('sectionHint.reason')}>
        <Segmented
          label={t('reason')}
          value={v.reason}
          onChange={(reason) => set({ reason, reasonText: reason === 'custom' ? v.reasonText : REASON_TEXT[reason] })}
          options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))}
        />
        <TextField label={t('reasonText')} value={v.reasonText} onChange={(reasonText) => set({ reasonText })} rows={4} maxLength={600} hint={t('reasonTextHint')} />
        <Check label={t('handover')} hint={t('handoverHint')} checked={v.handover} onChange={(handover) => set({ handover })} />
      </Section>

      <Section title={t('section.dates')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField label={t('hireDate')} value={v.hireDate} onChange={(hireDate) => set({ hireDate })} />
          <DateField label={t('quitDate')} value={v.quitDate} min={v.hireDate} onChange={(quitDate) => set({ quitDate })} hint={t('quitDateHint')} />
          <DateField label={t('submitDate')} value={v.submitDate} onChange={(submitDate) => set({ submitDate })} />
        </div>
        {ten && sev && (
          <div className="bg-subtle rounded-2xl p-5">
            <p className="text-sm text-sub">{t('summary.tenure')}</p>
            <p className="text-3xl font-bold text-fg tabular-nums mt-1">{t('summary.tenureValue', { y: ten.years, m: ten.months, d: ten.days })}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('summary.severance')}</dt>
                <dd className={`tabular-nums ${sev.eligible ? 'text-primary font-medium' : 'text-body'}`}>
                  {sev.eligible ? t('summary.severanceYes') : t('summary.severanceNo', { n: sev.shortDays })}
                </dd>
              </div>
              {gap !== null && gap >= 0 && (
                <div className="flex justify-between gap-3"><dt className="text-muted">{t('summary.noticeDays')}</dt><dd className="text-body tabular-nums">{t('summary.noticeDaysValue', { n: gap })}</dd></div>
              )}
              {notice && (
                <div className="flex justify-between gap-3"><dt className="text-muted">{t('summary.effective')}</dt><dd className="text-body tabular-nums text-right">{t('summary.effectiveValue', notice)}</dd></div>
              )}
            </dl>
          </div>
        )}
      </Section>

      <Section title={t('section.me')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('name')} value={v.name} onChange={(name) => set({ name })} placeholder={t('namePlaceholder')} maxLength={30} />
          <TextField label={t('phone')} value={v.phone} onChange={(phone) => set({ phone })} placeholder="010-0000-0000" inputMode="tel" maxLength={20} />
          <TextField label={t('dept')} value={v.dept} onChange={(dept) => set({ dept })} placeholder={t('deptPlaceholder')} maxLength={40} />
          <TextField label={t('position')} value={v.position} onChange={(position) => set({ position })} placeholder={t('positionPlaceholder')} maxLength={20} />
        </div>
      </Section>

      <Section title={t('section.company')} hint={t('sectionHint.company')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('company')} value={v.company} onChange={(company) => set({ company })} placeholder={t('companyPlaceholder')} maxLength={40} />
          <TextField label={t('ceo')} value={v.ceo} onChange={(ceo) => set({ ceo })} placeholder={t('ceoPlaceholder')} maxLength={30} />
        </div>
      </Section>
    </>
  )
}

// ── A4 본문 (한국 회사 통용 사직서 양식, 한국어 고정) ───────────────────────

function Paper({ v, stamps }: { v: Resign; stamps: Record<string, string> }) {
  const th = { ...pTh, width: 110, letterSpacing: '0.2em' }
  const td = { ...pTd, height: 42 }
  return (
    <Page>
      <PaperTitle>사 직 서</PaperTitle>
      <table style={pTable}>
        <tbody>
          <tr>
            <td style={th}>성 명</td>
            <td style={td}>{v.name}</td>
            <td style={th}>연 락 처</td>
            <td style={td}>{v.phone}</td>
          </tr>
          <tr>
            <td style={th}>소 속</td>
            <td style={td}>{v.dept}</td>
            <td style={th}>직 위</td>
            <td style={td}>{v.position}</td>
          </tr>
          <tr>
            <td style={th}>입 사 일</td>
            <td style={td}>{krDate(v.hireDate)}</td>
            <td style={{ ...th, letterSpacing: 0 }}>퇴직 예정일</td>
            <td style={td}>{krDate(v.quitDate)}</td>
          </tr>
          <tr>
            <td style={th}>사직 사유</td>
            <td colSpan={3} style={{ ...pTd, height: 260, verticalAlign: 'top', padding: '14px 16px', whiteSpace: 'pre-wrap' }}>{v.reasonText.trim()}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: '36px 0 0', textIndent: '1em' }}>
        본인은 위와 같은 사유로 {krDate(v.quitDate)}부로 사직하고자 하오니 재가하여 주시기 바랍니다.
        {v.handover && ' 아울러 퇴직일까지 담당 업무의 인수인계와 회사 물품 반납을 성실히 이행하겠습니다.'}
      </p>

      <div style={{ textAlign: 'center', margin: '56px 0 36px', fontSize: 15 }}>{krDate(v.submitDate)}</div>
      <div style={{ textAlign: 'right', fontSize: 15, paddingRight: 24 }}>
        <span style={{ letterSpacing: '0.3em', marginRight: 24 }}>신청인</span>
        <Seal name={v.name} stamp={stamps.me} />
      </div>

      <div style={{ marginTop: 96, fontSize: 18, fontWeight: 700 }}>
        {v.company.trim() || '○○주식회사'} 대표이사 {v.ceo.trim() || '          '} 귀하
      </div>
    </Page>
  )
}

const resign: DocTemplate<Resign> = {
  id: 'resignation',
  ns: 'resignationLetter',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [{ id: 'me', name: v.name }],
  fileName: (v) => docFileName('사직서', v.name, v.submitDate),
}

export default function ResignationLetter() {
  return <DocumentGenerator template={resign} />
}
