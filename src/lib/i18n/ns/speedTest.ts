import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/speedTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/speedTest.1a594ae899e4363b.json', ['speedTest'])
  : import('../../../../messages/generated/en/ns/speedTest.json').then(module => module.default))
