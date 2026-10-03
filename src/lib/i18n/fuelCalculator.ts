'use client'

import shared from '../../../messages/generated/ko/shared.json'
import messages from '../../../messages/generated/ko/fuelCalculator.json'
import { createTranslations } from './translationLookup'

export const useTranslations = createTranslations({ ...shared, ...messages })
