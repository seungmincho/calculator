import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatGrade.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatGrade.86f75a83672a93d4.json', ['csatGrade'])
  : import('../../../../messages/generated/en/ns/csatGrade.json').then(module => module.default))
