import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/taxiFare.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/taxiFare.b3ca8829b293e882.json', ['taxiFare'])
  : import('../../../../messages/generated/en/ns/taxiFare.json').then(module => module.default))
