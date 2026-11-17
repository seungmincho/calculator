import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/devCheatsheet.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/devCheatsheet.40ea48497190a29b.json', ['devCheatsheet'])
  : import('../../../../messages/generated/en/ns/devCheatsheet.json').then(module => module.default))
