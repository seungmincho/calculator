import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mealDiary.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mealDiary.e2ec2d8e949f554c.json', ['mealDiary'])
  : import('../../../../messages/generated/en/ns/mealDiary.json').then(module => module.default))
