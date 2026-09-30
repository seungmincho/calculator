'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Share2, Check, Save, Copy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import CalculationHistory from '@/components/CalculationHistory';
import GuideSection from '@/components/GuideSection';

type LoanType = 'general' | 'first' | 'newlywed' | 'multichild';
type Owned = '0' | '1' | '2';
type HouseKind = 'apt' | 'other';
type Method = 'annuity' | 'principal';

// 2026년 9월 기준 아낌e 보금자리론 기준금리 (주금공 9월 동결 발표: 10년 4.90 ~ 50년 5.20, 우대 최대 1.0%p → 최저 3.90)
// 실제 금리는 매월 변동 — 한국주택금융공사(hf.go.kr) 확인. 25년은 공식 만기가 아니라 20·30년 사이값.
const PERIOD_RATES: Record<string, number> = {
  '10': 4.90,
  '15': 5.00,
  '20': 5.05,
  '25': 5.08,
  '30': 5.10,
  '40': 5.15,
  '50': 5.20,
};
const RATE_FLOOR = 3.90;
const DISCOUNT_CAP = 1.0;

// 소득 기준 (부부합산 연간) — 기본 7천만, 신혼(7년내) 8.5천만, 미성년 자녀 1명 9천만, 2명 이상 1억
// 출처: https://www.hf.go.kr/ko/sub01/sub01_01_01.do (2026-09-30 확인)
function getIncomeLimit(type: LoanType, children: number): number {
  let limit = 70_000_000;
  if (children === 1) limit = 90_000_000;
  else if (children >= 2) limit = 100_000_000;
  if (type === 'newlywed') limit = Math.max(limit, 85_000_000);
  if (type === 'multichild') limit = Math.max(limit, 100_000_000);
  return limit;
}

// 최대 대출한도 — 기본 3.6억, 생애최초 4.2억, 다자녀 4억 (출처 동일)
const MAX_LOAN: Record<LoanType, number> = {
  general: 360_000_000,
  first: 420_000_000,
  newlywed: 360_000_000,
  multichild: 400_000_000,
};

// LTV: 아파트 70%, 기타주택 65% (https://www.hf.go.kr/ko/sub01/sub01_01_01.do), 생애최초 80%(특례구입자금보증 이용 시)
// ponytail: 규제지역 -10%p 차감은 실수요자 예외가 많아 미반영 — 안내 문구로만 표시
function getLtv(type: LoanType, kind: HouseKind): number {
  if (type === 'first') return 0.80;
  return kind === 'apt' ? 0.70 : 0.65;
}

const HOUSE_PRICE_LIMIT = 600_000_000; // 6억원 (전국 균일)
const DTI_LIMIT = 60; // 60%

// 우대금리 (최대 1.0%p) — 출처: https://www.hf.go.kr/ko/sub01/sub01_01_01.do (2026-09-30 확인)
// 신혼가구 0.3, 다자녀 2자녀 0.5 / 3자녀+ 0.7 은 입력값에서 자동 적용. 생애최초 자체 우대금리는 공식 목록에 없음.
// 신혼가구와 신생아출산가구는 중복 불가.
const PERKS: { id: string; label: string; rate: number; desc: string }[] = [
  { id: 'newborn', label: '신생아출산가구', rate: 0.2, desc: '신혼가구 우대와 중복 불가' },
  { id: 'youth', label: '저소득청년', rate: 0.1, desc: '청년·소득 요건 충족 시' },
  { id: 'single', label: '한부모가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'disabled', label: '장애인가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'multicultural', label: '다문화가구', rate: 0.7, desc: '사회적 배려층' },
  { id: 'green', label: '녹색건축물', rate: 0.1, desc: '인증 주택 구입 시' },
  { id: 'unsold', label: '미분양주택', rate: 0.2, desc: '미분양관리지역 미분양주택' },
  { id: 'fraud', label: '전세사기피해자', rate: 1.0, desc: '피해자 결정 시' },
];

