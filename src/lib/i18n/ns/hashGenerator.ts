import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/hashGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/hashGenerator.a10148f75e1b80ec.json', ['hashGenerator'])
  : import('../../../../messages/generated/en/ns/hashGenerator.json').then(module => module.default))
