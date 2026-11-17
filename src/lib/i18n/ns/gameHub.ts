import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameHub.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameHub.e70cfdfd47b874b8.json', ['gameHub'])
  : import('../../../../messages/generated/en/ns/gameHub.json').then(module => module.default))
