<script>
	import { enhance } from '$app/forms';

	//console.log('EH NOIX AQUI', article);
	/** @type {{paper: any, user: any}} */
	let { paper, user } = $props();
</script>

<div class="article-meta">
	<a href="/profile/@{paper.mainAuthor.name}">
		<img src={paper.mainAuthor.profilePicture} alt={paper.mainAuthor.name} />
	</a>

	<div class="info flex flex-col">
		<div class="text-xl">
			<a href="/profile/@{paper.mainAuthor.name}" class="mainAuthor">{paper.mainAuthor.name}</a>
		</div>
		<span class="date text-sm mb-4">
			{new Date(paper.createdAt).toDateString()}
		</span>
	</div>

	{#if paper.mainAuthor.name === user?.name}
		<span>
			<a href="/editor/{paper.slug}" class="btn btn-outline-secondary btn-sm">
				<i class="ion-edit"></i> Edit Article
			</a>

			<form use:enhance method="POST" action="?/deleteArticle">
				<button class="btn btn-outline-danger btn-sm">
					<i class="ion-trash-a"></i> Delete Article
				</button>
			</form>
		</span>
	{/if}
</div>
