import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/oneRepMax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/oneRepMax.f81bd1469261b7b1.json', ['oneRepMax'])
  : import('../../../../messages/generated/en/ns/oneRepMax.json').then(module => module.default))
