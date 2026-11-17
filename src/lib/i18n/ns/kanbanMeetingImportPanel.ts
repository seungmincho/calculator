import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kanbanMeetingImportPanel.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kanbanMeetingImportPanel.ea8cc0823abf93d7.json', ['kanbanMeetingImportPanel'])
  : import('../../../../messages/generated/en/ns/kanbanMeetingImportPanel.json').then(module => module.default))
