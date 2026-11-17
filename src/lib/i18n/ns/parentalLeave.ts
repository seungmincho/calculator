import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/parentalLeave.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/parentalLeave.1bceb253c5f37ca7.json', ['parentalLeave'])
  : import('../../../../messages/generated/en/ns/parentalLeave.json').then(module => module.default))
