import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/numberBaseball.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/numberBaseball.32c05c40f3d567ec.json', ['numberBaseball'])
  : import('../../../../messages/generated/en/ns/numberBaseball.json').then(module => module.default))
