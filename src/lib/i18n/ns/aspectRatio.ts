import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/aspectRatio.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/aspectRatio.17e969d77e83ab71.json', ['aspectRatio'])
  : import('../../../../messages/generated/en/ns/aspectRatio.json').then(module => module.default))
