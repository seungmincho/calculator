import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/htmlEntityConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/htmlEntityConverter.24483e8f5e382638.json', ['htmlEntityConverter'])
  : import('../../../../messages/generated/en/ns/htmlEntityConverter.json').then(module => module.default))
