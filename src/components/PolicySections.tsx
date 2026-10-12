// 소개·이용약관 본문 — 번역의 [{ title, paragraphs?, items? }] 배열을 그대로 그린다
export interface PolicySection {
  title: string
  paragraphs?: string[]
  items?: string[]
}

export default function PolicySections({ sections }: { sections: PolicySection[] }) {
  return (
    <div className="space-y-8">
      {sections.map(s => (
        <section key={s.title}>
          <h2 className="text-lg font-semibold text-fg mb-3">{s.title}</h2>
          {s.paragraphs?.map(p => (
            <p key={p} className="text-body leading-relaxed">{p}</p>
          ))}
          {s.items && (
            <ul className="list-disc pl-5 mt-2 space-y-2 text-body leading-relaxed">
              {s.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
