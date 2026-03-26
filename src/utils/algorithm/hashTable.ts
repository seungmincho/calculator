// Hash Table 자료구조 — 체이닝 & 오픈 어드레싱 (선형/이차 프로빙)

export type CollisionStrategy = 'chaining' | 'linear-probing' | 'quadratic-probing'

export interface HashEntry {
  key: string
  value: number
  hash: number
}

export interface HashTableStep {
  /** chaining: 각 버킷이 배열(리스트), probing: 단일 슬롯 */
  buckets: (HashEntry | null)[][]
  action: 'hash' | 'insert' | 'collision' | 'probe' | 'found' | 'not-found' | 'resize'
  key: string
  hash: number
  bucketIndex: number
  probeCount: number
  message: string
}

export interface HashTableResult {
  steps: HashTableStep[]
  loadFactor: number
}

// ── 해시 함수 ──────────────────────────────────────────────────────────────────

/** 단순 합산 해시: 각 문자 코드의 합 % tableSize */
export function simpleHash(key: string, tableSize: number): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h + key.charCodeAt(i)) % tableSize
  }
  return h
}

// ── 버킷 깊은 복사 ─────────────────────────────────────────────────────────────

function cloneBuckets(buckets: (HashEntry | null)[][]): (HashEntry | null)[][] {
  return buckets.map(slot => slot.map(e => (e ? { ...e } : null)))
}

// ── 프로브 시퀀스 계산 ─────────────────────────────────────────────────────────

/** 선형 프로빙: (hash + i) % size */
function linearProbe(hash: number, i: number, size: number): number {
  return (hash + i) % size
}

/** 이차 프로빙: (hash + i*i) % size */
function quadraticProbe(hash: number, i: number, size: number): number {
  return (hash + i * i) % size
}

function getProbeIndex(
  hash: number,
  i: number,
  size: number,
  strategy: CollisionStrategy,
): number {
  if (strategy === 'linear-probing') return linearProbe(hash, i, size)
  if (strategy === 'quadratic-probing') return quadraticProbe(hash, i, size)
  return hash // chaining: always same bucket
}

// ── 초기 빈 테이블 생성 ────────────────────────────────────────────────────────

function createEmptyBuckets(tableSize: number): (HashEntry | null)[][] {
  return Array.from({ length: tableSize }, () => [null])
}

// ── 삽입 ──────────────────────────────────────────────────────────────────────

/**
 * 여러 엔트리를 순서대로 삽입하며 단계별 스냅샷을 기록합니다.
 */
export function hashTableInsert(
  entries: { key: string; value: number }[],
  tableSize: number,
  strategy: CollisionStrategy,
): HashTableResult {
  const buckets = createEmptyBuckets(tableSize)
  const steps: HashTableStep[] = []
  let insertedCount = 0
  let collisionCount = 0

  for (const { key, value } of entries) {
    const hash = simpleHash(key, tableSize)

    // Step 1: 해시 계산
    steps.push({
      buckets: cloneBuckets(buckets),
      action: 'hash',
      key,
      hash,
      bucketIndex: hash,
      probeCount: 0,
      message: `hash("${key}") = ${hash}`,
    })

    if (strategy === 'chaining') {
      // 체이닝: 충돌이 있으면 리스트에 추가
      const existing = buckets[hash].filter(e => e !== null)
      if (existing.length > 0) {
        collisionCount++
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'collision',
          key,
          hash,
          bucketIndex: hash,
          probeCount: 0,
          message: `버킷 ${hash}에 충돌! 체이닝으로 연결`,
        })
      }
      const entry: HashEntry = { key, value, hash }
      buckets[hash] = buckets[hash].filter(e => e !== null)
      buckets[hash].push(entry)
      insertedCount++
      steps.push({
        buckets: cloneBuckets(buckets),
        action: 'insert',
        key,
        hash,
        bucketIndex: hash,
        probeCount: 0,
        message: `"${key}" → 버킷 ${hash} 삽입 완료`,
      })
    } else {
      // 오픈 어드레싱: 빈 슬롯 찾기
      let probeCount = 0
      let inserted = false

      for (let i = 0; i < tableSize; i++) {
        const probeIdx = getProbeIndex(hash, i, tableSize, strategy)
        const slot = buckets[probeIdx][0]

        if (i > 0) {
          collisionCount++
          steps.push({
            buckets: cloneBuckets(buckets),
            action: 'probe',
            key,
            hash,
            bucketIndex: probeIdx,
            probeCount: i,
            message: `프로브 ${i}: 슬롯 ${probeIdx} 확인 중`,
          })
        }

        if (slot === null) {
          // 빈 슬롯 발견
          if (i > 0) {
            // 충돌 기록은 이미 위에서 push됨
          } else if (buckets[hash][0] !== null) {
            // 첫 슬롯이 채워진 경우 (첫 번째 프로브는 hash 자체)
            collisionCount++
            steps.push({
              buckets: cloneBuckets(buckets),
              action: 'collision',
              key,
              hash,
              bucketIndex: hash,
              probeCount: 0,
              message: `슬롯 ${hash}에 충돌!`,
            })
          }
          const entry: HashEntry = { key, value, hash }
          buckets[probeIdx][0] = entry
          insertedCount++
          probeCount = i
          inserted = true
          steps.push({
            buckets: cloneBuckets(buckets),
            action: 'insert',
            key,
            hash,
            bucketIndex: probeIdx,
            probeCount: i,
            message: `"${key}" → 슬롯 ${probeIdx} 삽입 완료 (프로브 ${i}회)`,
          })
          break
        } else if (i === 0) {
          // 첫 슬롯이 이미 채워짐 → 충돌
          collisionCount++
          steps.push({
            buckets: cloneBuckets(buckets),
            action: 'collision',
            key,
            hash,
            bucketIndex: hash,
            probeCount: 0,
            message: `슬롯 ${hash}에 충돌! 다음 슬롯 탐색`,
          })
        }
      }

      if (!inserted) {
        // 테이블이 꽉 찬 경우 (이론상 발생 안 함)
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'resize',
          key,
          hash,
          bucketIndex: hash,
          probeCount: tableSize,
          message: `테이블 꽉 참 — 삽입 실패`,
        })
      }
    }
  }

  // 적재율 계산
  const occupied = strategy === 'chaining'
    ? buckets.reduce((sum, slot) => sum + slot.filter(e => e !== null).length, 0)
    : buckets.filter(slot => slot[0] !== null).length

  const loadFactor = occupied / tableSize

  return { steps, loadFactor }
}

