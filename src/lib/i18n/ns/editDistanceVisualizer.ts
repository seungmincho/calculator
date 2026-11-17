import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/editDistanceVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/editDistanceVisualizer.67ee2b7d68c9c07d.json', ['editDistanceVisualizer'])
  : import('../../../../messages/generated/en/ns/editDistanceVisualizer.json').then(module => module.default))
