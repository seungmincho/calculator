import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/uuidGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/uuidGenerator.37eb4b4c87173217.json', ['uuidGenerator'])
  : import('../../../../messages/generated/en/ns/uuidGenerator.json').then(module => module.default))