const LOAN_TYPE_INFO: Record<LoanType, { label: string; sublabel: string; benefit: string }> = {
  first: { label: '생애최초', sublabel: '처음 집 구입', benefit: 'LTV 80% · 한도 4.2억' },
  newlywed: { label: '신혼부부', sublabel: '혼인 7년 이내', benefit: '소득 8.5천만 · 우대 0.3%p' },
  multichild: { label: '다자녀', sublabel: '미성년 자녀 2명 이상', benefit: '한도 4억 · 우대 0.5~0.7%p' },
  general: { label: '일반', sublabel: '기본 조건', benefit: 'LTV 70% · 한도 3.6억' },
};

const METHOD_LABEL: Record<Method, string> = { annuity: '원리금균등', principal: '원금균등' };

export interface BogeumjariInput {
  income: number;
  price: number;
  type: LoanType;
  children: number;
  period: string;
  age: number;
  owned: Owned;
  kind: HouseKind;
  debtMonthly: number; // 기존 대출 월 원리금
  want: number; // 희망 대출액 (0 = 최대)
  perks: string[];
}

type CheckStatus = 'pass' | 'warn' | 'fail';
interface CheckItem { label: string; status: CheckStatus; detail: string }

const annuity = (loan: number, annualRate: number, months: number) => {
  const r = annualRate / 100 / 12;
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
};

