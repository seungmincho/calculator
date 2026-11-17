import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/holidayPlanner.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/holidayPlanner.c913b35f670fff8e.json', ['holidayPlanner'])
  : import('../../../../messages/generated/en/ns/holidayPlanner.json').then(module => module.default))
