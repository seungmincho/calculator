import { handlePark, type ParkContext } from '../../src/lib/theme-parks/handler.ts'
export const onRequestGet = (context:ParkContext) => handlePark(context,'everland')
