import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/svgEditor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/svgEditor.d4bc0f6c1dfc8d13.json', ['svgEditor'])
  : import('../../../../messages/generated/en/ns/svgEditor.json').then(module => module.default))
