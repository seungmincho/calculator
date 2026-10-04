'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Share2, Check, Save, Copy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';
import {
  type LoanType, type Owned, type HouseKind, type Region, type CheckStatus,
  REGIONS, RATE_BASIS, PERIOD_RATES, DISCOUNT_CAP, MIN_RATE, PERKS, LOAN_TYPE_INFO,
  getIncomeLimit, calcBogeumjari, annuity, fmtKRW, rateFor,
} from '@/utils/bogeumjari';

type Method = 'annuity' | 'principal';

const METHOD_LABEL: Record<Method, string> = { annuity: '원리금균등', principal: '원금균등' };
const REGION_LABEL: Record<Region, string> = { local: '지방', capital: '수도권 (규제지역 외)', regulated: '규제지역' };

const fmtWon = (n: number) => `${Math.round(n).toLocaleString()}원`;

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
  age: '35', owned: '0' as Owned, kind: 'apt' as HouseKind, region: 'capital' as Region, debt: '', want: '', method: 'annuity' as Method,
};

const STATUS_TEXT: Record<CheckStatus, { label: string; cls: string }> = {
  pass: { label: '충족', cls: 'text-green-600 dark:text-green-400' },
  warn: { label: '확인 필요', cls: 'text-amber-600 dark:text-amber-400' },
  fail: { label: '미충족', cls: 'text-red-600 dark:text-red-400' },
};

