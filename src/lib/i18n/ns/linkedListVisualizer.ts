import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/linkedListVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/linkedListVisualizer.8c2f3150467d494d.json', ['linkedListVisualizer'])
  : import('../../../../messages/generated/en/ns/linkedListVisualizer.json').then(module => module.default))
