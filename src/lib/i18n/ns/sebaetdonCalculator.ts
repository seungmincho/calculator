import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sebaetdonCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sebaetdonCalculator.f8975232c9f7511b.json', ['sebaetdonCalculator'])
  : import('../../../../messages/generated/en/ns/sebaetdonCalculator.json').then(module => module.default))
