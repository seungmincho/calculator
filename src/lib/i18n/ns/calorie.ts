import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/calorie.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/calorie.b8466e97243b636a.json', ['calorie'])
  : import('../../../../messages/generated/en/ns/calorie.json').then(module => module.default))
