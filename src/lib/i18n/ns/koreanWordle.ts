import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/koreanWordle.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/koreanWordle.3d52c0ff04db7f64.json', ['koreanWordle'])
  : import('../../../../messages/generated/en/ns/koreanWordle.json').then(module => module.default))
