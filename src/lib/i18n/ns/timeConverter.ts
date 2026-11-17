import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/timeConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/timeConverter.9d52445ad68b172d.json', ['timeConverter'])
  : import('../../../../messages/generated/en/ns/timeConverter.json').then(module => module.default))
