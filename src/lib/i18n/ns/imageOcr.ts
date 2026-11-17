import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageOcr.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageOcr.dd4c1fcd587b89c1.json', ['imageOcr'])
  : import('../../../../messages/generated/en/ns/imageOcr.json').then(module => module.default))
