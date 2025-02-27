<script lang="ts">
	import { Avatar, popup, type PopupSettings } from '@skeletonlabs/skeleton';
	import { post } from './utils';
	import { invalidateAll } from '$app/navigation';
	import { userProfiles } from '../routes/(app)/UserProfile';
	import type { User } from './types/User';
	import { getInitials } from './utils/GetInitials';

	export let pathname: string;
	export let user: User;
	//console.log("nav 9 - ", user);

	const popupFeatured: PopupSettings = {
		// Represents the type of event that opens/closed the popup
		event: 'click',
		// Matches the data-popup value on your popup element
		target: 'popupFeatured',
		// Defines which side of your trigger the popup will appear
		placement: 'bottom',
		middleware: { offset: { mainAxis: 10, crossAxis: -100 } }
	};
	async function logout() {
		await post(`/logout`);
		invalidateAll();
	}

	function removeSpaces(str: string): string {
		return str.replace(/\s+/g, '');
	}

	// // Função para obter as iniciais do primeiro e do último nome
	// function getInitials(firstName: string, lastName: string): string {
	// 	const firstInitial = firstName.charAt(0).toUpperCase();
	// 	const lastInitial = lastName.charAt(0).toUpperCase();
	// 	return `${firstInitial}${lastInitial}`;
	// }

	// Função para retornar a contagem de elementos ou 0 se o valor não for um array
	function getCount(value: string[] | undefined): number {
		return Array.isArray(value) ? value.length : 0;
	}
</script>

{#if user}
	<!-- <a href="/profile/@{user.username}"> -->
	<button class="btn pl-12 !-ml-7" use:popup={popupFeatured}>
		<!-- <Avatar src={user.profilePictureUrl} alt={user.firstName} width="w-9" /> -->
		{#if user.profilePictureUrl}
			<Avatar src={user.profilePictureUrl} alt={user.firstName} width="w-9" />
		{:else}
			<div class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full">
				<span class="text-xl font-bold">{getInitials(user.firstName, user.lastName)}</span>
			</div>
		{/if}
	</button>
	<!-- Div do tooltip -->
	<div class="card p-4 w-72 shadow-xl variant-filled" data-popup="popupFeatured">
		<div class="space-y-4 flex flex-col">
			<div class="flex gap-2">
				<!-- <Avatar src={user.profilePictureUrl} alt={user.firstName} width="w-14" /> -->
				{#if user.profilePictureUrl}
					<Avatar src={user.profilePictureUrl} alt={user.firstName} width="w-9" />
				{:else}
					<div class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full">
						<span class="text-xl font-bold">{getInitials(user.firstName, user.lastName)}</span>
					</div>
				{/if}

				<div>
					<p class="font-bold">{`${user.firstName} ${user.lastName}`}</p>
					<p class="opacity-50">{user.username}</p>
				</div>
			</div>
			<p>{user.position} at {user.institution}</p>
			<div class="flex gap-4">
				<small><strong>{user?.following.length || 0}</strong> <span class="opacity-50">Following</span></small>
				<small><strong>{user?.followers.length || 0}</strong> <span class="opacity-50">Followers</span></small>
			</div>
			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M5 18.77v-1h1.616V9.845q0-1.96 1.24-3.447T11 4.546V4q0-.417.291-.708q.291-.292.707-.292t.709.292T13 4v.546q1.904.365 3.144 1.853t1.24 3.447v7.923H19v1zm6.997 2.615q-.668 0-1.14-.475t-.472-1.14h3.23q0 .67-.475 1.142q-.476.472-1.143.472M7.616 17.77h8.769V9.846q0-1.823-1.281-3.104T12 5.462t-3.104 1.28t-1.28 3.104z"
						/>
					</svg>
					Notifications
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						<! -- {notifications} -- >1
					</span>
				</p>
				<! -- <p class="text-ls">{notifications}</p> -- >
			</div> -->
			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<g fill="none" stroke="currentColor">
							<rect width="16" height="12" x="4" y="6" rx="2" />
							<path d="m4 9l7.106 3.553a2 2 0 0 0 1.788 0L20 9" />
						</g>
					</svg>
					Messages
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						<! -- {messages} -- >2
					</span>
				</p>
				<! -- <p class="text-ls">{messages}</p> -- >
			</div> -->
			<a
				data-sveltekit-reload
				class="btn bg-primary-500 w-full"
				href={`/profile/${user.username}`}
				target=""
				rel="noreferrer"
			>
				Profile
			</a>
			<a data-sveltekit-reload href="/profile/{user.username}">Profile</a>
			<button class="btn variant-filled justify-start" on:click={logout}>Sign out</button>
		</div>
		<div class="arrow variant-filled"></div>
	</div>
	<!-- </a> -->
{:else}
	<a href="/login" class="nav-link" class:active={pathname === '/login'}> Sign in </a>
	<a href="/register" class="nav-link" class:active={pathname === '/register'}> Sign up </a>
{/if}
