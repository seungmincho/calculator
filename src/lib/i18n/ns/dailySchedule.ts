import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dailySchedule.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dailySchedule.b91d024689313891.json', ['dailySchedule'])
  : import('../../../../messages/generated/en/ns/dailySchedule.json').then(module => module.default))
