<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import {
		authorSnapshotMatchesReference,
		buildPaperAffiliationIndex,
		formatAffiliationIndexes,
		formatAffiliationDisplayName,
		normalizeAuthorSnapshot,
		normalizeAuthorSnapshots,
		type PaperAuthorSnapshot
	} from '$lib/utils/paperAuthorAffiliations';

	interface Props {
		paper: any;
		rootClass?: string;
		headingText?: string | null;
	}

	let { paper, rootClass = '', headingText = 'Authors' }: Props = $props();

	function getDisplayName(author: any): string {
		if (!author || typeof author !== 'object') return 'Unknown author';

		const firstName = String(author.firstName ?? '').trim();
		const lastName = String(author.lastName ?? '').trim();
		const fullName = `${firstName} ${lastName}`.trim();

		if (fullName) return fullName;

		const username = String(author.username ?? '').trim();
		if (username) return username;

		const email = String(author.email ?? '').trim();
		return email || 'Unknown author';
	}

	function getInitials(name: string): string {
		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return 'NA';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}

	function getProfileUrl(author: any): string | null {
		if (!author || typeof author !== 'object') return null;

		const username = String(author.username ?? '').trim();
		return username ? `/profile/${username}` : null;
	}

	function getPaperAuthors(paperData: any): Array<{ author: any; role: string }> {
		const authors: Array<{ author: any; role: string }> = [];

		if (paperData?.mainAuthor) {
			authors.push({ author: paperData.mainAuthor, role: 'Main author' });
		}

		for (const author of paperData?.coAuthors ?? []) {
			if (!author) continue;
			authors.push({ author, role: 'Co-author' });
		}

		return authors;
	}

	function getPaperAuthorSnapshot(
		paperData: any,
		author: any
	): PaperAuthorSnapshot {
		const storedSnapshots = normalizeAuthorSnapshots(paperData?.authorAffiliations);
		const matchedSnapshot = storedSnapshots.find((snapshot) =>
			authorSnapshotMatchesReference(snapshot, author)
		);
		const profileSnapshot = normalizeAuthorSnapshot(author) ?? {
			name: getDisplayName(author),
			affiliations: []
		};
		const isCorresponding =
			Boolean(matchedSnapshot?.isCorresponding) ||
			authorSnapshotMatchesReference(profileSnapshot, paperData?.correspondingAuthor);

		return {
			...profileSnapshot,
			...matchedSnapshot,
			name: matchedSnapshot?.name || profileSnapshot.name,
			orcid: matchedSnapshot?.orcid || profileSnapshot.orcid,
			affiliations:
				matchedSnapshot?.affiliations?.length
					? matchedSnapshot.affiliations
					: profileSnapshot.affiliations || [],
			isCorresponding
		};
	}

	function getPaperAuthorRenderData(paperData: any) {
		const items = getPaperAuthors(paperData).map((item) => ({
			...item,
			snapshot: getPaperAuthorSnapshot(paperData, item.author)
		}));
		const affiliationIndex = buildPaperAffiliationIndex(items.map((item) => item.snapshot));
		// A paper may name several corresponding authors; each already carries its own `*`
		// beside the name, so the legend below only has to agree in number.
		const correspondingCount = items.filter((item) => item.snapshot.isCorresponding).length;

		return {
			items,
			affiliationEntries: affiliationIndex.entries,
			authorAffiliationIndexes: affiliationIndex.authorAffiliationIndexes,
			hasCorrespondingAuthor: correspondingCount > 0,
			correspondingCount
		};
	}

	function getAuthorMetaLine(snapshot: PaperAuthorSnapshot): string {
		return (snapshot.affiliations ?? [])
			.map((affiliation) => affiliation.displayName || formatAffiliationDisplayName(affiliation))
			.filter(Boolean)
			.join(' / ');
	}

	let authorData = $derived(getPaperAuthorRenderData(paper));
</script>

{#if authorData.items.length > 0}
	<div class={rootClass}>
		{#if headingText}
			<p class="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
				{headingText}
			</p>
		{/if}

		<div
			class="paper-export-authors grid grid-cols-1 gap-x-8 gap-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 lg:grid-cols-2"
		>
			{#each authorData.items as item, index (`${item.role}-${item.author?.id || item.author?._id || item.author?.username || index}`)}
				{@const author = item.author}
				{@const snapshot = item.snapshot}
				{@const displayName = snapshot.name || getDisplayName(author)}
				{@const profileUrl = getProfileUrl(author)}
				{@const affiliationMarks = formatAffiliationIndexes(authorData.authorAffiliationIndexes[index] ?? [])}
				{@const metaLine = getAuthorMetaLine(snapshot)}

				<article class="paper-export-author min-w-0 py-1.5">
					<div class="flex items-start gap-3">
						<div class="paper-export-author-avatar h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
							{#if author?.profilePictureUrl}
								<Avatar src={author.profilePictureUrl} name={displayName} size="w-9" />
							{:else}
								<div class="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
									<span class="text-[11px] font-semibold uppercase">{getInitials(displayName)}</span>
								</div>
							{/if}
						</div>

						<div class="paper-export-author-body min-w-0 flex-1">
							<span
								class="paper-export-author-role block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400"
							>
								{item.role}
							</span>

							<div class="paper-export-author-name mt-1 min-w-0">
								{#if profileUrl}
									<a
										class="block break-words text-[15px] font-medium leading-snug text-slate-800 hover:text-primary-700 hover:underline"
										href={profileUrl}
									>
										{displayName}
										{#if affiliationMarks}
											<sup class="ml-0.5 text-[10px] leading-none">{affiliationMarks}</sup>
										{/if}
										{#if snapshot.isCorresponding}
											<sup class="ml-0.5 text-[10px] leading-none">*</sup>
										{/if}
									</a>
								{:else}
									<span class="block break-words text-[15px] font-medium leading-snug text-slate-800">
										{displayName}
										{#if affiliationMarks}
											<sup class="ml-0.5 text-[10px] leading-none">{affiliationMarks}</sup>
										{/if}
										{#if snapshot.isCorresponding}
											<sup class="ml-0.5 text-[10px] leading-none">*</sup>
										{/if}
									</span>
								{/if}
							</div>

							{#if snapshot.orcid}
								<a
									class="mt-1 inline-flex break-all text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline"
									href={`https://orcid.org/${snapshot.orcid}`}
									target="_blank"
									rel="noopener"
								>
									ORCID {snapshot.orcid}
								</a>
							{/if}

							{#if metaLine}
								<p class="paper-export-author-meta mt-1 break-words text-xs leading-5 text-slate-500">
									{metaLine}
								</p>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>

		{#if authorData.affiliationEntries.length > 0}
			<ol class="paper-export-affiliations mt-3 space-y-1 text-xs leading-5 text-slate-500">
				{#each authorData.affiliationEntries as item (item.key)}
					<li class="flex gap-1.5">
						<sup class="mt-0.5 text-[10px] leading-none">{item.index}</sup>
						<span>{item.displayName}</span>
					</li>
				{/each}
			</ol>
		{/if}

		{#if authorData.hasCorrespondingAuthor}
			<p class="paper-export-corresponding-author mt-2 text-xs leading-5 text-slate-500">
				* {authorData.correspondingCount > 1 ? 'Corresponding authors' : 'Corresponding author'}
			</p>
		{/if}
	</div>
{/if}
