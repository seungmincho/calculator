import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pcElectricity.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pcElectricity.3c5be14f850b0fbe.json', ['pcElectricity'])
  : import('../../../../messages/generated/en/ns/pcElectricity.json').then(module => module.default))
