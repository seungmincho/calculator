export interface BlogPost {
  slug: string
  title: string
  summary: string
  published: string // YYYY-MM-DD
  updated?: string
  sections: { heading: string; paragraphs: string[] }[]
  sources: { title: string; url: string }[]
}

// 발행할 글을 추가하면 정적 페이지, 사이트맵, RSS에 같은 주소로 실린다.
export const posts: BlogPost[] = []
export const blogPath = (slug: string) => `/blog/${slug}/`
export const blogOpened = '2026-11-12'
