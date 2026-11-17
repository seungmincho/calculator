import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dotsandboxes.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dotsandboxes.49421f787ce69e1e.json', ['dotsandboxes'])
  : import('../../../../messages/generated/en/ns/dotsandboxes.json').then(module => module.default))
