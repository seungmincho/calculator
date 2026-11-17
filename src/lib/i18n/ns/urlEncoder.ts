import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/urlEncoder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/urlEncoder.f9306514d16ed040.json', ['urlEncoder'])
  : import('../../../../messages/generated/en/ns/urlEncoder.json').then(module => module.default))
