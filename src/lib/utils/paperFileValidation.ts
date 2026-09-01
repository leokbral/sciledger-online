import {
	MAIN_PAPER_FILE_LIMIT_LABEL,
	MAIN_PAPER_FILE_MAX_BYTES,
	SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES,
	SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL
} from '$lib/constants/paperUploadLimits';

export type FileSizeLike = {
	size?: number | null;
	fileSize?: number | null;
};

export function getFileSize(value: FileSizeLike | null | undefined) {
	const size = value?.fileSize ?? value?.size ?? 0;
	return Number.isFinite(size) && size > 0 ? Number(size) : 0;
}

export function getSupplementaryFilesTotal(files: Array<FileSizeLike | null | undefined> = []) {
	return files.reduce((total, file) => total + getFileSize(file), 0);
}

export function validateMainPaperFileSize(file: FileSizeLike | null | undefined) {
	const size = getFileSize(file);
	const ok = size <= MAIN_PAPER_FILE_MAX_BYTES;

	return {
		ok,
		code: ok ? null : 'main_file_too_large',
		size,
		maxBytes: MAIN_PAPER_FILE_MAX_BYTES,
		message: ok
			? ''
			: `The document exceeds the maximum allowed size of ${MAIN_PAPER_FILE_LIMIT_LABEL}.`
	};
}

export function validateSupplementaryFilesTotal(files: Array<FileSizeLike | null | undefined> = []) {
	const totalSize = getSupplementaryFilesTotal(files);
	const ok = totalSize <= SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES;

	return {
		ok,
		code: ok ? null : 'supplementary_total_limit_exceeded',
		totalSize,
		maxBytes: SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES,
		remainingBytes: Math.max(0, SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES - totalSize),
		message: ok
			? ''
			: `Os arquivos suplementares excedem o limite total de ${SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL}.`
	};
}

export function normalizePaperCoverIds(value: unknown) {
	if (typeof value === 'string') {
		const id = value.trim();
		return id ? [id] : [];
	}

	if (!Array.isArray(value)) return [];

	return value
		.map((item) => String(item ?? '').trim())
		.filter(Boolean)
		.slice(0, 1);
}
