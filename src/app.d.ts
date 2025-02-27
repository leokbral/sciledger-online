// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	interface Locals {
		user: /* {name: string} */ import('$lib/types').User;
		token: import('$lib/types').Token;
		refreshToken: import('$lib/types').RefreshToken;
	}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}
