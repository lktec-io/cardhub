import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Button } from '../ui';

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className="ch-pagination" aria-label="Pagination">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <FiChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <span className="ch-pagination__status">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
        <FiChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
