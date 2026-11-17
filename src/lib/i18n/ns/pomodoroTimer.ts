import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pomodoroTimer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pomodoroTimer.e3e354bf4c63f5c8.json', ['pomodoroTimer'])
  : import('../../../../messages/generated/en/ns/pomodoroTimer.json').then(module => module.default))
