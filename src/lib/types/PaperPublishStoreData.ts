import type { Paper } from "./Paper";
import type { User } from "./User";

export interface Block {
	id: string;
	type: string;
	data: {
		text: string;
		// Other data fields can be added as needed
	};
}

// export interface InputObject {
// 	time: number;
// 	blocks: Block[];
// }

export interface SupplementaryMaterial {
	id: string; // Unique ID for this item
	title: string; // Title/description of the material
	url: string; // Repository URL
	type: 'github' | 'figshare' | 'zenodo' | 'osf' | 'dataverse' | 'other'; // Repository type
	description?: string; // Detailed description
	createdAt?: Date; // When it was added
	updatedAt?: Date; // Last update
}

export interface PaperPublishStoreData extends Omit<Paper, 'mainAuthor' | 'createdAt' | 'updatedAt'> {
	// authors: User[],
	// peer_review?: string,
	mainAuthor: User | null,
	supplementaryMaterials?: SupplementaryMaterial[]
}