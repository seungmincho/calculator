import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/metronome.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/metronome.dbbf83d7de45b03d.json', ['metronome'])
  : import('../../../../messages/generated/en/ns/metronome.json').then(module => module.default))
