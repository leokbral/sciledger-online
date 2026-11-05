<script lang="ts">
	import Profile from '../Profile/Profile.svelte';
	import MenuHighlights from './MenuHighlights.svelte';
	// import MenuEmphasis from './MenuHighlights.svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const currentDate = new Date().toISOString().slice(0, 10);
	const lastStreakCheckpointDate = String(data.profile.lastStreakCheckpointDate ?? '');
	const isInactive = currentDate !== lastStreakCheckpointDate.slice(0, 10);
	const highlights = [
		{ icon: '🔥', value: data.profile.streakCount, isInactive },
		{ icon: '💎', value: data.profile.points },
		{ icon: '⭐', value: data.profile.stars.reduce((s: number, acc: number) => s + acc, 0) }
	];

	const profile = data.profile;
	const quests = data.quests;
	//const highlights = data.highlights;
</script>

<div data-popup="appbar-menu-popup" class="z-50">
	<div class="card w-72 shadow-xl">
		<Profile {profile} />
		<MenuHighlights {highlights} />
		<div class="arrow bg-surface-900-100 z-50"></div>
		<section class="w-full text-surface-950-50 card p-4 space-y-4">
			<p class="font-bold">Desafios</p>
			<ul class="list">
				{#each quests as quest}
					<li>
						<figure
							class="avatar flex aspect-square font-semibold justify-center items-center overflow-hidden isolate bg-surface-500 w-12 rounded-full"
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
