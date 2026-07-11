import { describe, expect, it } from 'vitest';
import { UserSessionSchema } from './UserSessionSchema';

// Mongoose's own .d.ts mistypes Schema#indexes() as Array<IndexDefinition>,
// but at runtime it returns [fields, options] tuples -- reflected here.
type IndexTuple = [Record<string, number>, Record<string, unknown>];

function getIndexes(): IndexTuple[] {
	return UserSessionSchema.indexes() as unknown as IndexTuple[];
}

describe('UserSessionSchema TTL index', () => {
	it('declares a TTL index on expiresAt with expireAfterSeconds: 0, through the schema', () => {
		const indexes = getIndexes();

		const ttlIndex = indexes.find(([fields]) => Object.keys(fields).length === 1 && fields.expiresAt === 1);

		expect(ttlIndex).toBeDefined();
		const [, options] = ttlIndex as IndexTuple;
		expect(options.expireAfterSeconds).toBe(0);
	});

	it('does not declare a second, non-TTL plain index on expiresAt alone', () => {
		// A duplicate plain index on the same single field with different
		// options would make MongoDB reject index creation (IndexOptionsConflict).
		const indexes = getIndexes();
		const expiresAtOnlyIndexes = indexes.filter(
			([fields]) => Object.keys(fields).length === 1 && fields.expiresAt === 1
		);

		expect(expiresAtOnlyIndexes).toHaveLength(1);
	});
});
