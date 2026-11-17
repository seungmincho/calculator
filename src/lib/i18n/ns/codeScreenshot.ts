import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/codeScreenshot.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/codeScreenshot.6abcd109220e10eb.json', ['codeScreenshot'])
  : import('../../../../messages/generated/en/ns/codeScreenshot.json').then(module => module.default))
