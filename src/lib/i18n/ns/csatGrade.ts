import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatGrade.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatGrade.4ec0f4a1b8f69d32.json', ['csatGrade'])
  : import('../../../../messages/generated/en/ns/csatGrade.json').then(module => module.default))
