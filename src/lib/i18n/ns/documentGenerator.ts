import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/documentGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/documentGenerator.c3dce019ae6e197a.json', ['documentGenerator'])
  : import('../../../../messages/generated/en/ns/documentGenerator.json').then(module => module.default))
