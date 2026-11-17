import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/loremIpsum.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/loremIpsum.34c84e2f2d8ef1ea.json', ['loremIpsum'])
  : import('../../../../messages/generated/en/ns/loremIpsum.json').then(module => module.default))
