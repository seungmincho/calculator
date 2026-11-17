import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/childBenefit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/childBenefit.71ff97fe45724185.json', ['childBenefit'])
  : import('../../../../messages/generated/en/ns/childBenefit.json').then(module => module.default))
