import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/penaltyRoulette.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/penaltyRoulette.c87257a2c0125185.json', ['penaltyRoulette'])
  : import('../../../../messages/generated/en/ns/penaltyRoulette.json').then(module => module.default))
