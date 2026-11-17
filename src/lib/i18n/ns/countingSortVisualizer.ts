import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/countingSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/countingSortVisualizer.9ad96b42558eb8cf.json', ['countingSortVisualizer'])
  : import('../../../../messages/generated/en/ns/countingSortVisualizer.json').then(module => module.default))
