import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/textConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/textConverter.b9bc60dcc0bbb0cd.json', ['textConverter'])
  : import('../../../../messages/generated/en/ns/textConverter.json').then(module => module.default))
