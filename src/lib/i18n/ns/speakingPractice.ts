import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/speakingPractice.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/speakingPractice.973a9811de6a3dd3.json', ['speakingPractice'])
  : import('../../../../messages/generated/en/ns/speakingPractice.json').then(module => module.default))
