// FAQ를 화면에 보이게 렌더링하고, 같은 문항으로 FAQPage JSON-LD를 함께 출력한다 (서버 컴포넌트).
// 화면에 없는 FAQ 마크업은 Google이 무시할 수 있어서 두 가지를 한 곳에서 만든다.
// 페이지당 FAQPage는 하나만 둘 것 (ToolFaq 또는 FaqJsonLd 중 하나).

export interface FaqItem {
  q: string
  a: string
}

/** JSON-LD만 출력. 도구 컴포넌트가 이미 같은 FAQ를 화면에 보여줄 때 사용 (문구가 화면과 정확히 같아야 함). */
export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default function ToolFaq({ items, title = '자주 묻는 질문' }: { items: FaqItem[]; title?: string }) {
  return (
    <section aria-labelledby="tool-faq-title" className="ui-card p-6 mt-8">
      <FaqJsonLd items={items} />
      <h2 id="tool-faq-title" className="text-xl font-semibold text-fg mb-4">
        {title}
      </h2>
      <div className="divide-y divide-line border-y border-line">
        {items.map(({ q, a }) => (
          <details key={q} className="py-3">
            <summary className="cursor-pointer py-1 font-medium text-fg">{q}</summary>
            <p className="mt-2 text-body leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
