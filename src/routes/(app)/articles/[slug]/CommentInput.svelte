<script>
	import { enhance } from '$app/forms';
	import { placeholder } from '$lib/constants';

	/** @type {{user: any}} */
	let { user } = $props();
</script>

<form use:enhance method="POST" action="?/createComment" class="card comment-form">
	<div class="card-block">
		<textarea class="form-control" name="comment" placeholder="Write a comment..." rows="3"></textarea>
	</div>

	<div class="card-footer">
		<img src={user.image || placeholder} class="comment-author-img" alt={user.username} />
		<button class="btn btn-sm btn-primary" type="submit">Post Comment</button>
	</div>
</form>