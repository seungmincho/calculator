'use client'

import koGovernment from '../../../messages/generated/ko/governmentSubsidy.json'
import koYouthRent from '../../../messages/generated/ko/youthRentSubsidy.json'
import { createLazyEnTranslations } from './navigation'

export const useTranslations = createLazyEnTranslations({ ...koGovernment, ...koYouthRent }, () =>
  Promise.all([import('../../../messages/generated/en/governmentSubsidy.json'), import('../../../messages/generated/en/youthRentSubsidy.json')])
    .then(([g, y]) => ({ ...g.default, ...y.default })))
