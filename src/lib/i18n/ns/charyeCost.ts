import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/charyeCost.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/charyeCost.f6206b9b22b33f26.json', ['charyeCost'])
  : import('../../../../messages/generated/en/ns/charyeCost.json').then(module => module.default))
