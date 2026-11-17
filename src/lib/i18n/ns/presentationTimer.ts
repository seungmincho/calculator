import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/presentationTimer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/presentationTimer.1374424f3efd9022.json', ['presentationTimer'])
  : import('../../../../messages/generated/en/ns/presentationTimer.json').then(module => module.default))
