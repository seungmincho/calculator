import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/youthRentSubsidy.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/youthRentSubsidy.2fd2d95fafaf0457.json', ['youthRentSubsidy'])
  : import('../../../../messages/generated/en/ns/youthRentSubsidy.json').then(module => module.default))
