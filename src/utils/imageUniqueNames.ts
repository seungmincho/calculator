/** Keep original names reserved so generated suffixes cannot take a later file's name. */
export function reserveUniqueImageNames(names: readonly string[]): string[] {
  const reserved = new Set(names.map(name => name.toLowerCase()))
  const used = new Set<string>()
  const nextSuffix = new Map<string, number>()
  return names.map(name => {
    const key = name.toLowerCase()
    if (!used.has(key)) {
      used.add(key)
      return name
    }
    const [, base, extension = ''] = name.match(/^(.*?)(\.[^.]*)?$/)!
    let suffix = nextSuffix.get(key) ?? 2
    let candidate: string
    do { candidate = `${base} (${suffix++})${extension}` }
    while (reserved.has(candidate.toLowerCase()) || used.has(candidate.toLowerCase()))
    nextSuffix.set(key, suffix)
    used.add(candidate.toLowerCase())
    return candidate
  })
}
