import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import copy from '../../../../messages/generated/ko/ns/toolGuides.json'
import { guides, guidePath, guideDate, halfPriceParcelSlug, leapBirthdaySlug, pyeongAreaSlug, sectionId } from '@/content/guides/catalog'
import { getToolSection } from '@/content/guides/articles'
import LeapBirthday from '@/content/guides/LeapBirthday'
import PyeongArea from '@/content/guides/PyeongArea'
import HalfPriceParcel from '@/content/guides/HalfPriceParcel'
import Walkthrough, { walkthroughs } from '@/content/guides/Walkthrough'

type Props = { params: Promise<{ slug: string }> }
const t = copy.toolGuides
const categories: Record<string, string> = t.categories
const articles = new Map([
  [leapBirthdaySlug, <LeapBirthday key={leapBirthdaySlug} />],
  [pyeongAreaSlug, <PyeongArea key={pyeongAreaSlug} />],
  [halfPriceParcelSlug, <HalfPriceParcel key={halfPriceParcelSlug} />],
])
export const dynamicParams = false
export const generateStaticParams = () => guides.map(({ slug }) => ({ slug }))

async function findGuide({ params }: Props) {
  const { slug } = await params
  return guides.find(guide => guide.slug === slug) ?? notFound()
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const guide = await findGuide(props)
  const url = 'https://toolhub.ai.kr' + guidePath(guide.slug)
  return {
    title: guide.title + ' | 툴허브', description: guide.intro, alternates: { canonical: url },
    openGraph: { type: 'article', title: guide.title, description: guide.intro, url, publishedTime: guide.published, modifiedTime: guideDate(guide) },
    twitter: { card: 'summary', title: guide.title, description: guide.intro },
  }
}

export default async function GuideArticle(props: Props) {
  const guide = await findGuide(props)
  const article = articles.get(guide.slug)
  const reading = walkthroughs[guide.slug]
  const sections = article ? [] : guide.tools.map(getToolSection)
  const structured = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: guide.title, description: guide.intro,
    inLanguage: 'ko', author: { '@type': 'Organization', name: '툴허브', url: 'https://toolhub.ai.kr/about/' },
    mainEntityOfPage: 'https://toolhub.ai.kr' + guidePath(guide.slug),
    datePublished: guide.published, dateModified: guideDate(guide),
  }
  return (
    <article className="mx-auto max-w-3xl px-5 py-9 sm:px-8 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <header className="mb-8 border-b border-line pb-7">
        <nav className="mb-5 flex gap-2 text-sm text-sub"><Link href="/guides/" className="hover:underline">{t.title}</Link><span aria-hidden="true">/</span><Link href={'/guides/#' + guide.category} className="hover:underline">{categories[guide.category]}</Link></nav>
        <h1 className="break-keep text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-lg leading-8 text-body">{guide.intro}</p>
        <p className="mt-4 text-sm text-sub">{t.byline} · <time dateTime={guide.published}>{guide.published}</time>{guide.updated && <> · {t.updated} <time dateTime={guide.updated}>{guide.updated}</time></>}</p>
      </header>
      {reading && <Walkthrough sections={reading} />}
      {reading && guide.tools.length === 1 ? (
        <Link href={'/' + sections[0].tool + '/'} className="ui-btn mt-6 inline-flex px-4 py-2.5">
          {t.useTool.replace('{tool}', sections[0].label)}
        </Link>
      ) : article ?? <>
        <nav aria-label={t.contents} className="my-9 rounded-2xl bg-subtle p-5">
          <h2 className="font-semibold text-fg">{t.contents}</h2>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-sub">{sections.map(s => <li key={s.tool}><a className="underline underline-offset-4" href={'#' + sectionId(s.tool)}>{s.label}</a></li>)}</ul>
        </nav>
        <div className="space-y-9">
          {sections.map(s => <section key={s.tool} id={sectionId(s.tool)} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-fg">{s.heading}</h2>
            <p className="mt-2 leading-8 text-body">{s.body}</p>
            <Link href={'/' + s.tool + '/'} prefetch={false} className="mt-2 inline-block font-semibold text-primary hover:underline">{t.useTool.replace('{tool}', s.label)} →</Link>
          </section>)}
        </div>
      </>}
      <footer className="mt-12 border-t border-line pt-5"><Link className="text-sm font-semibold text-sub hover:underline" href={'/guides/#' + guide.category}>← {t.back}</Link></footer>
    </article>
  )
}
