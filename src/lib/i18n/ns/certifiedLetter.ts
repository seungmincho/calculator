import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/certifiedLetter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/certifiedLetter.84bb3135527227a2.json', ['certifiedLetter'])
  : import('../../../../messages/generated/en/ns/certifiedLetter.json').then(module => module.default))
