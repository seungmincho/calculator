import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageEditor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageEditor.52a01ab533d6e7ee.json', ['imageEditor'])
  : import('../../../../messages/generated/en/ns/imageEditor.json').then(module => module.default))
