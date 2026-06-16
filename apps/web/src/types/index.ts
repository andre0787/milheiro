export interface Tenant {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Program {
  id: string
  tenant_id: string
  name: string
  slug: string
  emission_limit: number
  limit_window_type: 'rolling' | 'fixed' | 'none'
  limit_window_days: number
  limit_start_date: string | null
  cooldown_days: number
  created_at: string
}

export interface Holder {
  id: string
  tenant_id: string
  name: string
  nickname: string | null
  created_at: string
}

export interface OperationType {
  id: string
  tenant_id: string
  name: string
  slug: string
  is_purchase: boolean
}

export interface Entry {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  operation_type_id: string | null
  date: string
  points: number
  cost: number
  notes: string | null
  created_at: string
  program_name?: string
  holder_name?: string
  operation_type_name?: string
}

export interface Transfer {
  id: string
  tenant_id: string
  from_program_id: string
  to_program_id: string
  holder_id: string
  date: string
  points_sent: number
  bonus_pct: number
  points_received: number
  transfer_fee: number
  notes: string | null
  created_at: string
  from_program_name?: string
  to_program_name?: string
  holder_name?: string
}

export interface Sale {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  date: string
  points_sold: number
  sale_value: number
  buyer: string | null
  expected_receipt_date: string | null
  profit_auto: number | null
  profit_override: number | null
  profit_final: number | null
  cpm_at_sale: number | null
  notes: string | null
  created_at: string
  program_name?: string
  holder_name?: string
}

export interface Cpf {
  id: string
  tenant_id: string
  name: string
  document: string
  created_at: string
}

export interface Emission {
  id: string
  tenant_id: string
  program_id: string
  cpf_id: string
  holder_id: string
  issued_at: string
  ticket_info: string | null
  created_at: string
  program_name?: string
  cpf_name?: string
  cpf_document?: string
  holder_name?: string
}

export interface Balance {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  total_points: number
  total_cost: number
  cpm: number
  updated_at: string
  program_name?: string
  holder_name?: string
}

export interface DashboardSummary {
  mes: string
  programa: string
  titular: string
  custo_entradas: number
  pts_entradas: number
  receita_vendas: number
  custo_vendas: number
  taxas_transf: number
  pnl_liquido: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface EmissionCheck {
  available: boolean
  used: number
  limit: number
  cooldown_remaining: number | null
}
