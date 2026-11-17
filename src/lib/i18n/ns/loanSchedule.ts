import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/loanSchedule.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/loanSchedule.a85db1f019f32a4f.json', ['loanSchedule'])
  : import('../../../../messages/generated/en/ns/loanSchedule.json').then(module => module.default))
