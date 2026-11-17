import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jsonXmlConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jsonXmlConverter.1949572468f119a9.json', ['jsonXmlConverter'])
  : import('../../../../messages/generated/en/ns/jsonXmlConverter.json').then(module => module.default))
