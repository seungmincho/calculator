import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/screenInfo.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/screenInfo.8c7b9e1faecf52ef.json', ['screenInfo'])
  : import('../../../../messages/generated/en/ns/screenInfo.json').then(module => module.default))
