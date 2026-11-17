import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gpaConverterCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gpaConverterCalc.9a365d4419fab147.json', ['gpaConverterCalc'])
  : import('../../../../messages/generated/en/ns/gpaConverterCalc.json').then(module => module.default))
