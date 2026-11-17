import type { Metadata } from 'next'
import Link from 'next/link'
import copy from '../../../messages/generated/ko/ns/toolGuides.json'
import { guidePath, guides, halfPriceParcelSlug, leapBirthdaySlug, pyeongAreaSlug } from '@/content/guides/catalog'

const t = copy.toolGuides
const url = 'https://toolhub.ai.kr/guides/'
export const metadata: Metadata = {
  title: t.title + ' | 툴허브',
  description: t.description,
  alternates: { canonical: url },
  openGraph: { title: t.title, description: t.description, url, type: 'website' },
  twitter: { card: 'summary', title: t.title, description: t.description },
}

export default function GuidesPage() {
  const featured = [halfPriceParcelSlug, leapBirthdaySlug, pyeongAreaSlug].map(slug => guides.find(guide => guide.slug === slug)!)
  const categories = Object.entries(t.categories)
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-sub">{t.description}</p>
      </header>
      <section className="my-8" aria-labelledby="featured-guides">
        <h2 id="featured-guides" className="mb-3 text-xl font-bold text-fg">{t.featured}</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {featured.map(guide => (
            <li key={guide.slug}>
              <Link href={guidePath(guide.slug)} className="block h-full rounded-2xl bg-subtle p-5 hover:bg-soft">
                <h3 className="break-keep text-lg font-bold leading-snug text-fg">{guide.title}</h3>
                <p className="mt-2 text-sm leading-6 text-sub">{guide.intro}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <nav aria-label={t.browse} className="flex flex-wrap gap-2">
        {categories.map(([key, label]) => <a key={key} href={'#' + key} className="ui-btn-soft px-4 py-2 text-sm">{label}</a>)}
      </nav>
      {categories.map(([key, label]) => (
        <section key={key} id={key} className="mt-12 scroll-mt-20">
          <h2 className="border-b border-line pb-3 text-2xl font-bold tracking-tight text-fg">{label}</h2>
          <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {guides.filter(guide => guide.category === key && !featured.includes(guide)).map(guide => (
              <li key={guide.slug} className="border-b border-line">
                <Link href={guidePath(guide.slug)} prefetch={false} className="group block py-5">
                  <h3 className="break-keep text-lg font-semibold leading-snug text-fg group-hover:underline">{guide.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-sub">{guide.intro}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
