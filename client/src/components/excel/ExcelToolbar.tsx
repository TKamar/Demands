import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdFileDownload, MdFileUpload, MdCheck, MdError } from 'react-icons/md';
import { exportProjects, importProjects } from '../../api/apiService';
import { useToast } from '../common/Toast';

interface ExcelToolbarProps {
  selectedCenters?: string[];
  showImport?: boolean;
  onImportSuccess?: () => void;
}

export default function ExcelToolbar({ selectedCenters, showImport = true, onImportSuccess }: ExcelToolbarProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string[];
  } | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setFeedback(null);
      await exportProjects(selectedCenters && selectedCenters.length > 0 ? selectedCenters : undefined);
      showToast(t('excel.exportSuccess', 'Projects exported successfully'), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setFeedback({
        type: 'error',
        message: t('excel.exportFailed', 'Failed to export projects'),
        details: [message],
      });
      showToast(t('excel.exportFailed', 'Failed to export projects'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setFeedback(null);
      const result = await importProjects(file);

      const message =
        result.created.projects > 0 || result.created.demands > 0
          ? t('excel.importSuccess', 'Projects imported successfully', {
              projects: result.created.projects,
              demands: result.created.demands,
              skipped: result.created.skipped,
            })
          : t('excel.importNoData', 'No new data to import');

      setFeedback({
        type: 'success',
        message,
        details: result.errors,
      });

      showToast(message, 'success');

      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setFeedback({
        type: 'error',
        message: t('excel.importFailed', 'Failed to import projects'),
        details: [message],
      });
      showToast(t('excel.importFailed', 'Failed to import projects'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-colors"
          title={t('excel.exportTooltip', 'Export projects to Excel')}
        >
          <MdFileDownload size={16} />
          {t('excel.export', 'Export')}
        </button>

        {showImport && (
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
            title={t('excel.importTooltip', 'Import projects from Excel')}
          >
            <MdFileUpload size={16} />
            {t('excel.import', 'Import')}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          aria-label={t('excel.fileInput', 'Upload Excel file')}
        />
      </div>

      {feedback && (
        <div
          className={`p-3 rounded text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === 'success' ? (
              <MdCheck size={18} className="text-green-600" />
            ) : (
              <MdError size={18} className="text-red-600" />
            )}
            {feedback.message}
          </div>
          {feedback.details && feedback.details.length > 0 && (
            <ul className="mt-2 ml-6 text-xs space-y-1 list-disc">
              {feedback.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
