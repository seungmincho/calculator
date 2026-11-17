import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/spiritLevel.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/spiritLevel.872b1b2b50e514ec.json', ['spiritLevel'])
  : import('../../../../messages/generated/en/ns/spiritLevel.json').then(module => module.default))
