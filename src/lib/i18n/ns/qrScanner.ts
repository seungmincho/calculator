import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/qrScanner.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/qrScanner.dd1b25cce0efcdd5.json', ['qrScanner'])
  : import('../../../../messages/generated/en/ns/qrScanner.json').then(module => module.default))
