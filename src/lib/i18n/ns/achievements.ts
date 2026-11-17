import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/achievements.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/achievements.b5322eb07dbd8bc3.json', ['achievements'])
  : import('../../../../messages/generated/en/ns/achievements.json').then(module => module.default))
