import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pyeongCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pyeongCalculator.273b5285e06cda03.json', ['pyeongCalculator'])
  : import('../../../../messages/generated/en/ns/pyeongCalculator.json').then(module => module.default))
