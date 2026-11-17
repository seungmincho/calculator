import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/curlBuilder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/curlBuilder.ff3bf70a334e25ad.json', ['curlBuilder'])
  : import('../../../../messages/generated/en/ns/curlBuilder.json').then(module => module.default))
