import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/colorConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/colorConverter.461d73dcce385ba9.json', ['colorConverter'])
  : import('../../../../messages/generated/en/ns/colorConverter.json').then(module => module.default))
