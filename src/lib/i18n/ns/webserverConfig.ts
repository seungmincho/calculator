import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/webserverConfig.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/webserverConfig.27520b494561c2cc.json', ['webserverConfig'])
  : import('../../../../messages/generated/en/ns/webserverConfig.json').then(module => module.default))
