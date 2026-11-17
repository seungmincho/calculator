import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pdfTools.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pdfTools.7248dd56e52de582.json', ['pdfTools'])
  : import('../../../../messages/generated/en/ns/pdfTools.json').then(module => module.default))
