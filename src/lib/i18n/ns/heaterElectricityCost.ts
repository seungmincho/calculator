import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/heaterElectricityCost.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/heaterElectricityCost.54ed5c7720d2a8f1.json', ['heaterElectricityCost'])
  : import('../../../../messages/generated/en/ns/heaterElectricityCost.json').then(module => module.default))
