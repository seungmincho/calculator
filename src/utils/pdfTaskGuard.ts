/** One generation for every PDF tab's reads, exports and result/download completion. */
export function createPdfTaskGuard() {
  let generation = 0
  return {
    begin(): number { return ++generation },
    invalidate(): void { generation++ },
    isCurrent(token: number): boolean { return token === generation },
  }
}

/** Snapshot list metadata without reading or cloning the immutable original File contents. */
export function snapshotPdfItems<T extends { file: unknown }>(items: readonly T[]): T[] {
  return items.map(item => ({ ...item }))
}
