import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kmpVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kmpVisualizer.451a6554d43287fe.json', ['kmpVisualizer'])
  : import('../../../../messages/generated/en/ns/kmpVisualizer.json').then(module => module.default))
