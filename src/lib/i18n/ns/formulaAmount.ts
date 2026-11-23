import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/formulaAmount.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/formulaAmount.f2562c2cbf859a8b.json', ['formulaAmount'])
  : import('../../../../messages/generated/en/ns/formulaAmount.json').then(module => module.default))
