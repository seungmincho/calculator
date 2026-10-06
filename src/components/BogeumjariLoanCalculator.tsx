'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Check, Save, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';
import ShareResult from '@/components/ShareResult';
import MobileResultLink from '@/components/MobileResultLink';
import ToolIcon from '@/components/ToolIcon';
import {
  type LoanType, type Owned, type HouseKind, type Region, type Credit, type CheckStatus,
  REGIONS, CREDITS, RATE_BASIS, PERIOD_RATES, DISCOUNT_CAP, MIN_RATE, PERKS, LOAN_TYPE_INFO, DIDIMDOL, FRAUD, HOUSE_PRICE_LIMIT,
  getIncomeLimit, calcBogeumjari, didimdolHint, annuity, fmtKRW, rateFor,
} from '@/utils/bogeumjari';
import { useTranslations } from '@/lib/i18n';
import '@/lib/i18n/ns/bogeumjariLoan';

type Method = 'annuity' | 'principal';

function yearlySchedule(loan: number, rate: number, months: number, method: Method) {
  const r = rate / 100 / 12;
  const pay = annuity(loan, rate, months);
  const rows: { year: number; principal: number; interest: number; payment: number; balance: number }[] = [];
  let bal = loan, yp = 0, yi = 0;
  for (let m = 1; m <= months; m++) {
    const interest = bal * r;
    const principal = method === 'annuity' ? pay - interest : loan / months;
    bal = Math.max(0, bal - principal);
    yp += principal; yi += interest;
    if (m % 12 === 0 || m === months) {
      rows.push({ year: Math.ceil(m / 12), principal: Math.round(yp), interest: Math.round(yi), payment: Math.round(yp + yi), balance: Math.round(bal) });
      yp = 0; yi = 0;
    }
  }
  return rows;
}

const digits = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
const withCommas = (s: string) => { const d = s.replace(/[^0-9]/g, ''); return d ? Number(d).toLocaleString() : ''; };

const DEFAULTS = {
  income: '60,000,000', price: '400,000,000', type: 'first' as LoanType, children: '0', period: '30',
  age: '35', owned: '0' as Owned, kind: 'apt' as HouseKind, region: 'capital' as Region, credit: 'high' as Credit, debt: '', want: '', method: 'annuity' as Method,
};

