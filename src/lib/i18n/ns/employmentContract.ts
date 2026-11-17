import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/employmentContract.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/employmentContract.89eec5f276631d30.json', ['employmentContract'])
  : import('../../../../messages/generated/en/ns/employmentContract.json').then(module => module.default))
