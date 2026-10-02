import type {
	HubRoleContext,
	HubSummary,
	HubWorkspacePaper,
	HubWorkspacePersona,
	HubWorkspacePersonaKey,
	HubWorkspaceResolution
} from './hubTypes';
import { isPaperReviewableByUser, paperBelongsToUser, toUserAliases } from './hubPaperVisibility';

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
	const userAliases = toUserAliases(options.userId);
	const hubPapers = Array.isArray(options.papers) ? options.papers : [];

	if (
		hubPapers.some((paper) => isPaperReviewableByUser(paper, userAliases)) &&
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
