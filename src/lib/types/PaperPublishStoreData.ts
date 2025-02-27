import type { Paper } from "./Paper";
import type { User } from "./User";

export interface Block {
	id: string;
	type: string;
	data: {
		text: string;
		// Outros campos de dados podem ser adicionados conforme necessário
	};
}

// export interface InputObject {
// 	time: number;
// 	blocks: Block[];
// }

export interface PaperPublishStoreData extends Omit<Paper, 'mainAuthor' | 'createdAt' | 'updatedAt'> {
	// authors: User[],
	// peer_review?: string,
	mainAuthor: User | null
}