import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/voiceMemo.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/voiceMemo.537493518342230b.json', ['voiceMemo'])
  : import('../../../../messages/generated/en/ns/voiceMemo.json').then(module => module.default))
