---
tags: [components, ui, shadcn]
---

# Components

## Key Patterns

### Base UI Select
- `Select.Root` needs `value` prop for pre-filling in edit forms
- `SelectValue` children: `(v) => ReactNode` render function
- Must pass `name` prop for form serialization
- `nativeButton` auto-detect: `render` prop → false, plain `<button>` → true

### InlineCreateDialog
- Type: `"program" | "holder" | "cpf" | "buyer" | "optype"`
- Creates entities inline without navigation
- Auto-selects new entity after creation

### DataTable
- Generic wrapper around `@tanstack/react-table`
- `searchable` prop enables global text filter
- Pagination included

## Form Components
| Component | File | Notes |
|-----------|------|-------|
| SaleForm | `forms/sale-form.tsx` | Programa→Titular→Data→Pontos→Bilhete(CPFs múltiplos)→Comprador→Recebido |
| TicketForm | `forms/ticket-form.tsx` | CPFs múltiplos + data ida/volta |
| EntryForm | `forms/entry-form.tsx` | Com inline create |
| TransferForm | `forms/transfer-form.tsx` | |
| ClienteForm | `forms/cliente-form.tsx` | Nome + documento + telegram |
| OpTypeForm | `forms/op-type-form.tsx` | |

## Table Components
| Component | File | Features |
|-----------|------|----------|
| SalesTable | `tables/sales-table.tsx` | Comprador, Viajantes, Status toggle, Bilhete link, search |
| TicketsTable | `tables/tickets-table.tsx` | search |
| EntriesTable | `tables/entries-table.tsx` | search |
| TransfersTable | `tables/transfers-table.tsx` | search |
| HoldersTable | `tables/holders-table.tsx` | DeleteButton, search |
| ProgramsTable | `tables/programs-table.tsx` | DeleteButton, search |
| ClientesTable | `tables/clientes-table.tsx` | DeleteButton, search |
| OpTypesTable | `tables/op-types-table.tsx` | DeleteButton, search |

## Utility Components
| Component | File | Purpose |
|-----------|------|---------|
| DeleteButton | `delete-button.tsx` | Confirmation dialog + DELETE fetch |
| ClearAllButton | `clear-all-button.tsx` | Bulk delete with confirmation |
| ReceivedToggle | `received-toggle.tsx` | Toggle received flag inline |
| ThemeToggle | `theme-toggle.tsx` | Light/dark switch |
| ThemeProvider | `theme-provider.tsx` | localStorage + system preference |

## Theming
- CSS variables `--color-*` defined in `:root`/`.dark` directly (not `@theme inline`)
- `@theme` block with `initial` values for Tailwind utility registration
- Semantic: `--color-profit` (green), `--color-loss` (red)
