import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/signatureGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/signatureGenerator.656e0585386f8f2c.json', ['signatureGenerator'])
  : import('../../../../messages/generated/en/ns/signatureGenerator.json').then(module => module.default))
