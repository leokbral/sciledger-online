import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	redirect(302, `/publish/reviewer-assignment/${params.slug}`);
}