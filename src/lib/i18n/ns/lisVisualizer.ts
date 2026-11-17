import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lisVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lisVisualizer.b3af9a0a3ff5ca49.json', ['lisVisualizer'])
  : import('../../../../messages/generated/en/ns/lisVisualizer.json').then(module => module.default))
