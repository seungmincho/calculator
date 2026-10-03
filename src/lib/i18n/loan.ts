'use client'

import shared from '../../../messages/generated/ko/shared.json'
import messages from '../../../messages/generated/ko/loan.json'
import { createTranslations } from './translationLookup'

export const useTranslations = createTranslations({ ...shared, ...messages })
