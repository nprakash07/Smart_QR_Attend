import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

export const todayStr = () => new Date().toISOString().split('T')[0]

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' })

export const pctColor = (p: number) =>
  p >= 80 ? 'text-green-600' : p >= 60 ? 'text-yellow-600' : 'text-red-600'

export const pctBg = (p: number) =>
  p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-yellow-400' : 'bg-red-500'

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))