// ── 탐색 ──────────────────────────────────────────────────────────────────────

/**
 * 주어진 버킷 상태에서 키를 탐색하며 단계를 기록합니다.
 */
export function hashTableSearch(
  buckets: (HashEntry | null)[][],
  key: string,
  strategy: CollisionStrategy,
): { steps: HashTableStep[]; found: boolean } {
  const tableSize = buckets.length
  const hash = simpleHash(key, tableSize)
  const steps: HashTableStep[] = []

  // Step: 해시 계산
  steps.push({
    buckets: cloneBuckets(buckets),
    action: 'hash',
    key,
    hash,
    bucketIndex: hash,
    probeCount: 0,
    message: `hash("${key}") = ${hash}`,
  })

  if (strategy === 'chaining') {
    const chain = buckets[hash].filter(e => e !== null)
    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i]!
      if (entry.key === key) {
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'found',
          key,
          hash,
          bucketIndex: hash,
          probeCount: i,
          message: `"${key}" 발견! 버킷 ${hash}, 체인 인덱스 ${i}`,
        })
        return { steps, found: true }
      }
    }
    steps.push({
      buckets: cloneBuckets(buckets),
      action: 'not-found',
      key,
      hash,
      bucketIndex: hash,
      probeCount: 0,
      message: `"${key}" 없음 (버킷 ${hash} 체인 전체 확인)`,
    })
    return { steps, found: false }
  } else {
    for (let i = 0; i < tableSize; i++) {
      const probeIdx = getProbeIndex(hash, i, tableSize, strategy)
      const slot = buckets[probeIdx][0]

      if (i > 0) {
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'probe',
          key,
          hash,
          bucketIndex: probeIdx,
          probeCount: i,
          message: `프로브 ${i}: 슬롯 ${probeIdx}`,
        })
      }

      if (slot === null) {
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'not-found',
          key,
          hash,
          bucketIndex: probeIdx,
          probeCount: i,
          message: `빈 슬롯 만남 → "${key}" 없음`,
        })
        return { steps, found: false }
      }
      if (slot.key === key) {
        steps.push({
          buckets: cloneBuckets(buckets),
          action: 'found',
          key,
          hash,
          bucketIndex: probeIdx,
          probeCount: i,
          message: `"${key}" 발견! 슬롯 ${probeIdx} (프로브 ${i}회)`,
        })
        return { steps, found: true }
      }
    }
    steps.push({
      buckets: cloneBuckets(buckets),
      action: 'not-found',
      key,
      hash,
      bucketIndex: hash,
      probeCount: tableSize,
      message: `"${key}" 없음 (전체 탐색)`,
    })
    return { steps, found: false }
  }
}

// ── 랜덤 데이터 생성 ───────────────────────────────────────────────────────────

const SAMPLE_KEYS = [
  'apple', 'banana', 'cat', 'dog', 'egg',
  'fox', 'grape', 'hat', 'ink', 'jar',
  'key', 'lamp', 'moon', 'nut', 'owl',
  'pen', 'quiz', 'rose', 'sun', 'tea',
]

/** count개의 랜덤 키-값 쌍 생성 */
export function generateEntries(count: number): { key: string; value: number }[] {
  const shuffled = [...SAMPLE_KEYS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, SAMPLE_KEYS.length)).map(key => ({
    key,
    value: Math.floor(Math.random() * 100) + 1,
  }))
}
