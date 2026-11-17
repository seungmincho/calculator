import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/koreanSyllable.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/koreanSyllable.9c32584ed0ae297c.json', ['koreanSyllable'])
  : import('../../../../messages/generated/en/ns/koreanSyllable.json').then(module => module.default))
