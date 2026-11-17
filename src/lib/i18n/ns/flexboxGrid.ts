import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/flexboxGrid.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/flexboxGrid.1a44be6b829bbc8b.json', ['flexboxGrid'])
  : import('../../../../messages/generated/en/ns/flexboxGrid.json').then(module => module.default))
