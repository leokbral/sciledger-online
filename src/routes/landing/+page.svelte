<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let heroVisible = $state(false);
	let featuresVisible = $state(false);
	let stepsVisible = $state(false);

	onMount(() => {
		heroVisible = true;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (entry.target.id === 'features') featuresVisible = true;
						if (entry.target.id === 'steps') stepsVisible = true;
					}
				});
			},
			{ threshold: 0.1 }
		);

		const featuresSection = document.getElementById('features');
		const stepsSection = document.getElementById('steps');

		if (featuresSection) observer.observe(featuresSection);
		if (stepsSection) observer.observe(stepsSection);

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>SciLedger - Revolutionary Scientific Publishing Platform</title>
	<meta
		name="description"
		content="Transform scientific publishing with blockchain-verified peer review and transparent research collaboration."
	/>
</svelte:head>

<div data-theme="sciLedger" class="bg-white">
	<!-- Hero Section -->
	<section class="min-h-screen flex items-center justify-center px-6 py-32">
		{#if heroVisible}
		<div class="max-w-6xl mx-auto text-center" transition:fade={{ duration: 800 }}>
			<div class="flex justify-center mb-8">
				<img src="/favicon.png" alt="SciLedger Logo" class="w-48 h-48 sm:w-64 sm:h-64" />
			</div>
			<h1
				class="text-6xl sm:text-7xl md:text-8xl font-semibold text-surface-900 mb-6 tracking-tight leading-[1.05]"
			>
				The future of<br />scientific publishing.
			</h1>
			<p
				class="text-2xl sm:text-3xl text-surface-600 mb-12 font-normal max-w-3xl mx-auto leading-snug"
			>
				Transparent peer review. Powered by blockchain.
			</p>
			<div class="flex gap-6 justify-center flex-wrap mb-24">
				<button
					class="bg-primary-600 text-white px-6 py-2 text-lg font-normal rounded-full hover:bg-primary-700 transition-colors duration-200"
					onclick={() => goto('/register')}
				>
					Get started
				</button>
				<button
					onclick={() => goto('/login')}
					class="bg-white text-primary-600 px-6 py-2 text-lg font-normal rounded-full border border-primary-600 hover:bg-primary-600 hover:border-primary-600 transition-all duration-200 relative overflow-hidden"
					style="--hover-text:white;"
					onmouseover={(e) => (e.currentTarget.style.color = 'white')}
					onmouseout={(e) => (e.currentTarget.style.color = '')}
					onfocus={(e) => (e.currentTarget.style.color = 'white')}
					onblur={(e) => (e.currentTarget.style.color = '')}
				>
					Sign in →
				</button>
			</div>
		</div>
		{/if}
	</section>

	<!-- Features Section -->
	<section id="features" class="py-32 px-6">
		{#if featuresVisible}
		<div class="max-w-6xl mx-auto" transition:fly={{ y: 50, duration: 600 }}>
			<h2
				class="text-center text-5xl md:text-6xl font-semibold mb-24 text-surface-900 tracking-tight"
			>
				Why SciLedger
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-16">
				<div class="text-center">
					<div class="text-5xl mb-6">🔒</div>
					<h3 class="text-2xl mb-4 text-surface-900 font-semibold">Blockchain Verified</h3>
					<p class="text-lg text-surface-600 leading-relaxed">
						Every review recorded on blockchain, ensuring transparency and preventing manipulation.
					</p>
				</div>
				<div class="text-center">
					<div class="text-5xl mb-6">⚡</div>
					<h3 class="text-2xl mb-4 text-surface-900 font-semibold">Fast Review</h3>
					<p class="text-lg text-surface-600 leading-relaxed">
						Streamlined process with automated notifications and deadline tracking.
					</p>
				</div>
				<div class="text-center">
					<div class="text-5xl mb-6">🌐</div>
					<h3 class="text-2xl mb-4 text-surface-900 font-semibold">Global Network</h3>
					<p class="text-lg text-surface-600 leading-relaxed">
						Connect with researchers worldwide across all scientific disciplines.
					</p>
				</div>
			</div>
		</div>
		{/if}
	</section>

	<!-- How It Works Section -->
	<section id="steps" class="py-32 px-6 bg-surface-50">
		{#if stepsVisible}
		<div class="max-w-5xl mx-auto" transition:fly={{ y: 50, duration: 600 }}>
			<h2
				class="text-center text-5xl md:text-6xl font-semibold mb-24 text-surface-900 tracking-tight"
			>
				How it works
			</h2>
			<div class="space-y-20">
				<div class="flex items-start gap-8">
					<div class="text-6xl font-light text-surface-300 flex-shrink-0">01</div>
					<div class="pt-2">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Submit your paper</h3>
						<p class="text-xl text-surface-600 leading-relaxed max-w-2xl">
							Upload your manuscript with a simple interface. Multiple formats supported.
						</p>
					</div>
				</div>
				<div class="flex items-start gap-8">
					<div class="text-6xl font-light text-surface-300 flex-shrink-0">02</div>
					<div class="pt-2">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Peer review</h3>
						<p class="text-xl text-surface-600 leading-relaxed max-w-2xl">
							Expert reviewers evaluate your work through a transparent four-phase process.
						</p>
					</div>
				</div>
				<div class="flex items-start gap-8">
					<div class="text-6xl font-light text-surface-300 flex-shrink-0">03</div>
					<div class="pt-2">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Revise and improve</h3>
						<p class="text-xl text-surface-600 leading-relaxed max-w-2xl">
							Receive detailed feedback and make corrections with integrated revision tools.
						</p>
					</div>
				</div>
				<div class="flex items-start gap-8">
					<div class="text-6xl font-light text-surface-300 flex-shrink-0">04</div>
					<div class="pt-2">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Publish</h3>
						<p class="text-xl text-surface-600 leading-relaxed max-w-2xl">
							Once approved, your research is published and accessible globally.
						</p>
					</div>
				</div>
			</div>
		</div>
		{/if}
	</section>

	<!-- CTA Section -->
	<section class="py-40 px-6">
		<div class="max-w-4xl mx-auto text-center">
			<h2 class="text-5xl md:text-6xl font-semibold mb-6 text-surface-900 tracking-tight">
				Ready to get started?
			</h2>
			<p class="text-2xl text-surface-600 mb-12">Join thousands of researchers using SciLedger.</p>
			<button
				class="bg-primary-600 text-white px-10 py-5 text-xl font-medium rounded-full hover:bg-primary-700 transition-colors duration-200"
				onclick={() => goto('/register')}
			>
				Create your account
			</button>
		</div>
	</section>

	<!-- University Partnership Section -->
	<section class="bg-primary-600 text-white">
		<div class="py-32 px-6 max-w-4xl mx-auto text-center">
			<p class="text-sm opacity-70 mb-5 tracking-wide font-light">Developed in partnership with</p>
			<h3 class="text-3xl font-semibold mb-4 tracking-tight">
				Federal University of Rio Grande do Norte
			</h3>
			<p class="text-lg opacity-85 max-w-2xl mx-auto leading-relaxed font-light">
				SciLedger is powered by the infrastructure and collaborative expertise of UFRN researchers 
				and developers in Brazil, advancing open science and transparent peer review.
			</p>
		</div>
	</section>

	<!-- Badges Section -->
	<section class="bg-white">
		<div class="py-12 px-6">
			<div class="max-w-7xl mx-auto">
				<p class="text-xs text-surface-400 mb-10 tracking-[0.25em] font-light text-center">TRUSTED BY</p>
				<div class="flex flex-col md:flex-row items-center justify-around gap-16 md:gap-8">
					<!-- IMD Logo -->
					<div class="flex flex-col items-center gap-5">
						<div class="w-40 h-40 flex items-center justify-center">
							<img src="/imd-logo.svg" alt="IMD" class="w-full h-full object-contain" />
						</div>
						<span class="text-xs text-surface-600 leading-relaxed">Instituto Metrópole Digital</span>
					</div>
					
					<!-- UFRN Logo -->
					<div class="flex flex-col items-center gap-5">
						<div class="w-40 h-40 flex items-center justify-center">
							<img src="/ufrn-logo.png" alt="UFRN" class="w-full h-full object-contain" />
						</div>
						<span class="text-xs text-surface-600 leading-relaxed text-center">Federal University of <br/>Rio Grande do Norte</span>
					</div>
					
					<!-- Decola RN Logo -->
					<div class="flex flex-col items-center gap-5">
						<div class="w-40 h-40 flex items-center justify-center">
							<img src="/decolaRN-logo.png" alt="Decola RN" class="w-full h-full object-contain" />
						</div>
						<span class="text-xs text-surface-600 leading-relaxed text-center">Winner - Decola RN <br/>powered by Inovativa</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-surface-200 bg-surface-50 py-16 px-6">
		<div class="max-w-6xl mx-auto">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
				<div>
					<h4 class="text-sm font-semibold mb-4 text-surface-900">Platform</h4>
					<ul class="space-y-3">
						<li>
							<a
								href="/hub"
								class="text-sm text-surface-600 hover:text-surface-900 transition-colors"
								>Browse Papers</a
							>
						</li>
						<li>
							<a
								href="/publish"
								class="text-sm text-surface-600 hover:text-surface-900 transition-colors"
								>Submit Paper</a
							>
						</li>
						<li>
							<a
								href="/register"
								class="text-sm text-surface-600 hover:text-surface-900 transition-colors"
								>Become Reviewer</a
							>
						</li>
					</ul>
				</div>
				<div>
					<h4 class="text-sm font-semibold mb-4 text-surface-900">Resources</h4>
					<ul class="space-y-3">
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">Documentation</span>
							<!-- <a href="/docs" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">Documentation</a> -->
						</li>
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">Help Center</span>
							<!-- <a href="/help" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">Help Center</a> -->
						</li>
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">API</span>
							<!-- <a href="/api" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">API</a> -->
						</li>
					</ul>
				</div>
				<div>
					<h4 class="text-sm font-semibold mb-4 text-surface-900">Company</h4>
					<ul class="space-y-3">
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">About</span>
							<!-- <a href="/about" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">About</a> -->
						</li>
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">Contact</span>
							<!-- <a href="/contact" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">Contact</a> -->
						</li>
					</ul>
				</div>
				<div>
					<h4 class="text-sm font-semibold mb-4 text-surface-900">Legal</h4>
					<ul class="space-y-3">
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">Privacy</span>
							<!-- <a href="/privacy" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">Privacy</a> -->
						</li>
						<li>
							<span class="text-sm text-surface-600 cursor-not-allowed">Terms</span>
							<!-- <a href="/terms" class="text-sm text-surface-600 hover:text-surface-900 transition-colors">Terms</a> -->
						</li>
					</ul>
				</div>
			</div>
			<div class="pt-8 border-t border-surface-200 text-center">
				<p class="text-sm text-surface-600">&copy; 2025 SciLedger. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>
