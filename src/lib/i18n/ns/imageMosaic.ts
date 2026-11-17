import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageMosaic.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageMosaic.18828cfd153459ee.json', ['imageMosaic'])
  : import('../../../../messages/generated/en/ns/imageMosaic.json').then(module => module.default))
