import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/hometownDonation.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/hometownDonation.00c2e6fa269e8366.json', ['hometownDonation'])
  : import('../../../../messages/generated/en/ns/hometownDonation.json').then(module => module.default))
