import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/evSubsidy.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/evSubsidy.665ff3c1af582b69.json', ['evSubsidy'])
  : import('../../../../messages/generated/en/ns/evSubsidy.json').then(module => module.default))
