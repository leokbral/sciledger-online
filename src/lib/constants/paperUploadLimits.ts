export const MAIN_PAPER_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const MAIN_PAPER_FILE_LIMIT_LABEL = '20 MB';
export const SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL = '20 MB';

export function formatUploadBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB'];
	const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, unitIndex);

	return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
}
