import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/noiseMeter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/noiseMeter.708fef880b45451b.json', ['noiseMeter'])
  : import('../../../../messages/generated/en/ns/noiseMeter.json').then(module => module.default))
