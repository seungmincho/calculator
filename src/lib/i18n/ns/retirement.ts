import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/retirement.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/retirement.022e7dbd2ab3a31c.json', ['retirement'])
  : import('../../../../messages/generated/en/ns/retirement.json').then(module => module.default))
