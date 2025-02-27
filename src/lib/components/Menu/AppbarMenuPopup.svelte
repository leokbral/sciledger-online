<script lang="ts">
	import { getCurrentDate, getDifference } from '$lib/utils/streak';
	import Profile from '../Profile/Profile.svelte';
	import MenuHighlights from './MenuHighlights.svelte';
	// import MenuEmphasis from './MenuHighlights.svelte';

	export let data: any;

	let lastStreakCheckpointDate: string = data.profile.lastStreakCheckpointDate;
	let currentDate: string = getCurrentDate();
	let isInactive: boolean = getDifference(currentDate, lastStreakCheckpointDate) !== 0;
	const highlights = [
		{ icon: '🔥', value: data.profile.streakCount, isInactive },
		{ icon: '💎', value: data.profile.points },
		{ icon: '⭐', value: data.profile.stars.reduce((s: number, acc: number) => s + acc, 0) }
	];

	const profile = data.profile;
	const quests = data.quests;
	//const highlights = data.highlights;
</script>

<div data-popup="appbar-menu-popup" class="z-[50]">
	<div class="card w-72 shadow-xl">
		<Profile {profile} />
		<MenuHighlights {highlights} />
		<div class="arrow bg-surface-800-100-token z-[50]" />
		<section class="w-full text-surface-900-50-token card p-4 space-y-4">
			<p class="font-bold">Desafios</p>
			<ul class="list">
				{#each quests as quest}
					<li>
						<figure
							class="avatar flex aspect-square font-semibold justify-center items-center overflow-hidden isolate bg-surface-400-500-token w-12 rounded-full"
							data-testid="avatar"
						>
							{quest}
							<!-- <img
								class="avatar-image w-full h-full object-cover"
								src={quest.img.src}
								alt={quest.img.alt}
								style=""
							/> -->
						</figure>
						<span class="flex-auto">{quest.description}</span> <span>⋮</span>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>
