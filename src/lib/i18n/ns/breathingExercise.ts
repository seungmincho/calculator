import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/breathingExercise.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/breathingExercise.c9b9be93a8967a26.json', ['breathingExercise'])
  : import('../../../../messages/generated/en/ns/breathingExercise.json').then(module => module.default))
