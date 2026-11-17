import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/notepad.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/notepad.a4557ca1d3ecb635.json', ['notepad'])
  : import('../../../../messages/generated/en/ns/notepad.json').then(module => module.default))
