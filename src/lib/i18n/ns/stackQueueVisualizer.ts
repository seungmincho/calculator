import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/stackQueueVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/stackQueueVisualizer.cf94d05ac46a69c2.json', ['stackQueueVisualizer'])
  : import('../../../../messages/generated/en/ns/stackQueueVisualizer.json').then(module => module.default))
