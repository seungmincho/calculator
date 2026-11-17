import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/carMaintenance.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/carMaintenance.ab36e98876dc5775.json', ['carMaintenance'])
  : import('../../../../messages/generated/en/ns/carMaintenance.json').then(module => module.default))
