import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fenwickTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fenwickTreeVisualizer.3e6884246209e244.json', ['fenwickTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/fenwickTreeVisualizer.json').then(module => module.default))
