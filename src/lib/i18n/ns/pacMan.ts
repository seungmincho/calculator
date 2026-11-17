import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pacMan.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pacMan.950f6d936f4a2127.json', ['pacMan'])
  : import('../../../../messages/generated/en/ns/pacMan.json').then(module => module.default))
