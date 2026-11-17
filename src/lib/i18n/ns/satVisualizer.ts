import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/satVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/satVisualizer.81b00fb152c9319b.json', ['satVisualizer'])
  : import('../../../../messages/generated/en/ns/satVisualizer.json').then(module => module.default))
