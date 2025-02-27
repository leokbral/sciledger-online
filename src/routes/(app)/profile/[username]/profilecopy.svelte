<script lang="ts">
	import { TabGroup, Tab, TabAnchor } from '@skeletonlabs/skeleton';
	import MyPapers from '$lib/MyPapers.svelte';
	import AuthorDashboard from '$lib/AuthorDashboard.svelte';
	import ReviewerDashboard from '$lib/ReviewDashboard.svelte';
	// import PaperPool from '$lib/PaperPool.svelte';
	import { userProfiles } from '../../UserProfile';
	import Icon from '@iconify/svelte';

	let tabSet: number = 0;
	let maxBioLength = 1000;
	let user = userProfiles[0];
	let isEditing = false;
	let editedBio = user.bio;
	let editedTitle = user.title;
	let editedInstitution = user.institution;
	let profilePicture = user.profilePicture;
	let imageSize = 100; // Tamanho inicial da imagem em pixels
	let imagePositionX = 0;
	let imagePositionY = 0;

	function toggleEdit() {
		isEditing = !isEditing;
		if (!isEditing) {
			// Reset edited values if cancelled
			editedBio = user.bio;
			editedTitle = user.title;
			editedInstitution = user.institution;
		}
	}

	function saveProfile() {
		user.bio = editedBio;
		user.title = editedTitle;
		user.institution = editedInstitution;
		user.profilePicture = profilePicture;
		isEditing = false;
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			const reader = new FileReader();
			reader.onload = () => {
				profilePicture = reader.result as string;
			};
			reader.readAsDataURL(files[0]);
		}
	}

	import ProfilePage from '$lib/Pages/Profile/ProfilePage.svelte';
	// import { scientificArticles } from '../../ScientificArticles';
	let tabs = [
		{
			name: 'Publications',
			icon: 'material-symbols-light:draft-outline-rounded'
		},
		{
			name: 'Interest Areas',
			icon: 'hugeicons:conversation'
		},
		{
			name: 'Contact Info',
			icon: 'material-symbols-light:rate-review-outline-rounded'
		}
	];

	// let publications = []//scientificArticles;
	let interestAreas = user.interestAreas; //['Biology', 'Physics', 'Technology'];
	let contacInfo = user.email;

	let tabsContent = [/* publications, */ interestAreas, contacInfo];

	let data = {
		tabs,
		tabsContent
	};
</script>

