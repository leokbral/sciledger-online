<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		expanded?: boolean;
	}

	let { expanded = $bindable(false) }: Props = $props();

	// Individual section states
	let preparingExpanded = $state(false);
	let formattingExpanded = $state(false);
	let citationsExpanded = $state(false);
	let checklistExpanded = $state(false);
</script>

<div class="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-sm overflow-hidden">
	<button
		type="button"
		onclick={() => expanded = !expanded}
		class="w-full flex items-center justify-between p-6 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-300 group"
	>
		<div class="flex items-center gap-4">
			<div class="p-3 bg-primary-600 rounded-xl group-hover:bg-primary-700 transition-colors shadow-sm">
				<Icon icon="mdi:book-open-page-variant" class="size-6 text-white" />
			</div>
			<div class="text-left">
				<h3 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
					Paper Submission Guide
				</h3>
				<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
					Complete formatting and submission guidelines
				</p>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<span class="text-xs font-medium px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-full border border-surface-200 dark:border-surface-600">
				{expanded ? 'Hide Guide' : 'Show Guide'}
			</span>
			<Icon
				icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
				class="size-5 text-surface-500 dark:text-surface-400 transition-transform duration-300"
			/>
		</div>
	</button>

	{#if expanded}
		<div class="border-t border-surface-200 dark:border-surface-700">
			<div class="p-6 space-y-6">

				<!-- Section 1: Preparing Your Paper -->
				<div class="bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
					<button
						type="button"
						onclick={() => preparingExpanded = !preparingExpanded}
						class="w-full flex items-center justify-between p-6 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all duration-300 group"
					>
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors shadow-sm">
								<span class="text-lg font-bold text-white">1</span>
							</div>
							<div class="text-left">
								<h4 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
									Preparing Your Paper
								</h4>
								<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
									Paper information and required sections
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs font-medium px-3 py-1.5 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full border border-surface-200 dark:border-surface-600">
								{preparingExpanded ? 'Hide' : 'Show'}
							</span>
							<Icon
								icon={preparingExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								class="size-5 text-surface-500 dark:text-surface-400 transition-transform duration-300"
							/>
						</div>
					</button>

					{#if preparingExpanded}
						<div class="border-t border-surface-200 dark:border-surface-700 p-6 space-y-6">
							<div class="space-y-6">

								<!-- 1.1 Fill in Your Paper Information -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-blue-700 dark:text-blue-300">1.1</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Paper Information</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Edit the template and replace the placeholder content with your own paper information. Make sure to:
									</p>
									<div class="space-y-3">
										<div class="flex items-start gap-3 p-3 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-600">
											<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span class="text-surface-700 dark:text-surface-300">
												<strong class="text-surface-900 dark:text-surface-100">Replace the current title</strong> with your paper title
											</span>
										</div>
										<div class="flex items-start gap-3 p-3 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-600">
											<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span class="text-surface-700 dark:text-surface-300">
												<strong class="text-surface-900 dark:text-surface-100">Update the abstract</strong> with a summary of your research (150–300 words)
											</span>
										</div>
										<div class="flex items-start gap-3 p-3 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-600">
											<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
											<span class="text-surface-700 dark:text-surface-300">
												<strong class="text-surface-900 dark:text-surface-100">Add keywords</strong> separated by commas
											</span>
										</div>
									</div>
								</div>

								<!-- Required Sections -->
								<div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-700">
									<div class="flex items-center gap-3 mb-4">
										<Icon icon="mdi:alert-circle" class="size-6 text-amber-600" />
										<h5 class="text-lg font-semibold text-amber-900 dark:text-amber-100">Required Sections</h5>
									</div>
									<p class="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
										The structure of the paper can be adapted according to the needs of the research, but the following sections must always exist:
									</p>
									<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div class="bg-white dark:bg-surface-900 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
											<Icon icon="mdi:text-box" class="size-8 text-red-600 mx-auto mb-2" />
											<span class="font-bold text-red-900 dark:text-red-100">Abstract</span>
											<p class="text-sm text-red-700 dark:text-red-300 mt-1">Required</p>
										</div>
										<div class="bg-white dark:bg-surface-900 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
											<Icon icon="mdi:book-open" class="size-8 text-red-600 mx-auto mb-2" />
											<span class="font-bold text-red-900 dark:text-red-100">Introduction</span>
											<p class="text-sm text-red-700 dark:text-red-300 mt-1">Required</p>
										</div>
										<div class="bg-white dark:bg-surface-900 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
											<Icon icon="mdi:format-list-bulleted" class="size-8 text-red-600 mx-auto mb-2" />
											<span class="font-bold text-red-900 dark:text-red-100">References</span>
											<p class="text-sm text-red-700 dark:text-red-300 mt-1">Required</p>
										</div>
									</div>
									<div class="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-600">
										<p class="text-amber-900 dark:text-amber-100 text-sm font-medium">
											⚠️ These sections must remain present in the document. Other sections between them may be reorganized as needed. Do not remove the References section.
										</p>
									</div>
								</div>

								<!-- 1.2 Add Your Research Content -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-green-700 dark:text-green-300">1.2</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Research Content</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Fill in the sections of the paper with your research material. The internal structure between Introduction and References may vary depending on the research.
									</p>
									<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Common optional sections:</p>
										<div class="flex flex-wrap gap-2">
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Background</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Related Work</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Methodology</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">System Architecture</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Experiments</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Results</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Discussion</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Analysis</span>
											<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm">Case Study</span>
										</div>
									</div>
									<div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
										<p class="text-blue-900 dark:text-blue-100 text-sm">
											💡 <strong>Tip:</strong> The section hierarchy must always use Word Heading styles (Heading 1 → main sections, Heading 2 → subsections, Heading 3 → sub-subsections).
										</p>
									</div>
								</div>

								<!-- 1.3 Add Figures and Tables -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-purple-700 dark:text-purple-300">1.3</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Figures and Tables</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Figures must follow a specific structure to ensure correct processing by the system.
									</p>

									<!-- Figure Format Alert -->
									<div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
										<div class="flex items-center gap-3 mb-3">
											<Icon icon="mdi:alert" class="size-6 text-red-600" />
											<span class="font-bold text-red-900 dark:text-red-100">Figure Format (Mandatory)</span>
										</div>
										<p class="text-red-800 dark:text-red-200 mb-3">For every figure:</p>
										<div class="space-y-2">
											<div class="flex items-start gap-3">
												<span class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
												<span class="text-red-800 dark:text-red-200">The <strong>title of the figure</strong> must appear above the image</span>
											</div>
											<div class="flex items-start gap-3">
												<span class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
												<span class="text-red-800 dark:text-red-200">The <strong>caption</strong> must appear below the image</span>
											</div>
											<div class="flex items-start gap-3">
												<span class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
												<span class="text-red-800 dark:text-red-200">The <strong>title</strong> must use <strong>Heading 2</strong></span>
											</div>
											<div class="flex items-start gap-3">
												<span class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
												<span class="text-red-800 dark:text-red-200">The <strong>caption</strong> must use <strong>Normal text</strong> style</span>
											</div>
										</div>
									</div>

									<!-- Example -->
									<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Correct Example:</p>
										<div class="bg-surface-50 dark:bg-surface-800 rounded p-4 text-sm font-mono border">
											<div class="text-blue-700 dark:text-blue-300 font-bold mb-2">Heading 2: Figure 1: System architecture</div>
											<div class="text-center text-surface-500 my-3">[Insert image here]</div>
											<div class="text-surface-700 dark:text-surface-300">Normal text: Caption: Overview of the proposed architecture showing the interaction between system components.</div>
										</div>
									</div>

									<!-- Important Rules -->
									<div class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
										<p class="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Important rules:</p>
										<ul class="text-yellow-800 dark:text-yellow-200 text-sm space-y-1">
											<li>• Do not embed essential explanations only inside the image</li>
											<li>• Insert images directly into the document</li>
											<li>• Avoid linking external images</li>
											<li>• Use common formats such as PNG or JPG</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Section 2: Formatting Rules -->
				<div class="bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
					<button
						type="button"
						onclick={() => formattingExpanded = !formattingExpanded}
						class="w-full flex items-center justify-between p-6 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all duration-300 group"
					>
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition-colors shadow-sm">
								<span class="text-lg font-bold text-white">2</span>
							</div>
							<div class="text-left">
								<h4 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
									Formatting Rules
								</h4>
								<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
									Word styles and document structure
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs font-medium px-3 py-1.5 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full border border-surface-200 dark:border-surface-600">
								{formattingExpanded ? 'Hide' : 'Show'}
							</span>
							<Icon
								icon={formattingExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								class="size-5 text-surface-500 dark:text-surface-400 transition-transform duration-300"
							/>
						</div>
					</button>

					{#if formattingExpanded}
						<div class="border-t border-surface-200 dark:border-surface-700 p-6 space-y-6">
							<div class="space-y-6">
								<div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-700">
									<div class="flex items-start gap-3">
										<Icon icon="mdi:information-outline" class="size-5 text-primary-600 mt-0.5" />
										<p class="text-primary-900 dark:text-primary-100">
											The platform automatically extracts structure from the document. Correct formatting is required.
										</p>
									</div>
								</div>

								<!-- 2.1 Title Structure -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-blue-700 dark:text-blue-300">2.1</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Title Structure</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Use native Microsoft Word styles in English.
									</p>

									<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-4">Allowed styles:</p>
										<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
											<div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
												<Icon icon="mdi:format-header-1" class="size-8 text-blue-600 mx-auto mb-2" />
												<div class="font-bold text-blue-900 dark:text-blue-100">Heading 1</div>
												<div class="text-sm text-blue-700 dark:text-blue-300">Main sections</div>
											</div>
											<div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
												<Icon icon="mdi:format-header-2" class="size-8 text-blue-600 mx-auto mb-2" />
												<div class="font-bold text-blue-900 dark:text-blue-100">Heading 2</div>
												<div class="text-sm text-blue-700 dark:text-blue-300">Subsections</div>
											</div>
											<div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
												<Icon icon="mdi:format-header-3" class="size-8 text-blue-600 mx-auto mb-2" />
												<div class="font-bold text-blue-900 dark:text-blue-100">Heading 3</div>
												<div class="text-sm text-blue-700 dark:text-blue-300">Sub-subsections</div>
											</div>
											<div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
												<Icon icon="mdi:format-header-4" class="size-8 text-blue-600 mx-auto mb-2" />
												<div class="font-bold text-blue-900 dark:text-blue-100">Heading 4</div>
												<div class="text-sm text-blue-700 dark:text-blue-300">Additional level</div>
											</div>
										</div>
									</div>

									<div class="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
										<p class="font-semibold text-red-900 dark:text-red-100 mb-3">Important rules:</p>
										<div class="space-y-2">
											<div class="flex items-start gap-3">
												<Icon icon="mdi:close-circle" class="size-5 text-red-500 mt-0.5 flex-shrink-0" />
												<span class="text-red-800 dark:text-red-200">Do not simulate titles using bold text or larger fonts</span>
											</div>
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-500 mt-0.5 flex-shrink-0" />
												<span class="text-red-800 dark:text-red-200">Titles must use Word paragraph styles</span>
											</div>
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-500 mt-0.5 flex-shrink-0" />
												<span class="text-red-800 dark:text-red-200">Maintain logical hierarchy</span>
											</div>
										</div>
									</div>

									<div class="mt-4 bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Example hierarchy:</p>
										<div class="space-y-2 text-sm">
											<div class="flex items-center gap-2">
												<Icon icon="mdi:format-header-1" class="size-4 text-blue-600" />
												<span class="font-bold text-blue-700 dark:text-blue-300">Heading 1 → Main section</span>
											</div>
											<div class="flex items-center gap-2 ml-6">
												<Icon icon="mdi:format-header-2" class="size-4 text-green-600" />
												<span class="font-bold text-green-700 dark:text-green-300">Heading 2 → Subsection</span>
											</div>
											<div class="flex items-center gap-2 ml-12">
												<Icon icon="mdi:format-header-3" class="size-4 text-purple-600" />
												<span class="font-bold text-purple-700 dark:text-purple-300">Heading 3 → Sub-subsection</span>
											</div>
										</div>
									</div>
								</div>

								<!-- 2.2 Body Text -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-green-100 dark:bg-green-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-green-700 dark:text-green-300">2.2</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Body Text</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Use the Normal style for regular paragraphs.
									</p>

									<div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
										<div class="flex items-center gap-3 mb-3">
											<Icon icon="mdi:cancel" class="size-6 text-red-600" />
											<span class="font-bold text-red-900 dark:text-red-100">Avoid using:</span>
										</div>
										<div class="grid grid-cols-2 gap-3">
											<div class="flex items-center gap-2 p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600">
												<Icon icon="mdi:text-box" class="size-4 text-red-500" />
												<span class="text-red-800 dark:text-red-200">Text boxes</span>
											</div>
											<div class="flex items-center gap-2 p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600">
												<Icon icon="mdi:format-text" class="size-4 text-red-500" />
												<span class="text-red-800 dark:text-red-200">WordArt</span>
											</div>
											<div class="flex items-center gap-2 p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600">
												<Icon icon="mdi:comment" class="size-4 text-red-500" />
												<span class="text-red-800 dark:text-red-200">Comments</span>
											</div>
											<div class="flex items-center gap-2 p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600">
												<Icon icon="mdi:note" class="size-4 text-red-500" />
												<span class="text-red-800 dark:text-red-200">Footnotes for essential content</span>
											</div>
										</div>
									</div>

									<div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
										<p class="text-blue-900 dark:text-blue-100 text-sm">
											💡 For line breaks inside tables, simply press Enter.
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Section 3: Citations and References -->
				<div class="bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
					<button
						type="button"
						onclick={() => citationsExpanded = !citationsExpanded}
						class="w-full flex items-center justify-between p-6 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all duration-300 group"
					>
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center group-hover:bg-green-700 transition-colors shadow-sm">
								<span class="text-lg font-bold text-white">3</span>
							</div>
							<div class="text-left">
								<h4 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
									Citations and References
								</h4>
								<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
									Citation format and references section
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs font-medium px-3 py-1.5 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full border border-surface-200 dark:border-surface-600">
								{citationsExpanded ? 'Hide' : 'Show'}
							</span>
							<Icon
								icon={citationsExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								class="size-5 text-surface-500 dark:text-surface-400 transition-transform duration-300"
							/>
						</div>
					</button>

					{#if citationsExpanded}
						<div class="border-t border-surface-200 dark:border-surface-700 p-6 space-y-6">
							<div class="space-y-6">
								<div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
									<div class="flex items-start gap-3">
										<Icon icon="mdi:information-outline" class="size-5 text-orange-600 mt-0.5" />
										<p class="text-orange-900 dark:text-orange-100">
											Correct citation formatting is required for the parser to identify references.
										</p>
									</div>
								</div>

								<!-- 3.1 In-Text Citations -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-red-700 dark:text-red-300">3.1</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">In-Text Citations</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Use only numeric citations inside brackets:
									</p>

									<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600 mb-4">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Examples:</p>
										<div class="flex gap-3">
											<div class="flex-1 text-center p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-600">
												<span class="font-mono font-bold text-green-900 dark:text-green-100">[1]</span>
											</div>
											<div class="flex-1 text-center p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-600">
												<span class="font-mono font-bold text-green-900 dark:text-green-100">[2]</span>
											</div>
											<div class="flex-1 text-center p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-600">
												<span class="font-mono font-bold text-green-900 dark:text-green-100">[3]</span>
											</div>
										</div>
									</div>

									<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
										<p class="font-semibold text-green-900 dark:text-green-100 mb-2">Correct examples:</p>
										<div class="space-y-2">
											<p class="text-green-800 dark:text-green-200 font-mono bg-white dark:bg-surface-900 p-2 rounded border">
												Recent methods show better performance [4].
											</p>
											<p class="text-green-800 dark:text-green-200 font-mono bg-white dark:bg-surface-900 p-2 rounded border">
												Several studies [1][2][3] demonstrate this approach.
											</p>
											<p class="text-green-800 dark:text-green-200 font-mono bg-white dark:bg-surface-900 p-2 rounded border">
												Previous work [5] and recent research [6] support these findings.
											</p>
										</div>
									</div>

									<div class="mt-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
										<p class="font-semibold text-red-900 dark:text-red-100 mb-3">Do not use:</p>
										<div class="grid grid-cols-2 gap-3">
											<div class="p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600 text-center">
												<span class="text-red-700 dark:text-red-300">(Silva, 2020)</span>
											</div>
											<div class="p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600 text-center">
												<span class="text-red-700 dark:text-red-300">[1,2]</span>
											</div>
											<div class="p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600 text-center">
												<span class="text-red-700 dark:text-red-300">[1–3]</span>
											</div>
											<div class="p-3 bg-white dark:bg-surface-900 rounded border border-red-200 dark:border-red-600 text-center">
												<span class="text-red-700 dark:text-red-300">[A]</span>
											</div>
										</div>
										<p class="text-red-800 dark:text-red-200 mt-3 text-sm font-medium">
											Use only numeric citations in brackets. Multiple citations must be consecutive [1][2] in separate brackets.
										</p>
									</div>
								</div>

								<!-- 3.2 References Section -->
								<div class="bg-surface-50 dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
									<div class="flex items-center gap-3 mb-4">
										<div class="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-md flex items-center justify-center">
											<span class="text-xs font-bold text-blue-700 dark:text-blue-300">3.2</span>
										</div>
										<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">References Section</h5>
									</div>
									<p class="text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">
										Create a section titled exactly:
									</p>

									<div class="bg-red-100 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-lg p-6 text-center mb-4">
										<Icon icon="mdi:format-list-bulleted" class="size-10 text-red-600 mx-auto mb-3" />
										<span class="text-3xl font-bold text-red-900 dark:text-red-100">References</span>
										<p class="text-red-700 dark:text-red-300 text-sm mt-2">Use a Heading style (Heading 1)</p>
									</div>

									<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Formatting rules:</p>
										<div class="space-y-3">
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span class="text-surface-700 dark:text-surface-300">Use a numbered list format (1., 2., 3., etc.)</span>
											</div>
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span class="text-surface-700 dark:text-surface-300">Do not use tables to list references</span>
											</div>
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span class="text-surface-700 dark:text-surface-300">One reference per numbered item</span>
											</div>
											<div class="flex items-start gap-3">
												<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
												<span class="text-surface-700 dark:text-surface-300">Citations [n] must correspond to the reference number</span>
											</div>
										</div>
									</div>

									<div class="mt-4 bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
										<p class="font-semibold text-surface-900 dark:text-surface-100 mb-3">Example:</p>
										<div class="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-600">
											<ol class="list-decimal list-inside space-y-2 text-sm text-surface-700 dark:text-surface-300">
												<li>Author A. Title of the paper. Journal Name, Volume(Issue), Pages, Year.</li>
												<li>Author B, Author C. Another paper title. Conference Proceedings, Location, Year.</li>
												<li>Author D. Book title. Publisher, City, Year.</li>
											</ol>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Quick Reference Cards -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-700 rounded-xl p-6 border border-surface-200 dark:border-surface-600">
						<div class="flex items-center gap-3 mb-4">
							<div class="p-3 bg-green-600 rounded-xl">
								<Icon icon="mdi:format-list-bulleted" class="size-6 text-white" />
							</div>
							<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Lists</h5>
						</div>
						<p class="text-surface-700 dark:text-surface-300 text-sm leading-relaxed">
							Use recognizable list formats. Avoid mixing multiple list styles in the same block.
						</p>
					</div>

					<div class="bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-700 rounded-xl p-6 border border-surface-200 dark:border-surface-600">
						<div class="flex items-center gap-3 mb-4">
							<div class="p-3 bg-blue-600 rounded-xl">
								<Icon icon="mdi:table" class="size-6 text-white" />
							</div>
							<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Tables</h5>
						</div>
						<p class="text-surface-700 dark:text-surface-300 text-sm leading-relaxed">
							Use native Word tables. Avoid overly complex merged cells. Keep text clear and readable.
						</p>
					</div>

					<div class="bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-700 rounded-xl p-6 border border-surface-200 dark:border-surface-600">
						<div class="flex items-center gap-3 mb-4">
							<div class="p-3 bg-purple-600 rounded-xl">
								<Icon icon="mdi:image" class="size-6 text-white" />
							</div>
							<h5 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Images</h5>
						</div>
						<p class="text-surface-700 dark:text-surface-300 text-sm leading-relaxed">
							Insert directly into document. Use PNG/JPG formats. No external links.
						</p>
					</div>
				</div>

				<!-- Final Checklist -->
				<div class="bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
					<button
						type="button"
						onclick={() => checklistExpanded = !checklistExpanded}
						class="w-full flex items-center justify-between p-6 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all duration-300 group"
					>
						<div class="flex items-center gap-4">
							<div class="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-700 transition-colors shadow-sm">
								<Icon icon="mdi:clipboard-check" class="size-6 text-white" />
							</div>
							<div class="text-left">
								<h4 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
									Final Checklist
								</h4>
								<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
									Pre-submission validation checklist
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs font-medium px-3 py-1.5 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full border border-surface-200 dark:border-surface-600">
								{checklistExpanded ? 'Hide' : 'Show'}
							</span>
							<Icon
								icon={checklistExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								class="size-5 text-surface-500 dark:text-surface-400 transition-transform duration-300"
							/>
						</div>
					</button>

					{#if checklistExpanded}
						<div class="border-t border-surface-200 dark:border-surface-700 p-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">Titles use Heading 1–4 styles</span>
								</div>
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">Body text uses Normal style</span>
								</div>
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">Citations follow the [n] format</span>
								</div>
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">References section is correctly structured</span>
								</div>
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">Lists use recognizable formats</span>
								</div>
								<div class="flex items-start gap-3 p-4 bg-white dark:bg-surface-900 rounded-lg border border-primary-200 dark:border-primary-600">
									<Icon icon="mdi:check-circle" class="size-5 text-green-600 mt-0.5 flex-shrink-0" />
									<span class="text-primary-900 dark:text-primary-100 font-medium">Tables and images are inserted natively</span>
								</div>
							</div>

							<div class="mt-6 p-4 bg-primary-100 dark:bg-primary-900/30 rounded-lg border border-primary-300 dark:border-primary-600">
								<div class="flex items-center gap-3">
									<Icon icon="mdi:information" class="size-5 text-primary-700 dark:text-primary-300" />
									<div>
										<p class="font-semibold text-primary-900 dark:text-primary-100">Important Notes</p>
										<ul class="text-primary-800 dark:text-primary-200 text-sm mt-2 space-y-1">
											<li>• Maximum file size: <strong>25 MB</strong></li>
											<li>• Supported formats: <strong>.docx only</strong></li>
											<li>• Save your document as .docx before uploading</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>