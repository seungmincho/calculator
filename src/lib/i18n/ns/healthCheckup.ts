import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/healthCheckup.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/healthCheckup.120de0baf37b5a2c.json', ['healthCheckup'])
  : import('../../../../messages/generated/en/ns/healthCheckup.json').then(module => module.default))
