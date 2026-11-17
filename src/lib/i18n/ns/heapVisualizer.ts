import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/heapVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/heapVisualizer.914498fbcda01cc0.json', ['heapVisualizer'])
  : import('../../../../messages/generated/en/ns/heapVisualizer.json').then(module => module.default))
