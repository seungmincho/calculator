import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/contrastChecker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/contrastChecker.02e59563b9b91f43.json', ['contrastChecker'])
  : import('../../../../messages/generated/en/ns/contrastChecker.json').then(module => module.default))
