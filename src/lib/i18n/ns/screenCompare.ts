import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/screenCompare.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/screenCompare.5f89ce27c85b9616.json', ['screenCompare'])
  : import('../../../../messages/generated/en/ns/screenCompare.json').then(module => module.default))
