import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/chartStudio.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/chartStudio.6eb8ef88ab994773.json', ['chartStudio'])
  : import('../../../../messages/generated/en/ns/chartStudio.json').then(module => module.default))
