import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rentSubsidy.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rentSubsidy.420dbbc1d87f1db6.json', ['rentSubsidy'])
  : import('../../../../messages/generated/en/ns/rentSubsidy.json').then(module => module.default))
