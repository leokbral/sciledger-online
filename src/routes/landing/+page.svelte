<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let heroVisible = $state(false);
	let featuresVisible = $state(false);
	let stepsVisible = $state(false);
	let teamVisible = $state(false);
	let statsVisible = $state(false);

	// Counter animation states
	let papers = $state(0);
	let reviewers = $state(0);
	let institutions = $state(0);
	let faster = $state(0);

	function animateCounter(target: number, setter: (val: number) => void, duration = 2000, suffix = '') {
		const start = 0;
		const increment = target / (duration / 16);
		let current = start;

		const timer = setInterval(() => {
			current += increment;
			if (current >= target) {
				setter(target);
				clearInterval(timer);
			} else {
				setter(Math.floor(current));
			}
		}, 16);
	}

	onMount(() => {
		heroVisible = true;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (entry.target.id === 'features') featuresVisible = true;
						if (entry.target.id === 'steps') stepsVisible = true;
						if (entry.target.id === 'team') teamVisible = true;
						if (entry.target.id === 'stats') {
							statsVisible = true;
							// Start counter animations
							animateCounter(1000, (val) => papers = val);
							animateCounter(500, (val) => reviewers = val);
							animateCounter(50, (val) => institutions = val);
							animateCounter(50, (val) => faster = val);
						}
					}
				});
			},
			{ threshold: 0.1 }
		);

		const featuresSection = document.getElementById('features');
		const stepsSection = document.getElementById('steps');
		const teamSection = document.getElementById('team');
		const statsSection = document.getElementById('stats');

		if (featuresSection) observer.observe(featuresSection);
		if (stepsSection) observer.observe(stepsSection);
		if (teamSection) observer.observe(teamSection);
		if (statsSection) observer.observe(statsSection);

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
	<section id="steps" class="py-32 px-6 bg-surface-50 relative overflow-hidden">
		<!-- Decorative line connecting steps -->
		<div class="absolute left-1/2 bottom-32 w-0.5 bg-gradient-to-b from-primary-200 via-primary-300 to-primary-200 hidden lg:block" style="transform: translateX(-50%); top: 280px;"></div>
		
		{#if stepsVisible}
		<div class="max-w-5xl mx-auto relative z-10" transition:fly={{ y: 50, duration: 600 }}>
			<h2
				class="text-center text-5xl md:text-6xl font-semibold mb-8 text-surface-900 tracking-tight"
			>
				How it works
			</h2>
			<p class="text-center text-xl text-surface-600 mb-24 max-w-2xl mx-auto">
				A streamlined four-phase process designed for speed and transparency
			</p>
			
			<div class="space-y-16">
				<!-- Step 1 -->
				<div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
					<div class="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-start">
						<div class="relative">
							<div class="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
								</svg>
							</div>
							<div class="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">01</div>
						</div>
					</div>
					<div class="flex-1 text-center lg:text-left bg-white p-8 rounded-2xl shadow-sm border border-surface-100 hover:shadow-md transition-shadow duration-300">
					<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Submit your paper</h3>
					<p class="text-xl text-surface-600 leading-relaxed">
						Upload your manuscript with a simple interface. DOCX format supported.
					</p>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12">
					<div class="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
						<div class="relative">
							<div class="w-24 h-24 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
								</svg>
							</div>
							<div class="absolute -top-2 -right-2 w-8 h-8 bg-secondary-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">02</div>
						</div>
					</div>
					<div class="flex-1 text-center lg:text-right bg-white p-8 rounded-2xl shadow-sm border border-surface-100 hover:shadow-md transition-shadow duration-300">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Peer review</h3>
						<p class="text-xl text-surface-600 leading-relaxed">
							Expert reviewers evaluate your work through our transparent four-phase process. Track progress in real-time.
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
					<div class="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-start">
						<div class="relative">
							<div class="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
								</svg>
							</div>
							<div class="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">03</div>
						</div>
					</div>
					<div class="flex-1 text-center lg:text-left bg-white p-8 rounded-2xl shadow-sm border border-surface-100 hover:shadow-md transition-shadow duration-300">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Revise and improve</h3>
						<p class="text-xl text-surface-600 leading-relaxed">
							Receive detailed feedback and make corrections with our integrated revision tools. Collaborate with reviewers effectively.
						</p>
					</div>
				</div>

				<!-- Step 4 -->
				<div class="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12">
					<div class="flex-shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
						<div class="relative">
							<div class="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
								</svg>
							</div>
							<div class="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">04</div>
						</div>
					</div>
					<div class="flex-1 text-center lg:text-right bg-white p-8 rounded-2xl shadow-sm border border-surface-100 hover:shadow-md transition-shadow duration-300">
						<h3 class="text-3xl mb-4 text-surface-900 font-semibold">Publish</h3>
						<p class="text-xl text-surface-600 leading-relaxed">
							Once approved, your research is published and accessible globally with blockchain-verified peer review records.
						</p>
					</div>
				</div>
			</div>
		</div>
		{/if}
	</section>

	<!-- Mission Section -->
	<section class="py-32 px-6 bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 text-white relative overflow-hidden">
		<!-- Decorative elements -->
		<div class="absolute inset-0 opacity-10">
			<div class="absolute top-20 left-10 w-72 h-72 bg-primary-400 rounded-full blur-3xl"></div>
			<div class="absolute bottom-20 right-10 w-96 h-96 bg-secondary-400 rounded-full blur-3xl"></div>
		</div>
		
		<div class="max-w-6xl mx-auto relative z-10">
			<div class="text-center mb-20">
				<h2 class="text-5xl md:text-6xl font-semibold mb-6 tracking-tight">
					Our Mission
				</h2>
				<p class="text-xl md:text-2xl text-surface-200 leading-relaxed max-w-4xl mx-auto">
					Revolutionizing scientific publishing by bringing transparency, speed, and trust to peer review.
				</p>
			</div>
			
			<div class="grid md:grid-cols-2 gap-8 mb-16">
				<div class="bg-white/5 backdrop-blur-sm p-10 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
					<div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-6">
						<svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
						</svg>
					</div>
					<h3 class="text-2xl font-semibold mb-4">The Problem</h3>
					<p class="text-lg text-surface-300 leading-relaxed">
						Traditional scientific publishing suffers from lengthy review times, lack of transparency, 
						and susceptibility to bias. Researchers wait months for feedback, and the peer review 
						process remains a black box, hindering scientific progress.
					</p>
				</div>
				
				<div class="bg-white/5 backdrop-blur-sm p-10 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300">
					<div class="w-12 h-12 bg-secondary-500/20 rounded-lg flex items-center justify-center mb-6">
						<svg class="w-6 h-6 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
						</svg>
					</div>
					<h3 class="text-2xl font-semibold mb-4">Our Solution</h3>
					<p class="text-lg text-surface-300 leading-relaxed">
						SciLedger leverages blockchain technology to create an immutable record of every review, 
						ensuring complete transparency. Our streamlined four-phase process accelerates publication 
						while maintaining rigorous quality standards.
					</p>
				</div>
			</div>

			<div class="bg-white/5 backdrop-blur-sm p-12 rounded-2xl border border-white/10">
				<h3 class="text-3xl font-semibold mb-12 text-center">Core Values</h3>
				<div class="grid md:grid-cols-3 gap-12">
					<div class="text-center group">
						<div class="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
							<svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
							</svg>
						</div>
						<h4 class="text-xl font-semibold mb-3">Transparency</h4>
						<p class="text-surface-300 leading-relaxed">
							Every step of the review process is visible and verifiable on the blockchain.
						</p>
					</div>
					<div class="text-center group">
						<div class="w-16 h-16 bg-secondary-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
							<svg class="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
							</svg>
						</div>
						<h4 class="text-xl font-semibold mb-3">Fairness</h4>
						<p class="text-surface-300 leading-relaxed">
							Unbiased review process with clear deadlines and accountability for all parties.
						</p>
					</div>
					<div class="text-center group">
						<div class="w-16 h-16 bg-accent-500/20 rounded-xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
							<svg class="w-8 h-8 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
							</svg>
						</div>
						<h4 class="text-xl font-semibold mb-3">Innovation</h4>
						<p class="text-surface-300 leading-relaxed">
							Pushing the boundaries of academic publishing with cutting-edge technology.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Team Section -->
	<section id="team" class="py-32 px-6 bg-white">
		{#if teamVisible}
		<div class="max-w-6xl mx-auto" transition:fly={{ y: 50, duration: 600 }}>
			<h2
				class="text-center text-5xl md:text-6xl font-semibold mb-8 text-surface-900 tracking-tight"
			>
				Meet the Team
			</h2>
			<p class="text-center text-xl text-surface-600 mb-20 max-w-3xl mx-auto leading-relaxed">
				A passionate team dedicated to transforming scientific publishing through technology and transparency.
			</p>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-3xl mx-auto">
				<!-- Team Member 1 -->
				<div class="text-center group">
					<div class="mb-6 relative inline-block">
						<div
							class="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-5xl font-semibold shadow-lg group-hover:scale-105 transition-transform duration-300"
						>
							LF
						</div>
					</div>
				<h3 class="text-2xl font-semibold text-surface-900 mb-2">Leonardo Ferreira</h3>
				<p class="text-primary-600 font-medium mb-3">Co-Founder & Lead Developer</p>
				<p class="text-surface-600 leading-relaxed">
					PhD student and full-stack developer specialized in blockchain and distributed systems.
				</p>
				</div>

				<!-- Team Member 2 -->
				<div class="text-center group">
					<div class="mb-6 relative inline-block">
						<div
							class="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-5xl font-semibold shadow-lg group-hover:scale-105 transition-transform duration-300"
						>
						TS
					</div>
				</div>
				<h3 class="text-2xl font-semibold text-surface-900 mb-2">Tetsu Sakamoto</h3>
				<p class="text-primary-600 font-medium mb-3">Co-Founder & Research Advisor</p>
				<p class="text-surface-600 leading-relaxed">
					PhD in Bioinformatics, professor at IMD-UFRN, specialized in software development and comparative genomics.
				</p>
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

	<!-- Impact Stats Section -->
	<section id="stats" class="py-24 px-6 bg-surface-900 text-white relative overflow-hidden">
		<!-- Decorative background -->
		<div class="absolute inset-0 opacity-5">
			<div class="absolute top-10 left-20 w-64 h-64 bg-primary-400 rounded-full blur-3xl"></div>
			<div class="absolute bottom-10 right-20 w-80 h-80 bg-secondary-400 rounded-full blur-3xl"></div>
		</div>

		{#if statsVisible}
		<div class="max-w-6xl mx-auto relative z-10" transition:fly={{ y: 50, duration: 600 }}>
			<h3 class="text-center text-3xl md:text-4xl font-semibold mb-4 tracking-tight">Making an Impact</h3>
			<p class="text-center text-surface-400 mb-16 text-lg">What we aim to achieve by the end of 2026</p>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-12">
				<div class="text-center group">
					<div class="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-primary-400/50 transition-all duration-300">
						<div class="text-5xl md:text-6xl font-bold mb-3 text-primary-400 tabular-nums">{papers.toLocaleString()}+</div>
						<p class="text-base md:text-lg text-surface-300">Papers published on the platform</p>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-secondary-400/50 transition-all duration-300">
						<div class="text-5xl md:text-6xl font-bold mb-3 text-secondary-400 tabular-nums">{reviewers.toLocaleString()}+</div>
						<p class="text-base md:text-lg text-surface-300">Connected active reviewers</p>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-accent-400/50 transition-all duration-300">
						<div class="text-5xl md:text-6xl font-bold mb-3 text-accent-400 tabular-nums">{institutions.toLocaleString()}+</div>
						<p class="text-base md:text-lg text-surface-300">Collaborating institutions</p>
					</div>
				</div>
				<div class="text-center group">
					<div class="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-primary-400/50 transition-all duration-300">
						<div class="text-5xl md:text-6xl font-bold mb-3 text-primary-400 tabular-nums">{faster}%+</div>
						<p class="text-base md:text-lg text-surface-300">Reduction in average review time</p>
					</div>
				</div>
			</div>
		</div>
		{/if}
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
