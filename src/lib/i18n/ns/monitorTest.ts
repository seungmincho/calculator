import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/monitorTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/monitorTest.6dc1489e3cbd493a.json', ['monitorTest'])
  : import('../../../../messages/generated/en/ns/monitorTest.json').then(module => module.default))
