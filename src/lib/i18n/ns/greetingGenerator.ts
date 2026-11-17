import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/greetingGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/greetingGenerator.b83634ae767e5392.json', ['greetingGenerator'])
  : import('../../../../messages/generated/en/ns/greetingGenerator.json').then(module => module.default))
