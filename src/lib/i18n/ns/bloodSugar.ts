import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bloodSugar.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bloodSugar.fe64c80832c2e257.json', ['bloodSugar'])
  : import('../../../../messages/generated/en/ns/bloodSugar.json').then(module => module.default))
