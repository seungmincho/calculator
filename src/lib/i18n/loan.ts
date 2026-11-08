'use client'

import shared from '../../../messages/generated/ko/shared.json'
import messages from '../../../messages/generated/ko/loan.json'
import { createLazyEnTranslations, loadEnShared } from './navigation'

export const useTranslations = createLazyEnTranslations({ ...shared, ...messages }, () =>
  Promise.all([loadEnShared(), import('../../../messages/generated/en/loan.json')]).then(([s, m]) => ({ ...s, ...m.default })))
