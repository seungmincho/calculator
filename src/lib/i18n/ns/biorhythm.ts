import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/biorhythm.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/biorhythm.ff01a13e1aa450ea.json', ['biorhythm'])
  : import('../../../../messages/generated/en/ns/biorhythm.json').then(module => module.default))
