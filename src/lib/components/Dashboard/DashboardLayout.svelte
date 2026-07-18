<script lang="ts">
	import type { Snippet } from 'svelte';
	import DashboardCard from './DashboardCard.svelte';
	import DashboardGrid from './DashboardGrid.svelte';
	import DashboardHeader from './DashboardHeader.svelte';
	import DashboardQuickActions from './DashboardQuickActions.svelte';
	import DashboardSection from './DashboardSection.svelte';
	import type {
		DashboardActivityPlaceholder,
		DashboardKpiPlaceholder,
		DashboardQuickAction
	} from './types';

	interface Props {
		title: string;
		subtitle: string;
		label: string;
		kpis: DashboardKpiPlaceholder[];
		quickActions: DashboardQuickAction[];
		activity: DashboardActivityPlaceholder[];
		children?: Snippet;
	}

	let { title, subtitle, label, kpis, quickActions, activity, children }: Props = $props();
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<DashboardHeader {title} {subtitle} {label} />

	<DashboardSection
		title="Overview"
		description="A responsive KPI area prepared for role-specific metrics."
	>
		<DashboardGrid variant="kpi">
			{#each kpis as kpi}
				<DashboardCard
					label="KPI"
					title={kpi.label}
					description={kpi.hint}
					tone={kpi.tone ?? 'slate'}
					placeholder
				/>
			{/each}
		</DashboardGrid>
	</DashboardSection>

	<DashboardGrid variant="split">
		<DashboardSection title="Activity" description="A timeline area for recent dashboard events.">
			<DashboardCard compact>
				<div class="divide-y divide-surface-200">
					{#each activity as item}
						<div class="flex gap-3 py-4 first:pt-0 last:pb-0">
							<div class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500"></div>
							<div class="min-w-0 space-y-1">
								<p class="text-sm font-semibold text-surface-900">{item.title}</p>
								<p class="text-sm leading-relaxed text-surface-600">{item.description}</p>
							</div>
						</div>
					{/each}
				</div>
			</DashboardCard>
		</DashboardSection>

		<DashboardSection
			title="Quick Actions"
			description="A compact action area for common workflows."
		>
			<DashboardQuickActions actions={quickActions} />
		</DashboardSection>
	</DashboardGrid>

	{@render children?.()}
</div>
