<script lang="ts">
	import type { AnyNaptrRecord } from 'node:dns';

	let {
		inputList,
		input = undefined,
		options = [],
		limit = undefined,
		allowlist = [],
		denylist = [],
		emptyState = 'No Results Found.',
		regionNav = 'bg-[rgb(240,240,240)] dark:bg-surface-900 p-4',
		regionList = 'list-nav',
		regionItem = '',
		regionButton = 'w-full flex justify-start px-4 py-2 rounded-3xl hover:bg-primary-500',
		regionEmpty = '',
		filter = filterOptions,
		onSelect = (option: any) => {}
	} = $props<{
		inputList: unknown[];
		input: unknown;
		options: any[];
		denylist: unknown[];
		emptyState: string;
		regionEmpty: string;
		limit?: number;
		allowlist?: unknown[];
		regionNav?: string;
		regionList?: string;
		regionItem?: string;
		regionButton?: string;
		filter?: () => any[];
		onSelect?: (option: any) => void;
	}>();

	let listedOptions = $state(options);

	function filterByAllowDeny() {
		let _options = [...options];
		if (allowlist.length) {
			_options = _options.filter((option) => allowlist.includes(option.username));
		}
		if (denylist.length) {
			_options = _options.filter((option) => !denylist.includes(option.username));
			// console.log('denylist', _options);
		}
		if (!allowlist.length && !denylist.length) {
			_options = options;
		}
		listedOptions = _options;
	}

	function filterOptions(): any[] {
		let _options = [...listedOptions];
		return _options.filter((option) => {
			const inputFormatted = String(input).toLowerCase().trim();
			let optionFormatted = JSON.stringify([
				option.label,
				option.username,
				option.keywords
			]).toLowerCase();
			if (optionFormatted.includes(inputFormatted)) return option;
		});
	}

	function onSelection(option: any) {
		// Handle selection
		// console.log(option);
		onSelect(option);
	}

	$effect(() => {
	
		filterByAllowDeny();
	});

	let optionsFiltered = $derived(input ? filter() : listedOptions);
	let sliceLimit = $derived(limit ?? optionsFiltered.length);

	// Classes
	// const classesBase = $derived($props.class ?? '');
	let classesBase = $derived('');
	let classesNav = $derived(regionNav);
	let classesList = $derived(regionList);
	let classesItem = $derived(regionItem);
	let classesButton = $derived(regionButton);
	let classesEmpty = $derived(regionEmpty);
</script>


<div class="autocomplete {classesBase}" data-testid="autocomplete">
	
	{#if optionsFiltered.length > 0}
		<nav class="autocomplete-nav {classesNav}">
			<ul class="autocomplete-list {classesList}">
				{#each optionsFiltered.slice(0, sliceLimit) as option (option)}
					<li class="autocomplete-item {classesItem}">
						
						<button
							class="autocomplete-button {classesButton}"
							type="button"
							onclick={() => onSelection(option)}
						>
							{@html option.label}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{:else}
		<div class="autocomplete-empty {classesEmpty}">{@html emptyState}</div>
	{/if}
</div>