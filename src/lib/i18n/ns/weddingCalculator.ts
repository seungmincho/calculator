import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/weddingCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/weddingCalculator.dc856fd57074a9ce.json', ['weddingCalculator'])
  : import('../../../../messages/generated/en/ns/weddingCalculator.json').then(module => module.default))