const fmtKRW = (n: number) => {
  const v = Math.round(n);
  let eok = Math.floor(v / 100_000_000);
  let man = Math.round((v % 100_000_000) / 10_000);
  if (man === 10_000) { eok += 1; man = 0; }
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  if (man > 0) return `${man.toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};
const fmtWon = (n: number) => `${Math.round(n).toLocaleString()}원`;

export function calcBogeumjari(i: BogeumjariInput) {
  const months = parseInt(i.period) * 12;
  const incomeLimit = getIncomeLimit(i.type, i.children);
  const isNewlywed = i.type === 'newlywed';

  // ── 우대금리 ──
  const discounts: { label: string; rate: number }[] = [];
  if (isNewlywed) discounts.push({ label: '신혼가구', rate: 0.3 });
  if (i.children >= 3) discounts.push({ label: '다자녀(3자녀 이상)', rate: 0.7 });
  else if (i.children === 2) discounts.push({ label: '다자녀(2자녀)', rate: 0.5 });
  for (const p of PERKS) {
    if (!i.perks.includes(p.id)) continue;
    if (p.id === 'newborn' && isNewlywed) continue; // 신혼가구와 중복 불가 (0.3 > 0.2)
    discounts.push({ label: p.label, rate: p.rate });
  }
  const discountSum = discounts.reduce((s, d) => s + d.rate, 0);
  const totalDiscount = Math.min(discountSum, DISCOUNT_CAP);
  const baseRate = PERIOD_RATES[i.period] ?? PERIOD_RATES['30'];
  const rate = Math.max(Number((baseRate - totalDiscount).toFixed(2)), RATE_FLOOR);

  // ── 한도: LTV / 상품 상한 / DTI 중 가장 작은 값 ──
  const ltv = getLtv(i.type, i.kind);
  const ltvLimit = Math.floor(i.price * ltv);
  const capLimit = MAX_LOAN[i.type];
  // DTI = (신규 원리금 + 기존 대출 원리금) / 연소득 ≤ 60%. 신규 대출은 원리금균등 기준으로 역산.
  // ponytail: 원금균등 선택 시에도 원리금균등으로 역산 — 실제 심사는 첫해 상환액 기준일 수 있음
  const monthlyBudget = (i.income / 12) * (DTI_LIMIT / 100) - i.debtMonthly;
  const dtiLimit = monthlyBudget > 0 ? Math.floor(monthlyBudget / annuity(1, rate, months)) : 0;
  const limits = [
    { key: 'ltv' as const, label: `LTV ${Math.round(ltv * 100)}% (주택가격 기준)`, amount: ltvLimit },
    { key: 'cap' as const, label: `${LOAN_TYPE_INFO[i.type].label} 상품 상한`, amount: capLimit },
    { key: 'dti' as const, label: `DTI ${DTI_LIMIT}% (소득 기준)`, amount: dtiLimit },
  ];
  const binding = limits.reduce((a, b) => (b.amount < a.amount ? b : a));
  const maxLoan = Math.max(0, Math.floor(binding.amount / 10_000) * 10_000);
  const loan = i.want > 0 ? Math.min(i.want, maxLoan) : maxLoan;
  const monthly = Math.round(annuity(loan, rate, months));
  const dti = i.income > 0 ? ((monthly + i.debtMonthly) * 12 / i.income) * 100 : 0;

  // ── 자격 체크리스트 ──
  const checks: CheckItem[] = [];
  checks.push(i.income <= incomeLimit
    ? { label: '소득', status: 'pass', detail: `연 ${fmtKRW(i.income)} ≤ 기준 ${fmtKRW(incomeLimit)}` }
    : { label: '소득', status: 'fail', detail: `연 ${fmtKRW(i.income)} — 기준 ${fmtKRW(incomeLimit)} 초과` });
  checks.push(i.price <= HOUSE_PRICE_LIMIT
    ? { label: '주택가격', status: 'pass', detail: `${fmtKRW(i.price)} ≤ 6억원` }
    : { label: '주택가격', status: 'fail', detail: `${fmtKRW(i.price)} — 6억원 초과 주택은 대상 아님` });
  if (i.owned === '2') checks.push({ label: '주택 보유', status: 'fail', detail: '2주택 이상 보유 시 신청 불가 (무주택 또는 1주택만)' });
  else if (i.owned === '1' && i.type === 'first') checks.push({ label: '주택 보유', status: 'fail', detail: '생애최초는 부부 모두 과거 주택 소유 이력이 없어야 함' });
  else if (i.owned === '1') checks.push({ label: '주택 보유', status: 'warn', detail: '1주택자는 기존 주택 처분 조건부 (처분 기한은 공사 확인)' });
  else checks.push({ label: '주택 보유', status: 'pass', detail: i.type === 'first' ? '무주택 · 과거 소유 이력 없음 (본인 확인)' : '무주택' });
  if (i.type === 'multichild' && i.children < 2) checks.push({ label: '유형 요건', status: 'fail', detail: '다자녀 유형은 미성년 자녀 2명 이상' });
  else if (i.type === 'newlywed') checks.push({ label: '유형 요건', status: 'warn', detail: '혼인신고일 7년 이내인지 확인' });
  const p = i.period;
  if (p === '40' || p === '50') {
    const ok = p === '40' ? i.age < 40 || (isNewlywed && i.age < 50) : i.age < 35 || (isNewlywed && i.age < 40);
    const rule = p === '40' ? '만 40세 미만 (신혼가구 만 50세 미만)' : '만 35세 미만 (신혼가구 만 40세 미만)';
    checks.push(ok
      ? { label: `만기 ${p}년`, status: 'pass', detail: `만 ${i.age}세 — ${rule}` }
      : { label: `만기 ${p}년`, status: 'fail', detail: `만 ${i.age}세 — ${rule} 조건 미충족, 더 짧은 만기 선택` });
  }
  checks.push(monthlyBudget > 0
    ? { label: '상환능력(DTI)', status: 'pass', detail: `DTI ${dti.toFixed(1)}% ≤ ${DTI_LIMIT}%` }
    : { label: '상환능력(DTI)', status: 'fail', detail: `기존 대출 상환액만으로 DTI ${DTI_LIMIT}% 초과` });

  const eligible = !checks.some((c) => c.status === 'fail') && loan > 0;

  // ── 상환방식 비교 ──
  const r = rate / 100 / 12;
  const principalFirst = loan / months + loan * r;
  const principalLast = loan / months + (loan / months) * r;
  const methods = {
    annuity: { first: monthly, last: monthly, interest: monthly * months - loan },
    principal: { first: Math.round(principalFirst), last: Math.round(principalLast), interest: Math.round(loan * r * (months + 1) / 2) },
  };

  return {
    eligible, checks, incomeLimit, discounts, discountSum, totalDiscount, baseRate, rate,
    ltv, limits, binding, maxLoan, loan, monthly, dti, methods, months,
  };
}

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
  age: '35', owned: '0' as Owned, kind: 'apt' as HouseKind, debt: '', want: '', method: 'annuity' as Method,
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
      age: parseInt(age) || 0, owned, kind, debtMonthly: digits(debt), want: digits(want), perks,
    });
  }, [incomeNum, priceNum, loanType, childNum, period, age, owned, kind, debt, want, perks]);

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
      income: String(incomeNum), price: String(priceNum), type: loanType, children, period, age, owned, kind, method,
    });
    if (digits(debt)) params.set('debt', String(digits(debt)));
    if (digits(want)) params.set('want', String(digits(want)));
    if (perks.length) params.set('perks', perks.join(','));
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}`);
  }, [urlLoaded, incomeNum, priceNum, loanType, children, period, age, owned, kind, method, debt, want, perks]);

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
      `유형: ${LOAN_TYPE_INFO[loanType].label} · ${period}년 · ${METHOD_LABEL[method]}`,
      result.eligible ? '자격: 충족' : `자격: 미충족 — ${fails.map((f) => f.detail).join(' / ')}`,
      `최대 한도: ${fmtKRW(result.maxLoan)} (${result.binding.label} 기준)`,
      `대출금: ${fmtKRW(result.loan)}`,
      `적용 금리: ${result.rate.toFixed(2)}% (기준 ${result.baseRate.toFixed(2)}% - 우대 ${result.totalDiscount.toFixed(1)}%p)`,
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
      { income, children, price, loanType, period, age, owned, kind, debt, want, method, perks: perks.join(',') },
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
      const rt = Math.max(Number((base - result.totalDiscount).toFixed(2)), RATE_FLOOR);
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
          <span className="text-xs font-semibold bg-soft text-sub px-2 py-0.5 rounded-full">2026년 9월 기준</span>
        </div>
        <p className="text-sm text-muted">
          자격·대출한도·우대금리 적용 금리·월 상환액을 한 번에 확인하세요 (기준금리 4.90~5.20%, 우대 최대 1.0%p, 최저 3.90%)
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
                {loanType === 'first' && <p className={hint}>생애최초는 LTV 80% 적용</p>}
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
              우대금리는 합산 최대 1.0%p, 적용 후 최저 3.90%. 세부 요건은{' '}
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

              <div>
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
                {result.baseRate - result.totalDiscount < RATE_FLOOR && (
                  <div className="flex justify-between text-muted text-xs"><span>최저금리 적용</span><span>{RATE_FLOOR.toFixed(2)}%</span></div>
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
                  <div className={`font-semibold tabular-nums ${result.dti > DTI_LIMIT ? STATUS_TEXT.fail.cls : 'text-fg'}`}>{result.dti.toFixed(1)}%</div>
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
                신용점수 271점 이상 등 심사 조건과 규제지역(LTV·DTI 10%p 차감) 여부에 따라 실제 한도·금리는 달라질 수 있습니다.
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
            { type: '일반', items: ['소득 7천만원 이하 (자녀 1명 9천만)', '한도 최대 3.6억', 'LTV 70% (기타주택 65%)', '유형 우대 없음'] },
            { type: '생애최초', items: ['소득 7천만원 이하', '한도 최대 4.2억', 'LTV 80%', '부부 모두 주택 소유 이력 없음'] },
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
          주택가격 6억원 이하, 무주택 또는 1주택(처분 조건) 공통. 금리는 매월 변동되므로 한국주택금융공사에서 최신 금리를 확인하세요.
        </p>
      </div>

      <GuideSection namespace="bogeumjariLoan" />
    </div>
  );
}
