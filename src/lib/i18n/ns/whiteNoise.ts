import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/whiteNoise.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/whiteNoise.b0d11bc17f875526.json', ['whiteNoise'])
  : import('../../../../messages/generated/en/ns/whiteNoise.json').then(module => module.default))
