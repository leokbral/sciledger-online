import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';

export function validateTask(
	store: PaperPublishStoreData
) {
	const validateResult = {
		title: false,
		abstract: false,
		keywords: false,
		mainAuthor: false
	};
 
	if (store.title) {
		validateResult.title = true;
	}
	if (store.abstract) {
		validateResult.abstract = true;
	}

	if (store.keywords) {
		validateResult.keywords = true;
	}

	if (store.mainAuthor) {
		validateResult.mainAuthor = true;
	}

	return validateResult;
}