import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fancyText.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fancyText.70090b9eb575c72e.json', ['fancyText'])
  : import('../../../../messages/generated/en/ns/fancyText.json').then(module => module.default))
