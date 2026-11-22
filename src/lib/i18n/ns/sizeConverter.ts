import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sizeConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sizeConverter.c5d0497b842eedab.json', ['sizeConverter'])
  : import('../../../../messages/generated/en/ns/sizeConverter.json').then(module => module.default))
