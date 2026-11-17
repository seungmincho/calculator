import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/childGrowth.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/childGrowth.ff2f963c38782f61.json', ['childGrowth'])
  : import('../../../../messages/generated/en/ns/childGrowth.json').then(module => module.default))
