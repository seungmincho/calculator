import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/battleship.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/battleship.e8631584b367f1ed.json', ['battleship'])
  : import('../../../../messages/generated/en/ns/battleship.json').then(module => module.default))
