import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
}: PaginationProps) {
    const { t } = useTranslation();

    // Generate page numbers to show (e.g., 1, ..., 4, 5, 6, ..., 10)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 3; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <div className="hidden sm:flex text-sm text-text-secondary">
                {totalItems !== undefined && itemsPerPage !== undefined && (
                    <span>
                        {t('common.showing', 'Showing')} <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> {t('common.to', 'to')} <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> {t('common.of', 'of')} <span className="font-medium">{totalItems}</span> {t('common.results', 'results')}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors border-none bg-transparent ${currentPage === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-text-secondary hover:bg-gray-100 cursor-pointer'
                        }`}
                    aria-label={t('common.previous', 'Previous')}
                >
                    <MdChevronLeft size={20} className="rtl:rotate-180" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                        typeof page === 'number' ? (
                            <button
                                key={index}
                                onClick={() => onPageChange(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${currentPage === page
                                        ? 'bg-primary text-white'
                                        : 'bg-transparent text-text-secondary hover:bg-gray-100'
                                    }`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={index} className="w-8 text-center text-text-secondary">...</span>
                        )
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors border-none bg-transparent ${currentPage === totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-text-secondary hover:bg-gray-100 cursor-pointer'
                        }`}
                    aria-label={t('common.next', 'Next')}
                >
                    <MdChevronRight size={20} className="rtl:rotate-180" />
                </button>
            </div>
        </div>
    );
}
