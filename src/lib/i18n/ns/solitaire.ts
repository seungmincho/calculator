import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/solitaire.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/solitaire.08722fcb3f5e3ff2.json', ['solitaire'])
  : import('../../../../messages/generated/en/ns/solitaire.json').then(module => module.default))
