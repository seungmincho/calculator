// 석차등급 회귀 체크: node scripts/check-grade-rank.ts
import { gradeOf, boundaries, weightedAverage, systemForYear } from '../src/utils/gradeRank.ts'
let fail = 0
const eq = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', label, a, '!=', b) } }
// 9등급: 100명 중 4등=1등급, 5등=2등급, 11등=2등급, 12등=3등급
eq('9g 4/100', gradeOf(4, 1, 100, 9)?.grade, 1)
eq('9g 5/100', gradeOf(5, 1, 100, 9)?.grade, 2)
eq('9g 11/100', gradeOf(11, 1, 100, 9)?.grade, 2)
eq('9g 12/100', gradeOf(12, 1, 100, 9)?.grade, 3)
eq('9g 100/100', gradeOf(100, 1, 100, 9)?.grade, 9)
// 지침 예시: 96명, 1등 동점 7명 → 중간석차 4, 4.17% → 2등급
eq('tie mid', gradeOf(1, 7, 96, 9)?.midRank, 4)
eq('tie grade', gradeOf(1, 7, 96, 9)?.grade, 2)
// 5등급: 150명 → 1등급 15등까지, 16등 2등급, 51등 2등급, 52등 3등급
eq('5g 15/150', gradeOf(15, 1, 150, 5)?.grade, 1)
eq('5g 16/150', gradeOf(16, 1, 150, 5)?.grade, 2)
eq('5g 51/150', gradeOf(51, 1, 150, 5)?.grade, 2)
eq('5g 52/150', gradeOf(52, 1, 150, 5)?.grade, 3)
// 부동소수 경계: 0.1*30=3.0000000000000004 류 오차 없는지 (30명 3등 = 정확히 10%)
eq('5g 3/30', gradeOf(3, 1, 30, 5)?.grade, 1)
// 소인수: 9등급 10명이면 1등도 10% → 2등급
eq('9g 1/10', gradeOf(1, 1, 10, 9)?.grade, 2)
eq('bounds 9g 10', boundaries(10, 9).map(b => b.count), [0, 1, 1, 2, 2, 1, 1, 1, 1])
eq('bounds 5g 150', boundaries(150, 5).map(b => b.to), [15, 51, 99, 135, 150])
// 잘못된 입력
eq('rank>total', gradeOf(11, 1, 10, 9), null)
eq('ties overflow', gradeOf(9, 3, 10, 9), null)
eq('zero', gradeOf(0, 1, 10, 9), null)
eq('avg', weightedAverage([{ units: 4, grade: 1 }, { units: 2, grade: 4 }]), 2)
eq('avg empty', weightedAverage([]), null)
eq('year', [systemForYear(2024), systemForYear(2025)], [9, 5])
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
