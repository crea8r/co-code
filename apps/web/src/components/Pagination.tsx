import Button from './Button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  label?: string;
};

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = 'items',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <span className="pagination__meta">
        Page {safePage} of {totalPages} · {total} {label}
      </span>
      <div className="pagination__actions">
        <Button
          variant="ghost"
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
        >
          Prev
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