export default function BogeumjariLoanCalculator() {
  const [income, setIncome] = useState(DEFAULTS.income);
  const [children, setChildren] = useState(DEFAULTS.children);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [loanType, setLoanType] = useState<LoanType>(DEFAULTS.type);
  const [period, setPeriod] = useState(DEFAULTS.period);
  const [age, setAge] = useState(DEFAULTS.age);
  const [owned, setOwned] = useState<Owned>(DEFAULTS.owned);
  const [kind, setKind] = useState<HouseKind>(DEFAULTS.kind);
  const [region, setRegion] = useState<Region>(DEFAULTS.region);
  const [debt, setDebt] = useState(DEFAULTS.debt);
  const [want, setWant] = useState(DEFAULTS.want);
  const [method, setMethod] = useState<Method>(DEFAULTS.method);
  const [perks, setPerks] = useState<string[]>([]);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [copied, setCopied] = useState<'result' | 'link' | null>(null);
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
      age: parseInt(age) || 0, owned, kind, region, debtMonthly: digits(debt), want: digits(want), perks,
    });
  }, [incomeNum, priceNum, loanType, childNum, period, age, owned, kind, region, debt, want, perks]);

  useEffect(() => { setShowSaveButton(!!result); }, [result]);

  // ── URL 공유: 마운트 시 1회 읽기, 이후 상태 → URL ──
  const applyInputs = useCallback((get: (k: string) => string | null) => {
    const num = (k: string, set: (v: string) => void) => { const v = get(k); if (v && /^\d+$/.test(v)) set(Number(v).toLocaleString()); };
    num('income', setIncome); num('price', setPrice); num('debt', setDebt); num('want', setWant);
    const t = get('type'); if (t && t in LOAN_TYPE_INFO) setLoanType(t as LoanType);
    const pd = get('period'); if (pd && pd in PERIOD_RATES) setPeriod(pd);
    const c = get('children'); if (c && ['0', '1', '2', '3plus'].includes(c)) setChildren(c);
    const a = get('age'); if (a && /^\d{1,3}$/.test(a)) setAge(a);
    const o = get('owned'); if (o && ['0', '1', '2'].includes(o)) setOwned(o as Owned);
    const k = get('kind'); if (k === 'apt' || k === 'other') setKind(k);
    const rg = get('region'); if (rg && (REGIONS as string[]).includes(rg)) setRegion(rg as Region);
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
    if (digits(debt)) params.set('debt', String(digits(debt)));
    if (digits(want)) params.set('want', String(digits(want)));
    if (perks.length) params.set('perks', perks.join(','));
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
  }, [urlLoaded, incomeNum, priceNum, loanType, children, period, age, owned, kind, region, method, debt, want, perks]);

  const flash = (what: 'result' | 'link') => { setCopied(what); setTimeout(() => setCopied(null), 2000); };

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
      '보금자리론 계산 결과',
      `유형: ${LOAN_TYPE_INFO[loanType].label} · ${REGION_LABEL[region]} · ${period}년 · ${METHOD_LABEL[method]}`,
      result.eligible ? '자격: 충족' : `자격: 미충족 — ${fails.map((f) => f.detail).join(' / ')}`,
      `최대 한도: ${fmtKRW(result.maxLoan)} (${result.binding.label} 기준)`,
      `대출금: ${fmtKRW(result.loan)}`,
      `적용 금리: ${result.rate.toFixed(2)}% (기준 ${result.baseRate.toFixed(2)}% - 우대 ${result.totalDiscount.toFixed(1)}%p${result.surcharge ? ` + 규제지역 ${result.surcharge.toFixed(1)}%p` : ''}, ${RATE_BASIS.label} 공시)`,
      `월 상환액: ${fmtWon(result.methods[method].first)}${method === 'principal' ? ' (첫 달)' : ''}`,
      `총 이자: ${fmtKRW(result.methods[method].interest)}`,
      window.location.href,
    ];
    await copyText(lines.join('\n'));
    flash('result');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '보금자리론 계산 결과',
          text: result ? `한도 ${fmtKRW(result.maxLoan)} · 금리 ${result.rate.toFixed(2)}%` : '',
          url,
        });
        return;
      } catch { /* fall through */ }
    }
    await copyText(url);
    flash('link');
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation(
      { income, children, price, loanType, period, age, owned, kind, region, debt, want, method, perks: perks.join(',') },
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-fg">LH 보금자리론 계산기</h1>
          <span className="text-xs font-semibold bg-soft text-sub px-2 py-0.5 rounded-full">{RATE_BASIS.label} 금리 기준</span>
        </div>
        <p className="text-sm text-muted">
          자격·대출한도·우대금리 적용 금리·월 상환액을 한 번에 확인하세요 (기준금리 {Math.min(...Object.values(PERIOD_RATES)).toFixed(2)}~{Math.max(...Object.values(PERIOD_RATES)).toFixed(2)}%, 우대 최대 {DISCOUNT_CAP.toFixed(1)}%p, 최저 {MIN_RATE.toFixed(2)}%)
        </p>
        <p className="text-xs text-muted mt-1">
          금리 출처: <a href={RATE_BASIS.url} target="_blank" rel="noopener noreferrer" className="underline">한국주택금융공사 금리안내</a> ({RATE_BASIS.date} 공시, 아낌e 보금자리론 · 매월 변동)
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 폼 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-fg">대출 조건 입력</h2>

            <div>
              <span className={label}>신청 유형</span>
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
                <label htmlFor="bg-income" className={label}>부부합산 연소득</label>
                <div className="relative">
                  <input id="bg-income" type="text" inputMode="numeric" value={income} onChange={(e) => setIncome(withCommas(e.target.value))} placeholder="60,000,000" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">원</span>
                </div>
                <p className={hint}>{incomeNum ? `${fmtKRW(incomeNum)} · ` : ''}기준 {fmtKRW(autoIncomeLimit)} 이하</p>
              </div>
              <div>
                <label htmlFor="bg-children" className={label}>미성년 자녀 수</label>
                <select id="bg-children" value={children} onChange={(e) => setChildren(e.target.value)} className={field}>
                  <option value="0">없음</option>
                  <option value="1">1명 (소득기준 9천만)</option>
                  <option value="2">2명 (소득기준 1억 · 우대 0.5%p)</option>
                  <option value="3plus">3명 이상 (소득기준 1억 · 우대 0.7%p)</option>
                </select>
                {loanType !== 'multichild' && childNum >= 2 && (
                  <p className="text-xs text-primary mt-1">다자녀 유형 선택 시 한도 4억으로 상향</p>
                )}
              </div>

              <div>
                <label htmlFor="bg-price" className={label}>주택 매입가격</label>
                <div className="relative">
                  <input id="bg-price" type="text" inputMode="numeric" value={price} onChange={(e) => setPrice(withCommas(e.target.value))} placeholder="400,000,000" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">원</span>
                </div>
                <p className={hint}>{priceNum ? `${fmtKRW(priceNum)} · ` : ''}6억원 이하 주택</p>
              </div>
              <div>
                <span className={label}>주택 종류</span>
                <div className="grid grid-cols-2 gap-2">
                  {([['apt', '아파트 (LTV 70%)'], ['other', '기타주택 (LTV 65%)']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setKind(v)} aria-pressed={kind === v}
                      className={`px-3 py-3 rounded-xl border text-sm transition-colors ${kind === v ? 'border-primary bg-primary-soft text-primary font-semibold' : 'border-line text-body hover:bg-subtle'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {loanType === 'first' && <p className={hint}>생애최초는 LTV 80% (수도권·규제지역 70%) 적용</p>}
              </div>

              <div className="sm:col-span-2" role="group" aria-labelledby="bg-region-label" aria-describedby="bg-region-hint">
                <span id="bg-region-label" className={label}>주택 소재지</span>
                <div className="grid grid-cols-3 gap-2">
                  {REGIONS.map((v) => (
                    <button key={v} type="button" onClick={() => setRegion(v)} aria-pressed={region === v}
                      className={`px-2 py-3 rounded-xl border text-sm transition-colors ${region === v ? 'border-primary bg-primary-soft text-primary font-semibold' : 'border-line text-body hover:bg-subtle'}`}>
                      {REGION_LABEL[v]}
                    </button>
                  ))}
                </div>
                <p id="bg-region-hint" className={hint}>
                  규제지역: 서울 전역 + 경기 과천·광명·성남·수원(영통·장안·팔달)·안양 동안·용인(수지·기흥)·의왕·하남·화성 동탄·구리 (2026.7.1 기준).
                  규제지역은 금리 0.2%p 가산, LTV·DTI 10%p 차감(생애최초·무주택 연소득 7천만원 이하 실수요자는 미차감)
                </p>
              </div>

              <div>
                <label htmlFor="bg-owned" className={label}>현재 주택 보유</label>
                <select id="bg-owned" value={owned} onChange={(e) => setOwned(e.target.value as Owned)} className={field}>
                  <option value="0">무주택</option>
                  <option value="1">1주택 (처분 조건)</option>
                  <option value="2">2주택 이상</option>
                </select>
              </div>
              <div>
                <label htmlFor="bg-age" className={label}>나이 (만, 차주 기준)</label>
                <input id="bg-age" type="number" inputMode="numeric" min={19} max={99} value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} className={field} />
                <p className={hint}>40·50년 만기, 체증식 상환 자격 판단에 사용</p>
              </div>

              <div>
                <label htmlFor="bg-period" className={label}>대출 기간</label>
                <select id="bg-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={field}>
                  {Object.entries(PERIOD_RATES).map(([y, r]) => (
                    <option key={y} value={y}>{y}년 (기준 {r.toFixed(2)}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="bg-method" className={label}>상환 방식</label>
                <select id="bg-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={field}>
                  <option value="annuity">원리금균등 (매달 같은 금액)</option>
                  <option value="principal">원금균등 (갈수록 감소)</option>
                </select>
              </div>

              <div>
                <label htmlFor="bg-debt" className={label}>기존 대출 월 상환액 <span className="text-xs text-muted font-normal">(선택)</span></label>
                <div className="relative">
                  <input id="bg-debt" type="text" inputMode="numeric" value={debt} onChange={(e) => setDebt(withCommas(e.target.value))} placeholder="0" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">원</span>
                </div>
                <p className={hint}>신용대출·자동차할부 등 원리금 — DTI에 합산</p>
              </div>
              <div>
                <label htmlFor="bg-want" className={label}>희망 대출금액 <span className="text-xs text-muted font-normal">(선택)</span></label>
                <div className="relative">
                  <input id="bg-want" type="text" inputMode="numeric" value={want} onChange={(e) => setWant(withCommas(e.target.value))} placeholder="비우면 최대 한도" className={`${field} pr-10`} />
                  <span className="absolute right-4 top-3 text-muted text-sm">원</span>
                </div>
                {result && digits(want) > result.maxLoan && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">최대 한도 {fmtKRW(result.maxLoan)}로 계산</p>
                )}
              </div>
            </div>
          </div>

          {/* 우대금리 */}
          <div className="ui-card p-6">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-fg">우대금리</h2>
              {result && (
                <span className="text-sm text-sub tabular-nums">
                  합계 {result.discountSum.toFixed(1)}%p
                  {result.discountSum > DISCOUNT_CAP && <span className="text-muted"> → 상한 {DISCOUNT_CAP.toFixed(1)}%p</span>}
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-subtle text-sm">
                <span className="text-body">신혼가구 <span className="text-xs text-muted">(신혼부부 유형 선택 시 자동)</span></span>
                <span className="tabular-nums text-sub">{loanType === 'newlywed' ? '0.3%p' : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-subtle text-sm">
                <span className="text-body">다자녀가구 <span className="text-xs text-muted">(자녀 수로 자동)</span></span>
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
              우대금리는 합산 최대 {DISCOUNT_CAP.toFixed(1)}%p, 적용 후 최저 {MIN_RATE.toFixed(2)}% (규제지역은 0.2%p 가산). 세부 요건은{' '}
              <a href="https://www.hf.go.kr/ko/sub01/sub01_01_01.do" target="_blank" rel="noopener noreferrer" className="underline">한국주택금융공사 상품 안내</a>에서 확인하세요.
            </p>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          {!result ? (
            <div className="ui-card p-6 text-center text-muted text-sm py-12">
              소득과 주택가격을 입력하면<br />결과가 자동으로 계산됩니다
            </div>
          ) : (
            <div className="ui-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${result.eligible ? STATUS_TEXT.pass.cls : STATUS_TEXT.fail.cls}`}>
                  {result.eligible
                    ? result.checks.some((c) => c.status === 'warn') ? '대출 가능 (확인 필요 항목 있음)' : '대출 가능'
                    : '자격 미충족'}
                </span>
                <button type="button" onClick={copyResult} className="ml-auto flex items-center gap-1.5 bg-soft hover:bg-subtle text-body rounded-lg px-3 py-1.5 text-sm">
                  {copied === 'result' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === 'result' ? '복사됨' : '결과 복사'}
                </button>
              </div>

              {!result.eligible && (
                <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 space-y-1">
                  {result.checks.filter((c) => c.status === 'fail').map((c) => (
                    <div key={c.label}><span className="font-semibold">{c.label}</span> — {c.detail}</div>
                  ))}
                  <div className="text-xs pt-1">아래 금액은 조건 충족 시 참고용입니다.</div>
                </div>
              )}

              <div aria-live="polite">
                <div className="text-sm text-muted">최대 대출한도</div>
                <div className="text-3xl font-bold text-fg tabular-nums">{fmtKRW(result.maxLoan)}</div>
                <div className="text-xs text-muted mt-1">{result.binding.label}에서 결정</div>
              </div>

              <div className="bg-subtle rounded-xl p-4 space-y-1.5 text-sm">
                {result.limits.map((l) => (
                  <div key={l.key} className="flex justify-between gap-2">
                    <span className={l.key === result.binding.key ? 'text-fg font-semibold' : 'text-sub'}>{l.label}</span>
                    <span className={`tabular-nums ${l.key === result.binding.key ? 'text-fg font-semibold' : 'text-sub'}`}>{fmtKRW(l.amount)}</span>
                  </div>
                ))}
                <div className="border-t border-line pt-1.5 mt-1 flex justify-between text-sub">
                  <span>필요 자기자본</span>
                  <span className="tabular-nums">{fmtKRW(Math.max(0, priceNum - result.loan))}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted">적용 금리</div>
                  <div className="text-2xl font-bold text-fg tabular-nums">{result.rate.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted">월 상환액{method === 'principal' ? ' (첫 달)' : ''}</div>
                  <div className="text-2xl font-bold text-fg tabular-nums">{Math.round(result.methods[method].first / 10_000).toLocaleString()}만원</div>
                </div>
              </div>
              {result.loan !== result.maxLoan && (
                <p className="text-xs text-muted -mt-3">희망 대출금 {fmtKRW(result.loan)} 기준</p>
              )}

              <div className="bg-subtle rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-sub">기준금리 ({period}년)</span>
                  <span className="tabular-nums text-fg">{result.baseRate.toFixed(2)}%</span>
                </div>
                {result.discounts.map((d) => (
                  <div key={d.label} className="flex justify-between text-sub">
                    <span>{d.label}</span>
                    <span className="tabular-nums">−{d.rate.toFixed(1)}%p</span>
                  </div>
                ))}
                {result.discountSum > DISCOUNT_CAP && (
                  <div className="flex justify-between text-muted text-xs"><span>우대 상한 적용</span><span>최대 −{DISCOUNT_CAP.toFixed(1)}%p</span></div>
                )}
                {result.surcharge > 0 && (
                  <div className="flex justify-between text-sub">
                    <span>규제지역 가산</span>
                    <span className="tabular-nums">+{result.surcharge.toFixed(1)}%p</span>
                  </div>
                )}
                <div className="border-t border-line pt-1.5 mt-1 flex justify-between font-semibold text-fg">
                  <span>최종 적용금리</span>
                  <span className="tabular-nums">{result.rate.toFixed(2)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-subtle rounded-lg p-3">
                  <div className="text-muted text-xs mb-0.5">총 이자</div>
                  <div className="font-semibold text-fg tabular-nums">{fmtKRW(result.methods[method].interest)}</div>
                </div>
                <div className="bg-subtle rounded-lg p-3">
                  <div className="text-muted text-xs mb-0.5">DTI (기존 대출 포함)</div>
                  <div className={`font-semibold tabular-nums ${result.dti > result.dtiCap ? STATUS_TEXT.fail.cls : 'text-fg'}`}>{result.dti.toFixed(1)}%</div>
                </div>
              </div>

              {/* 자격 체크리스트 */}
              <div>
                <div className="text-sm font-semibold text-fg mb-2">자격 체크</div>
                <ul className="divide-y divide-line text-sm">
                  {result.checks.map((c) => (
                    <li key={c.label} className="py-2 flex gap-3">
                      <span className={`w-16 flex-shrink-0 font-semibold ${STATUS_TEXT[c.status].cls}`}>{STATUS_TEXT[c.status].label}</span>
                      <span className="text-body"><span className="text-fg font-medium">{c.label}</span> · {c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted">
                신용점수 271점 이상(614점 이하·소득 추정 시 LTV 10%p 차감) 등 심사 조건과 담보 평가액에 따라 실제 한도·금리는 달라질 수 있습니다.
              </p>
            </div>
          )}

          {result && (
            <div className="flex gap-3">
              <button type="button" onClick={handleShare} className="ui-btn flex-1 py-2.5 text-sm">
                {copied === 'link' ? <><Check className="w-4 h-4" />링크 복사됨</> : <><Share2 className="w-4 h-4" />결과 공유</>}
              </button>
              {showSaveButton && (
                <button type="button" onClick={handleSave} className="ui-btn-soft flex-1 py-2.5 text-sm">
                  <Save className="w-4 h-4" />저장
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {result && result.loan > 0 && (
        <>
          {/* 상환방식 비교 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">상환 방식 비교</h2>
            <p className="text-xs text-muted mb-4">대출금 {fmtKRW(result.loan)} · {period}년 · 금리 {result.rate.toFixed(2)}% 기준</p>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="text-left py-2 px-2 font-medium">방식</th>
                    <th className="text-right py-2 px-2 font-medium">첫 달</th>
                    <th className="text-right py-2 px-2 font-medium">마지막 달</th>
                    <th className="text-right py-2 px-2 font-medium">총 이자</th>
                  </tr>
                </thead>
                <tbody>
                  {(['annuity', 'principal'] as Method[]).map((m) => (
                    <tr key={m} onClick={() => setMethod(m)} className={`border-b border-line cursor-pointer ${method === m ? 'bg-subtle font-semibold' : 'hover:bg-subtle'}`}>
                      <td className="py-2.5 px-2 text-fg">{METHOD_LABEL[m]}{method === m && <span className="text-xs text-primary ml-1">선택</span>}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-fg">{fmtWon(result.methods[m].first)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{fmtWon(result.methods[m].last)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{fmtKRW(result.methods[m].interest)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-line">
                    <td className="py-2.5 px-2 text-fg">체증식</td>
                    <td colSpan={3} className="py-2.5 px-2 text-right text-xs text-muted">
                      {parseInt(age) < 40 && period !== '50'
                        ? '신청 가능 — 초기 상환액이 원리금균등보다 낮고 점차 증가 (공사 사전심사 필요)'
                        : '만 40세 미만 · 만기 50년 제외 조건 미충족'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              원금균등은 총 이자가 {fmtKRW(Math.max(0, result.methods.annuity.interest - result.methods.principal.interest))} 적지만 초기 부담이 {fmtWon(Math.max(0, result.methods.principal.first - result.methods.annuity.first))} 더 큽니다.
            </p>
          </div>

          {/* 연도별 상환 스케줄 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4">연도별 상환 스케줄 <span className="text-xs font-normal text-muted">({METHOD_LABEL[method]})</span></h2>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={schedule} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e8eb" />
                  <XAxis dataKey="year" tickFormatter={(v) => `${v}년`} tick={{ fontSize: 11, fill: '#8b95a1' }} interval={Math.max(0, Math.floor(schedule.length / 8) - 1)} />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 10_000).toLocaleString()}만`} tick={{ fontSize: 11, fill: '#8b95a1' }} width={56} />
                  <Tooltip
                    formatter={(value, name) => [fmtWon(Number(value ?? 0)), name === 'principal' ? '원금 상환' : '이자']}
                    labelFormatter={(v) => `${v}년차`}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e8eb' }}
                  />
                  <Area type="monotone" dataKey="principal" stackId="1" stroke="#3182F6" fill="#3182F6" fillOpacity={0.35} name="principal" />
                  <Area type="monotone" dataKey="interest" stackId="1" stroke="#8b95a1" fill="#8b95a1" fillOpacity={0.3} name="interest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs text-muted">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#3182F6', opacity: 0.5 }} />원금 상환</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#8b95a1', opacity: 0.5 }} />이자</span>
            </div>
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-medium text-primary select-none">연도별 상세 표 보기</summary>
              <div className="overflow-x-auto -mx-2 mt-3 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="text-left py-2 px-2 font-medium">연차</th>
                      <th className="text-right py-2 px-2 font-medium">원금</th>
                      <th className="text-right py-2 px-2 font-medium">이자</th>
                      <th className="text-right py-2 px-2 font-medium">연 상환액</th>
                      <th className="text-right py-2 px-2 font-medium">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.year} className="border-b border-line tabular-nums">
                        <td className="py-2 px-2 text-fg">{row.year}년</td>
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
              대출 기간별 비교 <span className="text-xs font-normal text-muted">(대출금 {fmtKRW(result.loan)} · 원리금균등 · 우대 {result.totalDiscount.toFixed(1)}%p 반영)</span>
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="text-left py-2 px-2 font-medium">기간</th>
                    <th className="text-right py-2 px-2 font-medium">금리</th>
                    <th className="text-right py-2 px-2 font-medium">월 상환액</th>
                    <th className="text-right py-2 px-2 font-medium">총 이자</th>
                  </tr>
                </thead>
                <tbody>
                  {periodComparison.map((row) => (
                    <tr key={row.period} onClick={() => setPeriod(row.period)} className={`border-b border-line cursor-pointer ${row.period === period ? 'bg-subtle font-semibold' : 'hover:bg-subtle'}`}>
                      <td className="py-2.5 px-2 text-fg">{row.period}년{row.period === period && <span className="text-xs text-primary ml-1">선택</span>}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{row.rate.toFixed(2)}%</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-fg">{fmtWon(row.monthly)}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-body">{fmtKRW(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              기간이 짧을수록 월 상환액은 크지만 총 이자는 적습니다. 40년은 만 40세 미만, 50년은 만 35세 미만(신혼가구 완화)만 가능합니다.
            </p>
          </div>
        </>
      )}

      {/* 관련 사이트 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">관련 사이트</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { name: '한국주택금융공사 보금자리론', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_01.do', desc: '상품 조건·우대금리·최신 금리 확인' },
            { name: '스마트주택금융 (신청)', url: 'https://www.hf.go.kr', desc: '아낌e 보금자리론 온라인 신청' },
            { name: '국토교통부 실거래가', url: 'https://rt.molit.go.kr', desc: '아파트·주택 실거래가 공개 시스템' },
            { name: '부동산 공시가격 알리미', url: 'https://www.realtyprice.kr', desc: '공동주택 공시가격 조회' },
          ].map((link) => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-subtle rounded-xl hover:bg-soft transition-colors group">
              <div className="font-medium text-fg group-hover:underline text-sm">{link.name}</div>
              <div className="text-xs text-muted mt-0.5">{link.desc}</div>
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
        <h2 className="text-lg font-semibold text-fg mb-4">2026년 보금자리론 유형별 핵심 조건</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { type: '일반', items: ['소득 7천만원 이하 (자녀 1명 9천만)', '한도 최대 3.6억', 'LTV 70% (기타주택 65%, 규제지역 −10%p)', '유형 우대 없음'] },
            { type: '생애최초', items: ['소득 7천만원 이하', '한도 최대 4.2억', 'LTV 80% (수도권·규제지역 70%)', '부부 모두 주택 소유 이력 없음'] },
            { type: '신혼부부', items: ['소득 8.5천만원 이하', '한도 최대 3.6억', '혼인 7년 이내', '금리 우대 0.3%p'] },
            { type: '다자녀', items: ['소득 1억원 이하', '한도 최대 4억', '미성년 자녀 2명 이상', '우대 0.5%p (3명+ 0.7%p)'] },
          ].map((g) => (
            <div key={g.type} className="bg-subtle rounded-xl p-4">
              <div className="font-semibold text-sm text-fg mb-2">{g.type}</div>
              <ul className="space-y-1 text-xs text-sub list-disc pl-4">
                {g.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">
          주택가격 6억원 이하, 무주택 또는 1주택(3년 내 처분 조건) 공통. 규제지역 주택은 금리 0.2%p 가산, 수도권·규제지역은 6개월 내 전입 의무. 금리는 매월 변동되므로 한국주택금융공사에서 최신 금리를 확인하세요.
        </p>
      </div>

      <GuideSection namespace="bogeumjariLoan" />
    </div>
  );
}
