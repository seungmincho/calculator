import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/savings.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/savings.6acb7771b67ff64c.json', ['savings'])
  : import('../../../../messages/generated/en/ns/savings.json').then(module => module.default))
