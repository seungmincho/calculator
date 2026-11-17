import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/systemDesign.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/systemDesign.3132deb1093bf8c7.json', ['systemDesign'])
  : import('../../../../messages/generated/en/ns/systemDesign.json').then(module => module.default))
