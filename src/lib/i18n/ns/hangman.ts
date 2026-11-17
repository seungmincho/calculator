import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/hangman.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/hangman.54d56d07af950040.json', ['hangman'])
  : import('../../../../messages/generated/en/ns/hangman.json').then(module => module.default))
