import catalog from './catalog.json'

export interface Guide {
  slug: string
  title: string
  category: string
  intro: string
  tools: string[]
  published: string
  updated?: string
}

export const guides: Guide[] = catalog
export const leapBirthdaySlug = 'leap-month-birthday'
export const pyeongAreaSlug = '84sqm-34pyeong'
export const halfPriceParcelSlug = 'half-price-parcel'
export const guidePath = (slug: string) => `/guides/${slug}/`
export const sectionId = (tool: string) => tool.replaceAll('/', '-')
export const guideDate = (guide: Guide) => guide.updated ?? guide.published
export const guideForTool = (tool: string) => guides.find(guide => guide.tools.includes(tool))
export function guideLink(guide: Guide, tool: string) {
  return guidePath(guide.slug) + (guide.tools.length === 1 ? '' : '#' + sectionId(tool))
}
