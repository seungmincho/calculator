import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/unemploymentBenefit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/unemploymentBenefit.bf836a0db87cdeb0.json', ['unemploymentBenefit'])
  : import('../../../../messages/generated/en/ns/unemploymentBenefit.json').then(module => module.default))
