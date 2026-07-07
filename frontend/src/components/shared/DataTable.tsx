import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRowClick?: (item: T) => void
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
        </td>
      ))}
    </tr>
  )
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-white/5 bg-surface/60 backdrop-blur-xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-surface/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'border-b border-white/5 transition-colors',
                    index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]',
                    onRowClick
                      ? 'cursor-pointer hover:bg-surface-hover'
                      : 'hover:bg-white/[0.02]'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-text-primary',
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
          <span className="text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
