import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/primVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/primVisualizer.1b0101773fac9b72.json', ['primVisualizer'])
  : import('../../../../messages/generated/en/ns/primVisualizer.json').then(module => module.default))
