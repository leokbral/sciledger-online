import type {
	HubRoleContext,
	HubSummary,
	HubWorkspacePaper,
	HubWorkspacePersona,
	HubWorkspacePersonaKey,
	HubWorkspaceResolution
} from './hubTypes';

type ReviewResponse = {
	status?: unknown;
	reviewerId?: unknown;
	reviewer?: unknown;
};

const PERSONAS: HubWorkspacePersona[] = [
	{ key: 'HubOwner', label: 'Hub Owner', role: 'admin', roleKey: 'HubOwner', priority: 500 },
	{
		key: 'EditorChief',
		label: 'Editor Chief',
		role: 'editor',
		roleKey: 'EditorChief',
		priority: 400
	},
	{
		key: 'AssociateEditor',
		label: 'Associate Editor',
		role: 'editor',
		roleKey: 'AssociateEditor',
		priority: 300
	},
	{ key: 'Reviewer', label: 'Reviewer', role: 'reviewer', roleKey: 'Reviewer', priority: 200 },
	{ key: 'Author', label: 'Author', role: 'author', roleKey: null, priority: 100 },
	{ key: 'Reader', label: 'Reader', role: 'reader', roleKey: null, priority: 0 }
];

const PERSONAS_BY_KEY = new Map(PERSONAS.map((persona) => [persona.key, persona]));

const ROLE_KEY_TO_PERSONA: Record<string, HubWorkspacePersonaKey> = {
	hubowner: 'HubOwner',
	owner: 'HubOwner',
	editorchief: 'EditorChief',
	managingeditor: 'EditorChief',
	associateeditor: 'AssociateEditor',
	reviewer: 'Reviewer'
};

function normalizeRoleKey(value: unknown) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function collectExplicitRoleKeys(context: HubRoleContext): string[] {
	if (!context) return [];

	if (typeof context === 'string') {
		return [normalizeRoleKey(context)].filter(Boolean);
	}

	const directKeys = [
		context.primaryRoleKey,
		context.roleKey,
		context.key,
		...(context.directRoleKeys ?? [])
	].map(normalizeRoleKey);

	const nestedKeys = (context.roles ?? []).flatMap((role) => collectExplicitRoleKeys(role));

	return Array.from(new Set([...directKeys, ...nestedKeys].filter(Boolean)));
}

function getRoleContextFromHub(hub: HubSummary | null | undefined): HubRoleContext {
	if (!hub) return null;

	return (
		hub.hubRole ??
		hub.currentUserHubRole ??
		hub.currentUserRole ??
		hub.viewerRole ??
		hub.currentUserHubMember ??
		null
	);
}

function getIdAliases(value: unknown): string[] {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') return [String(value)];
	if (typeof value !== 'object') return [];

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};
	const aliases = [candidate.id, candidate._id].filter(Boolean).map((alias) => String(alias));
	const stringified = candidate.toString?.();

	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases.filter(Boolean)));
}

function matchesUser(value: unknown, userAliases: Set<string>): boolean {
	if (userAliases.size === 0) return false;
	return getIdAliases(value).some((alias) => userAliases.has(alias));
}

function paperBelongsToUser(paper: HubWorkspacePaper, userAliases: Set<string>): boolean {
	return (
		matchesUser(paper.mainAuthor, userAliases) ||
		matchesUser(paper.correspondingAuthor, userAliases) ||
		matchesUser(paper.submittedBy, userAliases) ||
		(Array.isArray(paper.coAuthors) &&
			paper.coAuthors.some((coAuthor: unknown) => matchesUser(coAuthor, userAliases)))
	);
}

function paperHasReviewerForUser(paper: HubWorkspacePaper, userAliases: Set<string>): boolean {
	const directReviewer =
		Array.isArray(paper.reviewers) &&
		paper.reviewers.some((reviewer: unknown) => matchesUser(reviewer, userAliases));

	const assignedReviewer =
		Array.isArray(paper.peer_review?.assignedReviewers) &&
		paper.peer_review.assignedReviewers.some((reviewer: unknown) =>
			matchesUser(reviewer, userAliases)
		);

	const acceptedResponse =
		Array.isArray(paper.peer_review?.responses) &&
		paper.peer_review.responses.some((response: unknown) => {
			const reviewResponse = response as ReviewResponse;
			const status = String(reviewResponse.status ?? '').toLowerCase();
			return (
				matchesUser(reviewResponse.reviewerId ?? reviewResponse.reviewer, userAliases) &&
				(status === 'accepted' || status === 'completed')
			);
		});

	return (
		Boolean(paper.isAcceptedForReview) || directReviewer || assignedReviewer || acceptedResponse
	);
}

function personaForRoleKey(roleKey: string) {
	return PERSONAS_BY_KEY.get(ROLE_KEY_TO_PERSONA[roleKey]);
}

function buildResolution(availablePersonas: HubWorkspacePersona[]): HubWorkspaceResolution {
	const fallback = PERSONAS_BY_KEY.get('Reader') as HubWorkspacePersona;
	const sortedPersonas = [...availablePersonas].sort(
		(left, right) => right.priority - left.priority
	);
	const personas = sortedPersonas.length > 0 ? sortedPersonas : [fallback];
	const selected = personas[0] ?? fallback;

	return {
		role: selected.role,
		label: selected.label,
		roleKey: selected.roleKey,
		personaKey: selected.key,
		availablePersonas: personas
	};
}

export function resolveHubWorkspaceFromContext(context: HubRoleContext): HubWorkspaceResolution {
	const explicitRoleKeys = collectExplicitRoleKeys(context);
	const personas = explicitRoleKeys
		.map(personaForRoleKey)
		.filter((persona): persona is HubWorkspacePersona => Boolean(persona));

	return buildResolution(
		Array.from(new Map(personas.map((persona) => [persona.key, persona])).values())
	);
}

export function resolveHubWorkspaceForHub(
	hub: HubSummary | null | undefined,
	memberContext?: HubRoleContext,
	options: {
		userId?: string | null;
		papers?: HubWorkspacePaper[];
	} = {}
): HubWorkspaceResolution {
	const context = memberContext ?? getRoleContextFromHub(hub);
	const explicitRoleKeys = collectExplicitRoleKeys(context);
	const personas = explicitRoleKeys
		.map(personaForRoleKey)
		.filter((persona): persona is HubWorkspacePersona => Boolean(persona));
	const userAliases = new Set(getIdAliases(options.userId));
	const hubPapers = Array.isArray(options.papers) ? options.papers : [];

	if (
		hubPapers.some((paper) => paperHasReviewerForUser(paper, userAliases)) &&
		!personas.some((persona) => persona.key === 'Reviewer')
	) {
		personas.push(PERSONAS_BY_KEY.get('Reviewer') as HubWorkspacePersona);
	}

	if (
		hubPapers.some((paper) => paperBelongsToUser(paper, userAliases)) &&
		!personas.some((persona) => persona.key === 'Author')
	) {
		personas.push(PERSONAS_BY_KEY.get('Author') as HubWorkspacePersona);
	}

	return buildResolution(
		Array.from(new Map(personas.map((persona) => [persona.key, persona])).values())
	);
}
