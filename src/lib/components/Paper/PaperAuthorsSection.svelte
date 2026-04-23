<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';

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

	function getAuthorAcademicInfo(
		paperData: any,
		author: any
	): { department: string; university: string } {
		if (!author) return { department: '', university: '' };

		const authorId = String(author?.id || author?._id || '').trim();
		const authorUsername = String(author?.username || '').trim();

		if (Array.isArray(paperData?.authorAffiliations)) {
			const matchedAffiliation = paperData.authorAffiliations.find((item: any) => {
				const affiliationUserId = String(item?.userId || '').trim();
				const affiliationUsername = String(item?.username || '').trim();

				if (authorId && affiliationUserId && authorId === affiliationUserId) return true;
				if (authorUsername && affiliationUsername && authorUsername === affiliationUsername) return true;
				return false;
			});

			const department = String(matchedAffiliation?.department || '').trim();
			const university = String(matchedAffiliation?.affiliation || '').trim();

			if (department || university) {
				return { department, university };
			}
		}

		return {
			department: String(author?.position || '').trim(),
			university: String(author?.institution || '').trim()
		};
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

	function getAuthorMetaLine(academicInfo: { department: string; university: string }): string {
		return [academicInfo.department, academicInfo.university].filter(Boolean).join(' / ');
	}
</script>

{#if getPaperAuthors(paper).length > 0}
	<div class={rootClass}>
		{#if headingText}
			<p class="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
				{headingText}
			</p>
		{/if}

		<div
			class="paper-export-authors grid grid-cols-1 gap-x-8 gap-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 lg:grid-cols-2"
		>
			{#each getPaperAuthors(paper) as item, index (`${item.role}-${item.author?.id || item.author?._id || item.author?.username || index}`)}
				{@const author = item.author}
				{@const displayName = getDisplayName(author)}
				{@const profileUrl = getProfileUrl(author)}
				{@const academicInfo = getAuthorAcademicInfo(paper, author)}
				{@const metaLine = getAuthorMetaLine(academicInfo)}

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
									</a>
								{:else}
									<span class="block break-words text-[15px] font-medium leading-snug text-slate-800">
										{displayName}
									</span>
								{/if}
							</div>

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
	</div>
{/if}
