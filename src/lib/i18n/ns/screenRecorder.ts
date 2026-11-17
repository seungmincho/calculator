import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/screenRecorder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/screenRecorder.800e564ea95baeb6.json', ['screenRecorder'])
  : import('../../../../messages/generated/en/ns/screenRecorder.json').then(module => module.default))
