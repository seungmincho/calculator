import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bTreeVisualizer.a615f98ac1690555.json', ['bTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/bTreeVisualizer.json').then(module => module.default))
