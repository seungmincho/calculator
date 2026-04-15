'use client'
import dynamic from 'next/dynamic'

const SvgEditor = dynamic(() => import('@/components/SvgEditor'), { ssr: false })

export default SvgEditor
