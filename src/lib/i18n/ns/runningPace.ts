import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/runningPace.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/runningPace.699dddbeb8e3e365.json', ['runningPace'])
  : import('../../../../messages/generated/en/ns/runningPace.json').then(module => module.default))
