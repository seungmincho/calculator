import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yutNori.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yutNori.07b92fe6ffbef168.json', ['yutNori'])
  : import('../../../../messages/generated/en/ns/yutNori.json').then(module => module.default))
