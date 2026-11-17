import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/trieVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/trieVisualizer.0d0011c985a2897e.json', ['trieVisualizer'])
  : import('../../../../messages/generated/en/ns/trieVisualizer.json').then(module => module.default))
