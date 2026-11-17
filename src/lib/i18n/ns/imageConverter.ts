import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageConverter.cbf43478c45c2dc8.json', ['imageConverter'])
  : import('../../../../messages/generated/en/ns/imageConverter.json').then(module => module.default))
