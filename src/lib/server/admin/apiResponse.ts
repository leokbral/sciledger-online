import { json } from '@sveltejs/kit';
import {
	recordAdminAuditEvent,
	type AdminAuditAction,
	type AdminAuditResourceType
} from '../authorization/adminAudit';
import { requireSuperAdmin } from '../authorization/superAdmin';
import { readPagination, type Paginated, type PaginationInput } from './pagination';

type AdminListConfig<T> = {
	action: AdminAuditAction;
	resourceType: AdminAuditResourceType;
	load: (pagination: PaginationInput, url: URL) => Promise<Paginated<T>>;
	/** Extra non-sensitive fields to record on the audit event. */
	auditMetadata?: (url: URL) => Record<string, unknown>;
};

/**
 * Shared shape for every administrative list endpoint: authorize, parse paging,
 * load, audit, respond. Keeping it in one place means the guard cannot be
 * forgotten on a new endpoint and every response is paginated the same way.
 *
 * `requireSuperAdmin` throws 401/403, which SvelteKit turns into the matching
 * HTTP response, so nothing below it runs for an unauthorized caller.
 */
export async function respondWithAdminList<T>(
	event: { locals: App.Locals; url: URL },
	config: AdminListConfig<T>
) {
	await requireSuperAdmin(event.locals.user);

	const pagination = readPagination(event.url.searchParams);
	const result = await config.load(pagination, event.url);

	await recordAdminAuditEvent({
		actor: event.locals.user,
		action: config.action,
		resourceType: config.resourceType,
		resourceId: 'list',
		metadata: {
			source: 'api',
			search: pagination.search || null,
			page: pagination.page,
			returned: result.items.length,
			...(config.auditMetadata?.(event.url) ?? {})
		}
	});

	return json(result);
}
