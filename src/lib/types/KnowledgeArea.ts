
export type KnowledgeArea = {
    id: string;
    name: string;
    parentId: string | null; // parentId é opcional para áreas principais, mas obrigatório para subáreas
}


