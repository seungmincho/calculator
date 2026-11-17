import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jeonseChecklist.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jeonseChecklist.f4d3117905ac80b4.json', ['jeonseChecklist'])
  : import('../../../../messages/generated/en/ns/jeonseChecklist.json').then(module => module.default))
