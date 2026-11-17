import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/qrGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/qrGenerator.d1f162ef1be8f67b.json', ['qrGenerator'])
  : import('../../../../messages/generated/en/ns/qrGenerator.json').then(module => module.default))
