import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/governmentSubsidy.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/governmentSubsidy.c26aa0a5c3416ca7.json', ['governmentSubsidy'])
  : import('../../../../messages/generated/en/ns/governmentSubsidy.json').then(module => module.default))
