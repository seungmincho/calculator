import { decisionTools } from '@/config/decisionTools'
import DecisionToolsBar from './DecisionToolsBar'
import DecisionToolClient, { type DecisionToolHref } from './DecisionToolClient'
import RelatedTools from './RelatedTools'

/** 단독 결정 도구 페이지: 전환 바 + 도구 + 설명/FAQ(서버 렌더, SEO) */
export default function DecisionToolPage({ href }: { href: DecisionToolHref }) {
  const p = decisionTools.find(d => d.href === href)!.page!
  const url = `https://toolhub.ai.kr${href}/`
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebApplication', name: p.title.split(' - ')[0], description: p.description,
      url, applicationCategory: 'UtilityApplication', operatingSystem: 'Any', inLanguage: 'ko',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DecisionToolsBar current={href} />
      <div className="min-h-[480px]">
        <DecisionToolClient href={href} />
      </div>
      <section className="ui-card p-6 space-y-5">
        <p className="text-body leading-relaxed">{p.intro}</p>
        <div className="space-y-4">
          {p.faq.map(f => (
            <div key={f.q}>
              <h2 className="text-base font-bold text-fg mb-1">{f.q}</h2>
              <p className="text-sm text-sub leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
      <RelatedTools />
    </div>
  )
}
