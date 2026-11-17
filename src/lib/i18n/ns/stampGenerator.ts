import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/stampGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/stampGenerator.baa7ce43531738a4.json', ['stampGenerator'])
  : import('../../../../messages/generated/en/ns/stampGenerator.json').then(module => module.default))
