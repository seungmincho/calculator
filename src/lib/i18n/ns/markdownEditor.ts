import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/markdownEditor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/markdownEditor.b10227eaf9c3aae9.json', ['markdownEditor'])
  : import('../../../../messages/generated/en/ns/markdownEditor.json').then(module => module.default))
