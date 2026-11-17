import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gpaCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gpaCalculator.a446faefb592f692.json', ['gpaCalculator'])
  : import('../../../../messages/generated/en/ns/gpaCalculator.json').then(module => module.default))
