import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/reactionTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/reactionTest.38cecd9a578bf2f1.json', ['reactionTest'])
  : import('../../../../messages/generated/en/ns/reactionTest.json').then(module => module.default))
