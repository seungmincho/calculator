import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bloomFilterVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bloomFilterVisualizer.404b057db8f9171b.json', ['bloomFilterVisualizer'])
  : import('../../../../messages/generated/en/ns/bloomFilterVisualizer.json').then(module => module.default))
