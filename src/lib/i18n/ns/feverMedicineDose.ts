import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/feverMedicineDose.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/feverMedicineDose.1facbbe5ef640d82.json', ['feverMedicineDose'])
  : import('../../../../messages/generated/en/ns/feverMedicineDose.json').then(module => module.default))
