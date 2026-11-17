import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pathfindingCompareVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pathfindingCompareVisualizer.5bd9b13334fa81ba.json', ['pathfindingCompareVisualizer'])
  : import('../../../../messages/generated/en/ns/pathfindingCompareVisualizer.json').then(module => module.default))
