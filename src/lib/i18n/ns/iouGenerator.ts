import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/iouGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/iouGenerator.ce16219e2a93acb5.json', ['iouGenerator'])
  : import('../../../../messages/generated/en/ns/iouGenerator.json').then(module => module.default))
