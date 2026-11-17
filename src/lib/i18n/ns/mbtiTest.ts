import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mbtiTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mbtiTest.35b9a4fc6268f493.json', ['mbtiTest'])
  : import('../../../../messages/generated/en/ns/mbtiTest.json').then(module => module.default))
