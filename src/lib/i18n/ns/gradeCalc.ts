import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gradeCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gradeCalc.ed4dfd0ca9da2ac0.json', ['gradeCalc'])
  : import('../../../../messages/generated/en/ns/gradeCalc.json').then(module => module.default))
