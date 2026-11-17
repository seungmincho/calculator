import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yearCalendar.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yearCalendar.a70ecb2db081c20f.json', ['yearCalendar'])
  : import('../../../../messages/generated/en/ns/yearCalendar.json').then(module => module.default))
