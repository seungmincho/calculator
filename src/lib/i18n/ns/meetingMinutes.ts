import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/meetingMinutes.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/meetingMinutes.bc88dfbe1dedd154.json', ['meetingMinutes'])
  : import('../../../../messages/generated/en/ns/meetingMinutes.json').then(module => module.default))
