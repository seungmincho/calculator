import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/avlTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/avlTreeVisualizer.fa8513b95d013305.json', ['avlTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/avlTreeVisualizer.json').then(module => module.default))
