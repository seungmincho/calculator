import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/realEstate.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/realEstate.ca129fd08392cad2.json', ['realEstate'])
  : import('../../../../messages/generated/en/ns/realEstate.json').then(module => module.default))
