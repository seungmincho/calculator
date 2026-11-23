import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/transitPass.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/transitPass.593d433bbbec4c50.json', ['transitPass'])
  : import('../../../../messages/generated/en/ns/transitPass.json').then(module => module.default))
