import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yesNoDecider.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yesNoDecider.1faaa0474c3563c4.json', ['yesNoDecider'])
  : import('../../../../messages/generated/en/ns/yesNoDecider.json').then(module => module.default))
