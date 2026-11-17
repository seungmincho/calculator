import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rabinKarpVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rabinKarpVisualizer.96a9b313cdfd84b5.json', ['rabinKarpVisualizer'])
  : import('../../../../messages/generated/en/ns/rabinKarpVisualizer.json').then(module => module.default))
