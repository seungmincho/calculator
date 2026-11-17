import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/promptGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/promptGenerator.9eb6f827d8d56ca3.json', ['promptGenerator'])
  : import('../../../../messages/generated/en/ns/promptGenerator.json').then(module => module.default))
