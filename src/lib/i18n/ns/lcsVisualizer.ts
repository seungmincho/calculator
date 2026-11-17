import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lcsVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lcsVisualizer.ec340bb16cc50525.json', ['lcsVisualizer'])
  : import('../../../../messages/generated/en/ns/lcsVisualizer.json').then(module => module.default))
