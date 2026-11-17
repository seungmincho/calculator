import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/envEditor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/envEditor.2c22291301242d33.json', ['envEditor'])
  : import('../../../../messages/generated/en/ns/envEditor.json').then(module => module.default))
