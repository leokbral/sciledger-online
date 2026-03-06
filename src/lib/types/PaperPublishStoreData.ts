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

export interface SupplementaryMaterial {
	id: string; // ID único para este item
	title: string; // Título/descrição do material
	url: string; // URL do repositório
	type: 'github' | 'figshare' | 'zenodo' | 'osf' | 'dataverse' | 'other'; // Tipo de repositório
	description?: string; // Descrição detalhada
	createdAt?: Date; // Quando foi adicionado
	updatedAt?: Date; // Última atualização
}

export interface PaperPublishStoreData extends Omit<Paper, 'mainAuthor' | 'createdAt' | 'updatedAt'> {
	// authors: User[],
	// peer_review?: string,
	mainAuthor: User | null,
	supplementaryMaterials?: SupplementaryMaterial[]
}