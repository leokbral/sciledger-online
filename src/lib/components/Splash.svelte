<div class="splash-screen fixed inset-0 z-50 flex items-center justify-center bg-surface-50">
	<div class="ledger-grid" aria-hidden="true">
		<span></span>
		<span></span>
		<span></span>
		<span></span>
	</div>

	<div class="relative flex flex-col items-center gap-5">
		<div class="logo-shell">
			<img src="/favicon.png" alt="SciLedger" class="logo-mark" />
		</div>
		<div class="text-center">
			<p class="text-2xl font-semibold text-surface-900">SciLedger</p>
			<p class="mt-1 text-sm font-medium text-surface-500">Open science publishing</p>
		</div>
		<div class="progress-bar" aria-hidden="true"></div>
	</div>
</div>

<style>
	.ledger-grid {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background:
			linear-gradient(90deg, rgba(20, 184, 166, 0.08) 1px, transparent 1px),
			linear-gradient(rgba(14, 165, 233, 0.08) 1px, transparent 1px);
		background-size: 72px 72px;
	}

	.ledger-grid span {
		position: absolute;
		width: min(52vw, 520px);
		height: 1px;
		left: 50%;
		background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.55), transparent);
		animation: ledger-line 1.8s ease-in-out infinite;
	}

	.ledger-grid span:nth-child(1) {
		top: 28%;
		animation-delay: 0s;
	}

	.ledger-grid span:nth-child(2) {
		top: 42%;
		animation-delay: 0.25s;
	}

	.ledger-grid span:nth-child(3) {
		top: 58%;
		animation-delay: 0.5s;
	}

	.ledger-grid span:nth-child(4) {
		top: 72%;
		animation-delay: 0.75s;
	}

	.logo-shell {
		display: grid;
		width: 8rem;
		height: 8rem;
		place-items: center;
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 1.5rem;
		background: rgba(255, 255, 255, 0.88);
		box-shadow: 0 24px 70px rgba(15, 23, 42, 0.16);
		animation: breathe 1.7s ease-in-out infinite;
	}

	.logo-mark {
		width: 5.5rem;
		height: 5.5rem;
		object-fit: contain;
	}

	.progress-bar {
		width: 11rem;
		height: 0.25rem;
		overflow: hidden;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.1);
	}

	.progress-bar::after {
		display: block;
		width: 45%;
		height: 100%;
		border-radius: inherit;
		background: #14b8a6;
		content: '';
		animation: loading-bar 1.2s ease-in-out infinite;
	}

	@keyframes breathe {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.04);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes ledger-line {
		0% {
			transform: translateX(-120%) scaleX(0.5);
			opacity: 0;
		}
		35% {
			opacity: 1;
		}
		100% {
			transform: translateX(20%) scaleX(1);
			opacity: 0;
		}
	}

	@keyframes loading-bar {
		0% {
			transform: translateX(-110%);
		}
		100% {
			transform: translateX(250%);
		}
	}
</style>
