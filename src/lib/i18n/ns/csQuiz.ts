import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csQuiz.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csQuiz.6b1c7b19e7e98af0.json', ['csQuiz'])
  : import('../../../../messages/generated/en/ns/csQuiz.json').then(module => module.default))
