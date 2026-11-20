import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jeongsiScore.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jeongsiScore.63ed675f5b0ef826.json', ['jeongsiScore'])
  : import('../../../../messages/generated/en/ns/jeongsiScore.json').then(module => module.default))
