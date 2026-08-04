import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  if (totalItems !== undefined && totalItems === 0) return null;
  if (totalItems === undefined && totalPages <= 1) return null;

  const inicio = totalItems !== undefined && pageSize ? (page - 1) * pageSize + 1 : null;
  const fin = totalItems !== undefined && pageSize ? Math.min(page * pageSize, totalItems) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-line px-4 py-3 text-sm">
      <span className="text-muted">
        {inicio !== null && fin !== null
          ? `${inicio}–${fin} de ${totalItems}`
          : `Página ${page} de ${totalPages}`}
      </span>
      <div className="flex items-center gap-3">
        {pageSize !== undefined && onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted">
            Mostrar
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border-line bg-surface px-1 text-xs"
            >
              {pageSizeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            ‹ Anterior
          </Button>
          <span className="text-muted">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Siguiente ›
          </Button>
        </div>
      </div>
    </div>
  );
}
