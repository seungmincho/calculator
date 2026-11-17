import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/nQueensVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/nQueensVisualizer.611027db6460cdb1.json', ['nQueensVisualizer'])
  : import('../../../../messages/generated/en/ns/nQueensVisualizer.json').then(module => module.default))
