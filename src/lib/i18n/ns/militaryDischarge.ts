import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/militaryDischarge.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/militaryDischarge.f1ffdbd192b7a5a3.json', ['militaryDischarge'])
  : import('../../../../messages/generated/en/ns/militaryDischarge.json').then(module => module.default))
