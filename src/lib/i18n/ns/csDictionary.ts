import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csDictionary.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csDictionary.2be1aea019b1c7c5.json', ['csDictionary'])
  : import('../../../../messages/generated/en/ns/csDictionary.json').then(module => module.default))
