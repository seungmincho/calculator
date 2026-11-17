import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/viewer3d.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/viewer3d.179881828a68a127.json', ['viewer3d'])
  : import('../../../../messages/generated/en/ns/viewer3d.json').then(module => module.default))
