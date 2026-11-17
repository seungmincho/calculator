import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageWatermark.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageWatermark.540aebe38d223f4b.json', ['imageWatermark'])
  : import('../../../../messages/generated/en/ns/imageWatermark.json').then(module => module.default))
