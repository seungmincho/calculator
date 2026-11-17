import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ganttChart.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ganttChart.b0fcbf3139b48d7c.json', ['ganttChart'])
  : import('../../../../messages/generated/en/ns/ganttChart.json').then(module => module.default))
