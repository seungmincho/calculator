import shared from '../../../messages/generated/ko/shared.json'
import algorithmLabels from '../../../messages/generated/ko/ns/algorithmHub.json'
import csLabels from '../../../messages/generated/ko/ns/csVisualizerHub.json'
import { menuConfig } from '@/config/menuConfig'
import { algorithms } from '@/config/algorithmConfig'
import { csVisualizers } from '@/config/csVisualizerConfig'
import income from './notes/income.json'
import household from './notes/household.json'
import daily from './notes/daily.json'
import developer from './notes/developer.json'
import workflow from './notes/workflow.json'
import media from './notes/media.json'
import health from './notes/health.json'
import games from './notes/games.json'
import algorithmNotes from './notes/algorithms.json'

const notes: Record<string, { heading: string; body: string }> = {
  ...income, ...household, ...daily, ...developer, ...workflow, ...media, ...health, ...games, ...algorithmNotes,
}
const labels = new Map<string, string>()
const toolNames: Record<string, string> = shared.footer.links
const algorithmNames: Record<string, {title: string}> = algorithmLabels.algorithmHub.algorithms
const csNames: Record<string, {title: string}> = csLabels.csVisualizerHub.items
for (const category of Object.values(menuConfig)) {
  for (const item of category.items) labels.set(item.href.slice(1), toolNames[item.labelKey.replace('footer.links.', '')])
}
for (const item of algorithms.filter(item => item.status === 'ready')) labels.set(item.href.slice(1), algorithmNames[item.labelKey].title)
for (const item of csVisualizers) labels.set(item.href.slice(1), csNames[item.labelKey].title)

export function getToolSection(tool: string) {
  const note = notes[tool]
  const label = labels.get(tool)
  if (!note || !label) throw new Error(`Missing guide content for ${tool}`)
  return { ...note, label, tool }
}
