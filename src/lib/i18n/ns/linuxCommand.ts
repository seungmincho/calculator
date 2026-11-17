import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/linuxCommand.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/linuxCommand.9ddafbea15f9a7a9.json', ['linuxCommand'])
  : import('../../../../messages/generated/en/ns/linuxCommand.json').then(module => module.default))
