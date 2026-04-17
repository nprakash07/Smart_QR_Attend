export type Role = 'teacher' | 'student'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  reg_no?: string
}

export interface AttendanceData {
  columns: string[]
  rows: AttendanceRow[]
}

export interface AttendanceRow {
  sl: number
  id: number
  reg_no: string
  name: string
  [col: string]: any
}

export interface QRToken {
  session_id: string
  token: string
}

export interface CountData {
  marked: number
  total: number
  session: string
}