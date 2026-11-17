import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/flappyBird.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/flappyBird.ec44a3f637beab4f.json', ['flappyBird'])
  : import('../../../../messages/generated/en/ns/flappyBird.json').then(module => module.default))
