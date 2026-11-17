import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/unionFindVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/unionFindVisualizer.750431deaa651ede.json', ['unionFindVisualizer'])
  : import('../../../../messages/generated/en/ns/unionFindVisualizer.json').then(module => module.default))
