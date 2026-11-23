/**
 * 원 단위 내림. 요율이 2진수로 아주 조금 작게 저장돼 정확히 정수여야 할 곱이 그 바로 아래가 된다
 * (47,600,000 × 0.009 = 428,399.999…, 180 × 0.35 = 62.999…, 50,000 × 0.1314 = 6,569.999…).
 * 그 오차(연산 몇 번 × 반 ulp ≈ |x|·4e-16)보다 크고 정상 끝수(요율 소수 6자리면 0.000001)보다 작은 값을 더해 내린다.
 * 검증: node scripts/check-won.ts
 */
export const floorWon = (x: number) => Math.floor(x + 1e-9 + Math.abs(x) * 1e-15)

/** 10원 미만 버림(국고금관리법 §47 등). floorWon 과 같은 보정 */
export const floor10Won = (x: number) => floorWon(x / 10) * 10