const STATUS_CLS: Record<CheckStatus, string> = { pass: 'text-primary', warn: 'text-amber-700', fail: 'text-red-600' };
const SUMMARY_TYPES: LoanType[] = ['general', 'first', 'newlywed', 'multichild'];
const SITES = [
  { id: 'hf', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_01.do' },
  { id: 'apply', url: 'https://www.hf.go.kr' },
  { id: 'molit', url: 'https://rt.molit.go.kr' },
  { id: 'realty', url: 'https://www.realtyprice.kr' },
] as const;

export default function BogeumjariLoanCalculator() {
  const t = useTranslations('bogeumjariLoan');
  const tf = useTranslations('footer');
  const [income, setIncome] = useState(DEFAULTS.income);
  const [children, setChildren] = useState(DEFAULTS.children);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [loanType, setLoanType] = useState<LoanType>(DEFAULTS.type);
  const [period, setPeriod] = useState(DEFAULTS.period);
  const [age, setAge] = useState(DEFAULTS.age);
  const [owned, setOwned] = useState<Owned>(DEFAULTS.owned);
  const [kind, setKind] = useState<HouseKind>(DEFAULTS.kind);
  const [region, setRegion] = useState<Region>(DEFAULTS.region);
  const [credit, setCredit] = useState<Credit>(DEFAULTS.credit);
  const [debt, setDebt] = useState(DEFAULTS.debt);
  const [want, setWant] = useState(DEFAULTS.want);
  const [method, setMethod] = useState<Method>(DEFAULTS.method);
  const [perks, setPerks] = useState<string[]>([]);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  const { histories, isLoading: historyLoading, saveCalculation, removeHistory, clearHistories, loadFromHistory } =
    useCalculationHistory('bogeumjariLoan');

  const childNum = children === '3plus' ? 3 : parseInt(children) || 0;
  const incomeNum = digits(income);
  const priceNum = digits(price);

  const result = useMemo(() => {
    if (!incomeNum || !priceNum) return null;
    return calcBogeumjari({
      income: incomeNum, price: priceNum, type: loanType, children: childNum, period,
      age: parseInt(age) || 0, owned, kind, region, credit, debtMonthly: digits(debt), want: digits(want), perks,
    });
  }, [incomeNum, priceNum, loanType, childNum, period, age, owned, kind, region, credit, debt, want, perks]);

  useEffect(() => { setShowSaveButton(!!result); }, [result]);

  // ── URL 공유: 마운트 시 1회 읽기, 이후 상태 → URL ──
  const applyInputs = useCallback((get: (k: string) => string | null) => {
    const num = (k: string, set: (v: string) => void) => { const v = get(k); if (v && /^\d+$/.test(v)) set(Number(v).toLocaleString()); };
    num('income', setIncome); num('price', setPrice); num('debt', setDebt); num('want', setWant);
    const ty = get('type'); if (ty && ty in LOAN_TYPE_INFO) setLoanType(ty as LoanType);
    const pd = get('period'); if (pd && pd in PERIOD_RATES) setPeriod(pd);
    const c = get('children'); if (c && ['0', '1', '2', '3plus'].includes(c)) setChildren(c);
    const a = get('age'); if (a && /^\d{1,3}$/.test(a)) setAge(a);
    const o = get('owned'); if (o && ['0', '1', '2'].includes(o)) setOwned(o as Owned);
    const k = get('kind'); if (k === 'apt' || k === 'other') setKind(k);
    const rg = get('region'); if (rg && (REGIONS as string[]).includes(rg)) setRegion(rg as Region);
    const cr = get('credit'); if (cr && (CREDITS as string[]).includes(cr)) setCredit(cr as Credit);
    const m = get('method'); if (m === 'annuity' || m === 'principal') setMethod(m);
    const pk = get('perks'); if (pk !== null) setPerks(pk.split(',').filter((id) => PERKS.some((x) => x.id === id)));
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    applyInputs((k) => sp.get(k));
    setUrlLoaded(true);
  }, [applyInputs]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams({
      income: String(incomeNum), price: String(priceNum), type: loanType, children, period, age, owned, kind, region, method,
    });
    if (credit !== 'high') params.set('credit', credit);
    if (digits(debt)) params.set('debt', String(digits(debt)));
    if (digits(want)) params.set('want', String(digits(want)));
    if (perks.length) params.set('perks', perks.join(','));
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
  }, [urlLoaded, incomeNum, priceNum, loanType, children, period, age, owned, kind, region, credit, method, debt, want, perks]);

  const won = (n: number) => t('won', { n: Math.round(n).toLocaleString() });
  const yearsLabel = (n: string | number) => t('years', { n });
  const fraud = perks.includes('fraud');

  const flash = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-999999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    const fails = result.checks.filter((c) => c.status === 'fail');
    const lines = [
      t('copy.title'),
      t('copy.type', { type: LOAN_TYPE_INFO[loanType].label, region: t(`region.${region}`), years: period, method: t(`method.${method}`) }),
      result.eligible ? t('copy.eligible') : t('copy.notEligible', { reasons: fails.map((f) => f.detail).join(' / ') }),
      t('copy.maxLoan', { amount: fmtKRW(result.maxLoan), basis: result.binding.label }),
      t('copy.loan', { amount: fmtKRW(result.loan) }),
      t('copy.rate', {
        rate: result.rate.toFixed(2), base: result.baseRate.toFixed(2), discount: result.totalDiscount.toFixed(1),
        surcharge: result.surcharge ? t('copy.surcharge', { rate: result.surcharge.toFixed(1) }) : '', date: RATE_BASIS.date,
      }),
      t('copy.monthly', { amount: won(result.methods[method].first), first: method === 'principal' ? t('result.firstMonth') : '' }),
      t('copy.interest', { amount: fmtKRW(result.methods[method].interest) }),
      window.location.href,
    ];
    await copyText(lines.join('\n'));
    flash();
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation(
      { income, children, price, loanType, period, age, owned, kind, region, credit, debt, want, method, perks: perks.join(',') },
      { maxLoanAmount: result.maxLoan, interestRate: result.rate, monthlyPayment: result.monthly, eligible: result.eligible },
    );
    setShowSaveButton(false);
  };

  const handleLoadFromHistory = (id: string) => {
    const inputs = loadFromHistory(id) as Record<string, string> | null;
    if (!inputs) return;
    // 구버전 이력 키(householdIncome/childCount/housePrice/loanPeriod) 호환
    const alias: Record<string, string> = { income: 'householdIncome', children: 'childCount', price: 'housePrice', type: 'loanType', period: 'loanPeriod' };
    applyInputs((k) => {
      const v = inputs[k] ?? inputs[alias[k]] ?? (k === 'type' ? inputs.loanType : undefined);
      if (v === undefined || v === null) return null;
      return ['income', 'price', 'debt', 'want'].includes(k) ? String(v).replace(/,/g, '') : String(v);
    });
  };

  const togglePerk = (id: string) => setPerks((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));

  const schedule = useMemo(
    () => (result && result.loan > 0 ? yearlySchedule(result.loan, result.rate, result.months, method) : []),
    [result, method],
  );

  const periodComparison = useMemo(() => {
    if (!result || result.loan <= 0) return [];
    return Object.entries(PERIOD_RATES).map(([p, base]) => {
      const rt = rateFor(base, result.totalDiscount, result.surcharge);
      const mo = parseInt(p) * 12;
      const mp = Math.round(annuity(result.loan, rt, mo));
      return { period: p, rate: rt, monthly: mp, interest: mp * mo - result.loan };
    });
  }, [result]);

  const field = 'ui-field px-4 py-3';
  const label = 'block text-sm font-medium text-body mb-2';
  const hint = 'text-xs text-muted mt-1';
  const autoIncomeLimit = getIncomeLimit(loanType, childNum);
  const newbornBlocked = loanType === 'newlywed';
  const didim = didimdolHint({ income: incomeNum, price: priceNum, type: loanType, children: childNum, owned });
  // 다음 단계 도구: 각 도구가 이미 읽는 URL 파라미터 이름 그대로 전달
  const nextLinks = result ? [
    {
      href: '/dsr-calculator', labelKey: 'links.dsrCalculator', desc: t('next.dsr'),
      q: { inc: incomeNum, a: result.loan, r: result.rate.toFixed(2), y: period, m: method === 'annuity' ? 'equalPayment' : 'equalPrincipal', reg: region === 'local' ? 'local' : 'capital', ...(digits(debt) ? {} : { ex: '' }) },
    },
    {
      href: '/acquisition-tax', labelKey: 'links.acquisitionTax', desc: t('next.acquisition', { price: fmtKRW(priceNum) }),
      q: { price: priceNum, owner: owned === '0' ? '1' : owned === '1' ? '2temp' : '3', ...(loanType === 'first' ? { relief: 'first' } : {}) },
    },
    { href: '/brokerage-fee', labelKey: 'links.brokerageFee', desc: t('next.brokerage', { price: fmtKRW(priceNum) }), q: { d: 'sale', p: 'house', a: priceNum } },
    {
      href: '/loan-schedule', labelKey: 'links.loanSchedule', desc: t('next.schedule', { loan: fmtKRW(result.loan), years: period }),
      q: { am: Math.round(result.loan / 10_000), r: result.rate.toFixed(2), t: period, m: method === 'annuity' ? 'equalPayment' : 'equalPrincipal' },
    },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-fg">{t('heading')}</h1>
          <span className="text-xs font-semibold bg-soft text-sub px-2 py-0.5 rounded-full">{t('rateBadge', { date: RATE_BASIS.date })}</span>
        </div>
        <p className="text-sm text-muted">
          {t('intro', { min: Math.min(...Object.values(PERIOD_RATES)).toFixed(2), max: Math.max(...Object.values(PERIOD_RATES)).toFixed(2), cap: DISCOUNT_CAP.toFixed(1), minRate: MIN_RATE.toFixed(2) })}
        </p>
        <p className="text-xs text-muted mt-1">
          {t('rateSource.label')} <a href={RATE_BASIS.url} target="_blank" rel="noopener noreferrer" className="underline">{t('rateSource.link')}</a> {t('rateSource.note', { date: RATE_BASIS.date })}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 폼 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-6">
            {result && <MobileResultLink href="#bogeumjari-loan-result" label={t('result.maxLoan')} value={fmtKRW(result.maxLoan)} />}
            <h2 className="text-lg font-semibold text-fg">{t('form.title')}</h2>

            <div>
              <span className={label}>{t('form.type')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(LOAN_TYPE_INFO) as LoanType[]).map((type) => {
                  const info = LOAN_TYPE_INFO[type];
                  const active = loanType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLoanType(type)}
                      aria-pressed={active}
                      className={`p-3 rounded-xl border text-left transition-colors ${active ? 'border-primary bg-primary-soft' : 'border-line hover:bg-subtle'}`}
                    >
                      <div className={`font-semibold text-sm ${active ? 'text-primary' : 'text-fg'}`}>{info.label}</div>
                      <div className="text-xs text-muted">{info.sublabel}</div>
                      <div className="text-xs text-sub mt-1">{info.benefit}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bg-income" className={label}>{t('form.income')}</label>
                <div className="relative">
                  <input id="bg-income" type="text" inputMode="numeric" value={income} onChange={(e) => setIncome(withCommas(e.target.value))} placeholder="60,000,000" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">{t('form.unitWon')}</span>
                </div>
                <p className={hint}>{incomeNum ? `${fmtKRW(incomeNum)} · ` : ''}{fraud ? t('form.incomeHintFraud') : t('form.incomeHint', { limit: fmtKRW(autoIncomeLimit) })}</p>
              </div>
              <div>
                <label htmlFor="bg-children" className={label}>{t('form.children')}</label>
                <select id="bg-children" value={children} onChange={(e) => setChildren(e.target.value)} className={field}>
                  {['0', '1', '2', '3plus'].map((v) => <option key={v} value={v}>{t(`form.childrenOption.${v}`)}</option>)}
                </select>
                {loanType !== 'multichild' && childNum >= 2 && (
                  <p className="text-xs text-primary mt-1">{t('form.multichildTip')}</p>
                )}
              </div>

              <div>
                <label htmlFor="bg-price" className={label}>{t('form.price')}</label>
                <div className="relative">
                  <input id="bg-price" type="text" inputMode="numeric" value={price} onChange={(e) => setPrice(withCommas(e.target.value))} placeholder="400,000,000" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">{t('form.unitWon')}</span>
                </div>
                <p className={hint}>{priceNum ? `${fmtKRW(priceNum)} · ` : ''}{t(fraud ? 'form.priceHintFraud' : 'form.priceHint', { limit: fmtKRW(fraud ? FRAUD.priceLimit : HOUSE_PRICE_LIMIT) })}</p>
              </div>
              <div>
                <span className={label}>{t('form.kind')}</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['apt', 'other'] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setKind(v)} aria-pressed={kind === v}
                      className={`px-3 py-3 rounded-xl border text-sm transition-colors ${kind === v ? 'border-primary bg-primary-soft text-primary font-semibold' : 'border-line text-body hover:bg-subtle'}`}>
                      {t(`form.kindOption.${v}`)}
                    </button>
                  ))}
                </div>
                {loanType === 'first' && <p className={hint}>{t('form.firstLtvHint')}</p>}
              </div>

              <div className="sm:col-span-2" role="group" aria-labelledby="bg-region-label" aria-describedby="bg-region-hint">
                <span id="bg-region-label" className={label}>{t('form.region')}</span>
                <div className="grid grid-cols-3 gap-2">
                  {REGIONS.map((v) => (
                    <button key={v} type="button" onClick={() => setRegion(v)} aria-pressed={region === v}
                      className={`px-2 py-3 rounded-xl border text-sm transition-colors ${region === v ? 'border-primary bg-primary-soft text-primary font-semibold' : 'border-line text-body hover:bg-subtle'}`}>
                      {t(`region.${v}`)}
                    </button>
                  ))}
                </div>
                <p id="bg-region-hint" className={hint}>{t('form.regionHint')}</p>
              </div>

              <div>
                <label htmlFor="bg-owned" className={label}>{t('form.owned')}</label>
                <select id="bg-owned" value={owned} onChange={(e) => setOwned(e.target.value as Owned)} className={field}>
                  {(['0', '1', '2'] as const).map((v) => <option key={v} value={v}>{t(`form.ownedOption.${v}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="bg-credit" className={label}>{t('form.credit')}</label>
                <select id="bg-credit" value={credit} onChange={(e) => setCredit(e.target.value as Credit)} aria-describedby="bg-credit-hint" className={field}>
                  {CREDITS.map((v) => <option key={v} value={v}>{t(`form.creditOption.${v}`)}</option>)}
                </select>
                <p id="bg-credit-hint" className={hint}>{t('form.creditHint')}</p>
              </div>
              <div>
                <label htmlFor="bg-age" className={label}>{t('form.age')}</label>
                <input id="bg-age" type="number" inputMode="numeric" min={19} max={99} value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} className={field} />
                <p className={hint}>{t('form.ageHint')}</p>
              </div>

              <div>
                <label htmlFor="bg-period" className={label}>{t('form.period')}</label>
                <select id="bg-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={field}>
                  {Object.entries(PERIOD_RATES).map(([y, r]) => (
                    <option key={y} value={y}>{t('form.periodOption', { years: y, rate: r.toFixed(2) })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bg-method" className={label}>{t('form.method')}</label>
                <select id="bg-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={field}>
                  {(['annuity', 'principal'] as const).map((v) => <option key={v} value={v}>{t(`form.methodOption.${v}`)}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="bg-debt" className={label}>{t('form.debt')} <span className="text-xs text-muted font-normal">{t('form.optional')}</span></label>
                <div className="relative">
                  <input id="bg-debt" type="text" inputMode="numeric" value={debt} onChange={(e) => setDebt(withCommas(e.target.value))} placeholder="0" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">{t('form.unitWon')}</span>
                </div>
                <p className={hint}>{t('form.debtHint')}</p>
              </div>
              <div>
                <label htmlFor="bg-want" className={label}>{t('form.want')} <span className="text-xs text-muted font-normal">{t('form.optional')}</span></label>
                <div className="relative">
                  <input id="bg-want" type="text" inputMode="numeric" value={want} onChange={(e) => setWant(withCommas(e.target.value))} placeholder={t('form.wantPlaceholder')} className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">{t('form.unitWon')}</span>
                </div>
                {result && digits(want) > result.maxLoan && (
                  <p className="text-xs text-amber-700 mt-1">{t('form.wantCapped', { amount: fmtKRW(result.maxLoan) })}</p>
                )}
              </div>
            </div>
          </div>

          {/* 우대금리 */}
          <div className="ui-card p-6">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-fg">{t('perks.title')}</h2>
              {result && (
                <span className="text-sm text-sub tabular-nums">
                  {t('perks.sum', { sum: result.discountSum.toFixed(1) })}
                  {result.discountSum > DISCOUNT_CAP && <span className="text-muted"> {t('perks.capped', { cap: DISCOUNT_CAP.toFixed(1) })}</span>}
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-subtle text-sm">
                <span className="text-body">{t('perks.newlywed')} <span className="text-xs text-muted">{t('perks.newlywedAuto')}</span></span>
                <span className="tabular-nums text-sub">{loanType === 'newlywed' ? '0.3%p' : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-subtle text-sm">
                <span className="text-body">{t('perks.multichild')} <span className="text-xs text-muted">{t('perks.multichildAuto')}</span></span>
                <span className="tabular-nums text-sub">{childNum >= 3 ? '0.7%p' : childNum === 2 ? '0.5%p' : '—'}</span>
              </div>
              {PERKS.map((p) => {
                const disabled = p.id === 'newborn' && newbornBlocked;
                return (
                  <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line text-sm ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-subtle'}`}>
                    <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={perks.includes(p.id) && !disabled} disabled={disabled} onChange={() => togglePerk(p.id)} />
                    <span className="flex-1 text-body">{p.label} <span className="text-xs text-muted">{p.desc}</span></span>
                    <span className="tabular-nums text-sub">{p.rate.toFixed(1)}%p</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-3">
              {t('perks.note', { cap: DISCOUNT_CAP.toFixed(1), minRate: MIN_RATE.toFixed(2) })}{' '}
              <a href="https://www.hf.go.kr/ko/sub01/sub01_01_01.do" target="_blank" rel="noopener noreferrer" className="underline">{t('perks.noteLink')}</a>
            </p>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          {!result ? (
            <div className="ui-card p-6 text-center text-muted text-sm py-12">
              {t('result.empty')}
            </div>
          ) : (
            <div id="bogeumjari-loan-result" className="ui-card p-6 space-y-5 scroll-mt-20">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${STATUS_CLS[result.eligible ? 'pass' : 'fail']}`}>
                  {result.eligible
                    ? t(result.checks.some((c) => c.status === 'warn') ? 'result.eligibleWarn' : 'result.eligible')
                    : t('result.notEligible')}
                </span>
                <button type="button" onClick={copyResult} className="ml-auto flex items-center gap-1.5 bg-soft hover:bg-subtle text-body rounded-lg px-3 py-1.5 text-sm">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('result.copied') : t('result.copy')}
                </button>
              </div>

              {!result.eligible && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm space-y-1">
                  {result.checks.filter((c) => c.status === 'fail').map((c) => (
                    <div key={c.label}><span className="font-semibold">{c.label}</span> — {c.detail}</div>
                  ))}
                  <div className="text-xs pt-1">{t('result.referenceOnly')}</div>
                </div>
              )}

              <div aria-live="polite">
                <div className="text-sm text-muted">{t('result.maxLoan')}</div>
                <div className="text-3xl font-bold text-fg tabular-nums">{fmtKRW(result.maxLoan)}</div>
                <div className="text-xs text-muted mt-1">{t('result.bindingBy', { label: result.binding.label })}</div>
              </div>

              <div className="bg-subtle rounded-xl p-4 space-y-1.5 text-sm">
                {result.limits.map((l) => (
                  <div key={l.key} className="flex justify-between gap-2">
                    <span className={l.key === result.binding.key ? 'text-fg font-semibold' : 'text-sub'}>{l.label}</span>
                    <span className={`tabular-nums ${l.key === result.binding.key ? 'text-fg font-semibold' : 'text-sub'}`}>{fmtKRW(l.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-line pt-1.5 mt-1 flex justify-between text-sub">
                  <span>{t('result.equity')}</span>
                  <span className="tabular-nums">{fmtKRW(Math.max(0, priceNum - result.loan))}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted">{t('result.rate')}</div>
                  <div className="text-2xl font-bold text-fg tabular-nums">{result.rate.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted">{t('result.monthly')}{method === 'principal' ? t('result.firstMonth') : ''}</div>
                  <div className="text-2xl font-bold text-fg tabular-nums">{t('result.manwon', { n: Math.round(result.methods[method].first / 10_000).toLocaleString(), won: Math.round(result.methods[method].first).toLocaleString() })}</div>
                </div>
              </div>
              {result.loan !== result.maxLoan && (
                <p className="text-xs text-muted -mt-3">{t('result.wantBasis', { amount: fmtKRW(result.loan) })}</p>
              )}

              <div className="bg-subtle rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-sub">{t('result.baseRate', { years: period })}</span>
                  <span className="tabular-nums text-fg">{result.baseRate.toFixed(2)}%</span>
                </div>
                {result.discounts.map((d) => (
                  <div key={d.label} className="flex justify-between text-sub">
                    <span>{d.label}</span>
                    <span className="tabular-nums">−{d.rate.toFixed(1)}%p</span>
                  </div>
                ))}
                {result.discountSum > DISCOUNT_CAP && (
                  <div className="flex justify-between text-muted text-xs"><span>{t('result.discountCap')}</span><span>{t('result.discountCapValue', { cap: DISCOUNT_CAP.toFixed(1) })}</span></div>
                )}
                {result.surcharge > 0 && (
                  <div className="flex justify-between text-sub">
                    <span>{t('result.surcharge')}</span>
                    <span className="tabular-nums">+{result.surcharge.toFixed(1)}%p</span>
                  </div>
                )}
                <div className="border-t border-line pt-1.5 mt-1 flex justify-between font-semibold text-fg">
                  <span>{t('result.finalRate')}</span>
                  <span className="tabular-nums">{result.rate.toFixed(2)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-subtle rounded-lg p-3">
                  <div className="text-muted text-xs mb-0.5">{t('result.totalInterest')}</div>
                  <div className="font-semibold text-fg tabular-nums">{fmtKRW(result.methods[method].interest)}</div>
                </div>
                <div className="bg-subtle rounded-lg p-3">
                  <div className="text-muted text-xs mb-0.5">{t('result.dti')}</div>
                  <div className={`font-semibold tabular-nums ${result.dti > result.dtiCap ? STATUS_CLS.fail : 'text-fg'}`}>{result.dti.toFixed(1)}%</div>
                </div>
              </div>

              {/* 자격 체크리스트 */}
              <div>
                <div className="text-sm font-semibold text-fg mb-2">{t('result.checks')}</div>
                <ul className="divide-y divide-line text-sm">
                  {result.checks.map((c) => (
                    <li key={c.label} className="py-2 flex gap-3">
                      <span className={`w-16 flex-shrink-0 font-semibold ${STATUS_CLS[c.status]}`}>{t(`status.${c.status}`)}</span>
                      <span className="text-body"><span className="text-fg font-medium">{c.label}</span> · {c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted">
                {t('result.disclaimer')}
              </p>
            </div>
          )}

          {result && (
            <>
              <ShareResult
                fileName="bogeumjari-loan"
                card={{
                  tool: t('title'),
                  label: t('share.label', { type: LOAN_TYPE_INFO[loanType].label }),
                  headline: fmtKRW(result.maxLoan),
                  sub: t('share.sub', { loan: fmtKRW(result.loan), monthly: won(result.methods[method].first), method: t(`method.${method}`) }),
                  rows: [
                    { label: t('share.rate'), value: t('share.rateValue', { rate: result.rate.toFixed(2) }) },
                    { label: t('share.ltv'), value: t('share.ltvValue', { ltv: Math.round(result.ltv * 100), price: fmtKRW(priceNum) }) },
                    { label: t('share.period'), value: t('share.periodValue', { years: period }) },
                    { label: t('share.totalInterest'), value: fmtKRW(result.methods[method].interest) },
                    { label: t('share.eligibility'), value: t(result.eligible ? 'share.eligible' : 'share.notEligible') },
                  ],
                }}
                text={t('share.text', { type: LOAN_TYPE_INFO[loanType].label, limit: fmtKRW(result.maxLoan), rate: result.rate.toFixed(2), monthly: won(result.methods[method].first) })}
              />
              {showSaveButton && (
                <button type="button" onClick={handleSave} className="ui-btn-soft w-full py-2.5 text-sm">
                  <Save className="w-4 h-4" />{t('result.save')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* 디딤돌대출 자격 힌트 (공식 기준 비교만, 금리 계산 없음) */}
          <section className="ui-card p-6" aria-labelledby="bg-didim-title">
            <h2 id="bg-didim-title" className="text-lg font-semibold text-fg">{t('didimdol.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('didimdol.desc', { rate: DIDIMDOL.rate })}</p>
            <p className={`text-sm font-semibold mt-4 ${didim.ok ? STATUS_CLS.pass : 'text-sub'}`}>
              {t(didim.ok ? 'didimdol.likely' : 'didimdol.unlikely')}
            </p>
            <ul className="mt-2 divide-y divide-line text-sm">
              {[
                { ok: didim.incomeOk, label: t('didimdol.income'), value: t('didimdol.upTo', { amount: fmtKRW(didim.incomeLimit) }) },
                { ok: didim.priceOk, label: t('didimdol.price'), value: t('didimdol.upTo', { amount: fmtKRW(didim.priceLimit) }) },
                { ok: didim.ownedOk, label: t('didimdol.owned'), value: t('didimdol.ownedValue') },
              ].map((c) => (
                <li key={c.label} className="py-2 flex gap-3">
                  <span className={`w-16 flex-shrink-0 font-semibold ${STATUS_CLS[c.ok ? 'pass' : 'fail']}`}>{t(`status.${c.ok ? 'pass' : 'fail'}`)}</span>
                  <span className="flex-1 text-body">{c.label}</span>
                  <span className="text-sub tabular-nums text-right">{c.value}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div className="bg-subtle rounded-lg p-3">
                <div className="text-muted text-xs mb-0.5">{t('didimdol.limit')}</div>
                <div className="font-semibold text-fg tabular-nums">{fmtKRW(didim.maxLoan)}</div>
              </div>
              <div className="bg-subtle rounded-lg p-3">
                <div className="text-muted text-xs mb-0.5">{t('didimdol.rate')}</div>
                <div className="font-semibold text-fg tabular-nums">{t('didimdol.rateValue', { rate: DIDIMDOL.rate })}</div>
              </div>
            </div>
            {didim.ok && didim.maxLoan < result.maxLoan && (
              <p className="text-sm text-body mt-3">{t('didimdol.compareLess', { diff: fmtKRW(result.maxLoan - didim.maxLoan) })}</p>
            )}
            <p className="text-xs text-muted mt-3">{t('didimdol.note')}</p>
            <a href={DIDIMDOL.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-11 text-sm font-medium text-primary hover:underline">
              {t('didimdol.link')} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          </section>

          {/* 다음 단계 도구 — 입력값을 URL로 넘김 */}
          <nav className="ui-card p-6" aria-labelledby="bg-next-title">
            <h2 id="bg-next-title" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
            <p className="text-sm text-muted mt-1 mb-4">{t('next.desc')}</p>
            <ul className="space-y-2">
              {nextLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={`${l.href}/?${new URLSearchParams(Object.entries(l.q).map(([k, v]) => [k, String(v)]))}`}
                    className="flex items-center gap-3 p-3 min-h-11 bg-subtle rounded-xl hover:bg-soft transition-colors"
                  >
                    <ToolIcon href={l.href} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-fg text-sm">{tf(l.labelKey)}</span>
                      <span className="block text-xs text-muted mt-0.5">{l.desc}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-faint shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {result && result.loan > 0 && (
        <>
          {/* 상환방식 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">{t('methods.title')}</h2>
            <p className="text-xs text-muted mb-4">{t('methods.basis', { loan: fmtKRW(result.loan), years: period, rate: result.rate.toFixed(2) })}</p>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="text-left py-2 px-2 font-medium">{t('methods.colMethod')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('methods.colFirst')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('methods.colLast')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('methods.colInterest')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['annuity', 'principal'] as Method[]).map((m) => (
                    <tr key={m} onClick={() => setMethod(m)} className={`border-b border-line cursor-pointer ${method === m ? 'bg-subtle font-semibold' : 'hover:bg-subtle'}`}>
                      <td className="py-2.5 px-2 text-fg">{t(`method.${m}`)}{method === m && <span className="text-xs text-primary ml-1">{t('selected')}</span>}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-fg">{won(result.methods[m].first)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{won(result.methods[m].last)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{fmtKRW(result.methods[m].interest)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-line">
                    <td className="py-2.5 px-2 text-fg">{t('methods.graduated')}</td>
                    <td colSpan={3} className="py-2.5 px-2 text-right text-xs text-muted">
                      {t(parseInt(age) < 40 && period !== '50' ? 'methods.graduatedOk' : 'methods.graduatedNo')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              {t('methods.note', { diff: fmtKRW(Math.max(0, result.methods.annuity.interest - result.methods.principal.interest)), extra: won(Math.max(0, result.methods.principal.first - result.methods.annuity.first)) })}
            </p>
          </div>

          {/* 연도별 상환 스케줄 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">{t('schedule.title')} <span className="text-xs font-normal text-muted">({t(`method.${method}`)})</span></h2>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={schedule} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="year" tickFormatter={(v) => yearsLabel(v)} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" interval={Math.max(0, Math.floor(schedule.length / 8) - 1)} />
                  <YAxis tickFormatter={(v) => t('schedule.manTick', { n: Math.round(Number(v) / 10_000).toLocaleString(), m: Math.round(Number(v) / 100_000) / 10 })} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--line)" width={56} />
                  <Tooltip
                    formatter={(value, name) => [won(Number(value ?? 0)), t(name === 'principal' ? 'schedule.principal' : 'schedule.interest')]}
                    labelFormatter={(v) => t('schedule.yearN', { n: v })}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)' }}
                  />
                  <Area type="monotone" dataKey="principal" stackId="1" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} name="principal" />
                  <Area type="monotone" dataKey="interest" stackId="1" stroke="var(--faint)" fill="var(--faint)" fillOpacity={0.3} name="interest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs text-muted">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-primary opacity-50" aria-hidden />{t('schedule.principal')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-faint opacity-50" aria-hidden />{t('schedule.interest')}</span>
            </div>
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-medium text-primary select-none">{t('schedule.showTable')}</summary>
              <div className="overflow-x-auto -mx-2 mt-3 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="text-left py-2 px-2 font-medium">{t('schedule.colYear')}</th>
                      <th className="text-right py-2 px-2 font-medium">{t('schedule.colPrincipal')}</th>
                      <th className="text-right py-2 px-2 font-medium">{t('schedule.colInterest')}</th>
                      <th className="text-right py-2 px-2 font-medium">{t('schedule.colPayment')}</th>
                      <th className="text-right py-2 px-2 font-medium">{t('schedule.colBalance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.year} className="border-b border-line tabular-nums">
                        <td className="py-2 px-2 text-fg">{yearsLabel(row.year)}</td>
                        <td className="py-2 px-2 text-right text-body">{row.principal.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-body">{row.interest.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-fg">{row.payment.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-sub">{row.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>

          {/* 기간별 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">
              {t('periods.title')} <span className="text-xs font-normal text-muted">{t('periods.basis', { loan: fmtKRW(result.loan), discount: result.totalDiscount.toFixed(1) })}</span>
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="text-left py-2 px-2 font-medium">{t('periods.colPeriod')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('periods.colRate')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('periods.colMonthly')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('periods.colInterest')}</th>
                  </tr>
                </thead>
                <tbody>
                  {periodComparison.map((row) => (
                    <tr key={row.period} onClick={() => setPeriod(row.period)} className={`border-b border-line cursor-pointer ${row.period === period ? 'bg-subtle font-semibold' : 'hover:bg-subtle'}`}>
                      <td className="py-2.5 px-2 text-fg">{yearsLabel(row.period)}{row.period === period && <span className="text-xs text-primary ml-1">{t('selected')}</span>}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{row.rate.toFixed(2)}%</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-fg">{won(row.monthly)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{fmtKRW(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              {t('periods.note')}
            </p>
          </div>
        </>
      )}

      {/* 관련 사이트 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('sites.title')}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {SITES.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-subtle rounded-xl hover:bg-soft transition-colors group">
              <div className="font-medium text-fg group-hover:underline text-sm">{t(`sites.${link.id}.name`)}</div>
              <div className="text-xs text-muted mt-0.5">{t(`sites.${link.id}.desc`)}</div>
            </a>
          ))}
        </div>
      </div>

      <CalculationHistory
        histories={histories}
        isLoading={historyLoading}
        onLoadHistory={handleLoadFromHistory}
        onRemoveHistory={removeHistory}
        onClearHistories={clearHistories}
        formatResult={(r: { maxLoanAmount?: number; interestRate?: number }) =>
          r.maxLoanAmount ? `${fmtKRW(r.maxLoanAmount)} · ${Number(r.interestRate ?? 0).toFixed(2)}%` : '-'
        }
      />

      {/* 유형별 요약 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('summary.title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_TYPES.map((type) => (
            <div key={type} className="bg-subtle rounded-xl p-4">
              <div className="font-semibold text-sm text-fg mb-2">{LOAN_TYPE_INFO[type].label}</div>
              <ul className="space-y-1 text-xs text-sub list-disc pl-4">
                {((t.raw(`summary.${type}`) as string[] | undefined) ?? []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">{t('summary.note')}</p>
      </div>

      <GuideSection namespace="bogeumjariLoan" />
    </div>
  );
}
