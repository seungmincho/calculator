import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/comprehensivePropertyTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/comprehensivePropertyTax.b93059963764d032.json', ['comprehensivePropertyTax'])
  : import('../../../../messages/generated/en/ns/comprehensivePropertyTax.json').then(module => module.default))
