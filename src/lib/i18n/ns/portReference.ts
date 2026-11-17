import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/portReference.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/portReference.96dab2cda9a953da.json', ['portReference'])
  : import('../../../../messages/generated/en/ns/portReference.json').then(module => module.default))
