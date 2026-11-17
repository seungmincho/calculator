import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/hashTableVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/hashTableVisualizer.9141cf17a9a25c90.json', ['hashTableVisualizer'])
  : import('../../../../messages/generated/en/ns/hashTableVisualizer.json').then(module => module.default))
