import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gyeongjuWorldPlanner.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gyeongjuWorldPlanner.7711f29ed94ef0d4.json', ['gyeongjuWorldPlanner'])
  : import('../../../../messages/generated/en/ns/gyeongjuWorldPlanner.json').then(module => module.default))
