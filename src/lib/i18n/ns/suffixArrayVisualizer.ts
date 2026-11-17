import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/suffixArrayVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/suffixArrayVisualizer.9d1b0bb382855773.json', ['suffixArrayVisualizer'])
  : import('../../../../messages/generated/en/ns/suffixArrayVisualizer.json').then(module => module.default))
