import { error, json } from '@sveltejs/kit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function respond(body: any) {
	if (body.errors) {
		error(body.status, body);
	}

	// Se há um usuário, armazenar apenas os campos essenciais no cookie
	let cookieData = body;
	if (body.user) {
		// Extrair apenas os campos essenciais do usuário
		const essentialUserData = {
			id: body.user.id || body.user._id?.toString(),
			email: body.user.email,
			username: body.user.username,
			firstName: body.user.firstName,
			lastName: body.user.lastName,
			roles: body.user.roles,
			profilePictureUrl: body.user.profilePictureUrl,
			bio: body.user.bio,
			orcid: body.user.orcid
		};
		
		cookieData = {
			...body,
			user: essentialUserData
		};
	}

	const value = Buffer.from(JSON.stringify(cookieData)).toString('base64');

	return json(body, {
		headers: {
			'set-cookie': `jwt=${value}; Path=/; HttpOnly`
		}
	});
}