import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/basicPension.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/basicPension.89a05c8777a3257d.json', ['basicPension'])
  : import('../../../../messages/generated/en/ns/basicPension.json').then(module => module.default))
