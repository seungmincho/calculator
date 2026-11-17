import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import copy from '../../../../messages/generated/ko/ns/aiNotes.json'
import { blogPath, posts, type BlogPost } from '@/content/blog/posts'
import { guidePath, guides } from '@/content/guides/catalog'

const t = copy.aiNotes
const origin = 'https://toolhub.ai.kr'
type Props = { params: Promise<{ slug?: string[] }> }
export const dynamicParams = false
export function generateStaticParams() {
  // The archive is a real static route even before the first note is published.
  return [{ slug: [] }, ...posts.map(post => ({ slug: [post.slug] }))]
}

async function currentPost({ params }: Props) {
  const { slug } = await params
  if (!slug?.length) return null
  if (slug.length !== 1) notFound()
  return posts.find(post => post.slug === slug[0]) ?? notFound()
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const post = await currentPost(props)
  const url = origin + (post ? blogPath(post.slug) : '/blog/')
  const title = post?.title ?? t.title
  const description = post?.summary ?? t.description
  return {
    title: title + ' | 툴허브', description, alternates: { canonical: url },
    openGraph: post
      ? { type: 'article', title, description, url, publishedTime: post.published, modifiedTime: post.updated ?? post.published }
      : { type: 'website', title, description, url },
    twitter: { card: 'summary', title, description },
  }
}

function Note({ post }: { post: BlogPost }) {
  const structured = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.summary,
    mainEntityOfPage: origin + blogPath(post.slug), inLanguage: 'ko',
    datePublished: post.published, dateModified: post.updated ?? post.published,
    author: { '@type': 'Organization', name: '툴허브', url: origin + '/about/' },
    citation: post.sources.map(source => source.url),
  }
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <header className="border-b border-line pb-6">
        <Link href="/blog/" className="text-sm font-semibold text-sub hover:underline">← {t.title}</Link>
        <h1 className="mt-5 break-keep text-3xl font-bold leading-tight text-fg sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-lg leading-8 text-body">{post.summary}</p>
        <p className="mt-3 text-sm text-sub"><time dateTime={post.published}>{post.published}</time>
          {post.updated && <> · {t.updated} <time dateTime={post.updated}>{post.updated}</time></>}
        </p>
      </header>
      {post.sections.map(section => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-bold text-fg">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-3 leading-8 text-body">{paragraph}</p>)}
        </section>
      ))}
      {post.sources.length > 0 && <footer className="mt-9 border-t border-line pt-5">
        <h2 className="font-semibold text-fg">{t.sources}</h2>
        <ul className="mt-2 space-y-2">{post.sources.map(source => <li key={source.url}><a href={source.url} className="text-primary underline underline-offset-4">{source.title}</a></li>)}</ul>
      </footer>}
    </article>
  )
}

export default async function BlogPage(props: Props) {
  const post = await currentPost(props)
  if (post) return <Note post={post} />
  const newestFirst = [...posts].sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug))
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-line pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-5xl">{t.title}</h1>
        <p className="mt-4 break-keep leading-7 text-sub">{t.description}</p>
      </header>
      {newestFirst.length ? <ul className="divide-y divide-line">
        {newestFirst.map(note => <li key={note.slug}>
          <Link href={blogPath(note.slug)} className="group block py-6">
            <time className="text-sm text-sub" dateTime={note.published}>{note.published}</time>
            <h2 className="mt-1 text-xl font-semibold text-fg group-hover:underline">{note.title}</h2>
            <p className="mt-2 leading-7 text-body">{note.summary}</p>
          </Link>
        </li>)}
      </ul> : <section className="py-7" aria-labelledby="ai-guides-title">
        <h2 id="ai-guides-title" className="text-xl font-bold text-fg">{t.relatedGuides}</h2>
        <ul className="divide-y divide-line">
          {guides.filter(guide => ['prompt-budget', 'watch-a-computer'].includes(guide.slug)).map(guide => (
            <li key={guide.slug}><Link href={guidePath(guide.slug)} className="group block py-4">
              <h3 className="break-keep text-lg font-semibold text-fg group-hover:underline">{guide.title}</h3>
              <p className="mt-1 break-keep text-sm leading-6 text-sub">{guide.intro}</p>
            </Link></li>
          ))}
        </ul>
        <Link href="/guides/" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">{t.guides} →</Link>
      </section>}
    </div>
  )
}
