import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/changes2027.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/changes2027.f2d3faa5a4aa6262.json', ['changes2027'])
  : import('../../../../messages/generated/en/ns/changes2027.json').then(module => module.default))
