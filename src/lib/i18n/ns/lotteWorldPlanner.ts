import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lotteWorldPlanner.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lotteWorldPlanner.73cd654056937720.json', ['lotteWorldPlanner'])
  : import('../../../../messages/generated/en/ns/lotteWorldPlanner.json').then(module => module.default))
