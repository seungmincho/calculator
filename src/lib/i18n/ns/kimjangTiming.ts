import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kimjangTiming.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kimjangTiming.3922f7698c64bbb7.json', ['kimjangTiming'])
  : import('../../../../messages/generated/en/ns/kimjangTiming.json').then(module => module.default))