<!--<div class="m-auto max-w-[700px]">
	 <TabGroup justify="justify-center">
		<Tab bind:group={tabSet} name="tab1" value={0}>
			<span>Author</span>
		</Tab>
		<Tab bind:group={tabSet} name="tab2" value={1}>Reviewer</Tab>

		<! -- Tab Panels --- >
		<svelte:fragment slot="panel">
			{#if tabSet === 0}
				<div>
                    <div class="">
                        <AuthorDashboard></AuthorDashboard>
                    </div>
                    <div class="card p-4">
                        <div class="">
                            <button class='btn variant-filled-primary'>Novo artigo</button>
                        </div>
                        <div class="card">
                            <MyPapers></MyPapers>
                        </div>
                    </div>
                </div>
			{:else if tabSet === 1}
            <div class="">
                <ReviewerDashboard></ReviewerDashboard>
            </div>
            <div class="">
                <ArticlePool></ArticlePool>
            </div>
                <! -- <Old></Old> -- >
                
			{/if}
		</svelte:fragment>
	</TabGroup> 
</div>
-->

<section>
	<div class="p-6 mx-32 bg-surface-100-50-token min-h-screen">
		<!-- container page max-w-[700px] p-4 m-auto -->
		<div class="p-4 shadow rounded mb-6">
			<!-- Edit Button -->
			<div class="mt-4 flex justify-end">
				{#if isEditing}
					<button class="bg-surface-500 text-white p-2 rounded-full mr-2" on:click={toggleEdit}>
						Cancel
					</button>
					<button class="bg-primary-500 text-white p-2 rounded-full" on:click={saveProfile}>
						Save
					</button>
				{:else}
					<button
						class="bg-primary-500 text-white p-2 rounded-full flex items-center"
						on:click={toggleEdit}
					>
						Edit profile
						<!-- <Icon icon="material-symbols-light:edit-outline" class="ml-2" /> -->
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-4">
				<div class="relative w-36 h-36 mr-4">
					<img
						src={profilePicture}
						alt="Profile"
						class="rounded-full absolute"
						style="width: {imageSize}%; height: {imageSize}%; object-fit: cover; left: {imagePositionX}%; top: {imagePositionY}%;"
					/>

					<!-- {#if isEditing}
						<input type="file" accept="image/*" on:change={handleFileUpload} class="block mt-2" />
						<label class="block mb-2 text-lg font-semibold">Adjust Image Size:</label>
						<input type="range" min="50" max="150" bind:value={imageSize} class="block w-full mb-2" />
						<label class="block mb-2 text-lg font-semibold">Adjust Image Position X:</label>
						<input type="range" min="-50" max="50" bind:value={imagePositionX} class="block w-full mb-2" />
						<label class="block mb-2 text-lg font-semibold">Adjust Image Position Y:</label>
						<input type="range" min="-50" max="50" bind:value={imagePositionY} class="block w-full mb-2" />
					{/if} -->
				</div>

				<div>
					<div class="text-2xl font-bold">{user.name}</div>
					<div class="text-base font-semi-bold">@{user.id}</div>
					<div class="text-xl mt-4">
						{#if isEditing}
							<input
								type="text"
								bind:value={editedTitle}
								class="mt-2 p-2 text-surface-900 border rounded w-full"
							/>
							<input
								type="text"
								bind:value={editedInstitution}
								class="mt-2 p-2 text-surface-900 border rounded w-full"
							/>
						{:else}
							{user.title} at {user.institution}
						{/if}
					</div>
				</div>
				<div class="text-xl font-bold ml-44">Average Review (days)</div>
			</div>

			<div class="mx-4">
				<div class="flex gap-4">
					<div class="mt-4">
						<div class="text-l font">Following</div>
						<p class="mt-2"><strong>150</strong></p>
					</div>
					<div class="mt-4">
						<div class="text-l font">Followers</div>
						<p class="mt-2"><strong>1024</strong></p>
					</div>
				</div>

				<div class="mt-4">
					<h2 class="text-xl font-semibold">About</h2>
					{#if isEditing}
						<textarea
							class="mt-2 p-2 text-surface-900 border rounded w-full"
							bind:value={editedBio}
							maxlength={maxBioLength}
						></textarea>
						<p class="text-xs">{editedBio.length} / {maxBioLength} characters</p>
					{:else}
						<p class="mt-2">{user.bio}</p>
					{/if}
				</div>

				<div class="mt-4">
					<h2 class="text-xl font-semibold">Contact Information</h2>
					<p class="mt-2"><strong>Email:</strong> {user.email}</p>
				</div>

				<div class="mt-4">
					<h2 class="text-xl font-semibold">Interest Areas</h2>
					<ul class="list-disc list-inside mt-2">
						{#each user.interestAreas as area}
							<li>{area}</li>
						{/each}
					</ul>
				</div>

				<div class="mt-4">
					<h2 class="text-xl font-semibold">Publications</h2>
					<ul class="list-disc list-inside mt-2">
						<!-- Exemplo de publicações -->
						<li>Understanding the Universe: A Study of Astrophysics</li>
						<li>The Impact of Artificial Intelligence on Modern Science</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>
<ProfilePage {data}></ProfilePage>
<div class="m-auto max-w-[700px]">
	pagina de perfil do usuario
	<br />
	atualmente vem a partir dop click na imagem do user, dever ter um if q mostra coisas apenas se vc eh
	o dono da pagina<br />
	ver se parte do q esta aki hj fica no tooltip. uma ideia seria ter um campo (meu perfil q redireciona
	p ca e o log out no tooltip)
</div>
