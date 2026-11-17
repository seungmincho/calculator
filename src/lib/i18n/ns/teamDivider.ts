import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/teamDivider.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/teamDivider.cb480c2dcdc56fcf.json', ['teamDivider'])
  : import('../../../../messages/generated/en/ns/teamDivider.json').then(module => module.default))
