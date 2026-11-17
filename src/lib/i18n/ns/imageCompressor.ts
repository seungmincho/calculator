import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageCompressor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageCompressor.2efe44081e6875cd.json', ['imageCompressor'])
  : import('../../../../messages/generated/en/ns/imageCompressor.json').then(module => module.default))
