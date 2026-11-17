import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/leaseContract.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/leaseContract.29c07c16630d4383.json', ['leaseContract'])
  : import('../../../../messages/generated/en/ns/leaseContract.json').then(module => module.default))
