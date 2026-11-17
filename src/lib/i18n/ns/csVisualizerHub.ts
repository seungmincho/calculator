import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csVisualizerHub.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csVisualizerHub.e801e049a67eaf4e.json', ['csVisualizerHub'])
  : import('../../../../messages/generated/en/ns/csVisualizerHub.json').then(module => module.default))
