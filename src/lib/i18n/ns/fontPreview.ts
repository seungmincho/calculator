import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fontPreview.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fontPreview.e62a2726db4280ed.json', ['fontPreview'])
  : import('../../../../messages/generated/en/ns/fontPreview.json').then(module => module.default))
