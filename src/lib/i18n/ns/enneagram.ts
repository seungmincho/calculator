import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/enneagram.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/enneagram.457638e5204a58b6.json', ['enneagram'])
  : import('../../../../messages/generated/en/ns/enneagram.json').then(module => module.default))
