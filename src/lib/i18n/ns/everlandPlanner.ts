import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/everlandPlanner.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/everlandPlanner.400c63ef1eb706b8.json', ['everlandPlanner'])
  : import('../../../../messages/generated/en/ns/everlandPlanner.json').then(module => module.default))
