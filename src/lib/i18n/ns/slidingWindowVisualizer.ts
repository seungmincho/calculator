import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/slidingWindowVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/slidingWindowVisualizer.a581829b3ba80245.json', ['slidingWindowVisualizer'])
  : import('../../../../messages/generated/en/ns/slidingWindowVisualizer.json').then(module => module.default))
