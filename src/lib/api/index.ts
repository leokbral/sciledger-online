import SERVER from '$lib/Pages/config';
const base = SERVER;
//const base = 'https://conduit.productionready.io/api';

interface SendOptions {
	method: string;
	path: string;
	data?: unknown;
	token?: string;
}

async function send(sendParams: SendOptions) {
	const { method, path, data, token } = sendParams;
	/* const headers: unknown = {}; */

	const headers: { [key: string]: string } = {};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const opts: { [key: string]: any } = { method, headers /* {} as Headers */ };

	/*
		//console.log("chamou send api")
		console.log("method", method)
		console.log("path", path)
		console.log( "data", data)
		console.log( "token", token) 
	*/

	if (data) {
		opts.headers['Content-Type'] = 'application/json';
		//opts.headers.set('Content-Type', 'application/json');

		opts.body = JSON.stringify(data);
		//console.log('chegou server', opts)
	}

	if (token) {
		//opts.headers.set('Authorization', `Bearen ${token}`);
		opts.headers['Authorization'] = `Bearen ${token}`;
	}

	//console.log('sdwd', sendParams, `${base}/${path}`);
	return await fetch(`${base}/${path}`, opts)
		.then((r) => r.text())
		.then((json) => {
			try {
				return JSON.parse(json);
			} catch (err) {
				return json;
			}
		});
}

export const get = (path: string, token: string, data?: unknown) => {
	return send({ method: 'GET', path, token, data });
};

export function del(path: string, token: string, data: unknown) {
	return send({ method: 'DELETE', path, token, data });
}

export const post = (path: string, data?: unknown, token?: string) => {
	return send({ method: 'Post', path, token, data });
};

export function put(path: string, data: unknown, token: string) {
	return send({ method: 'PUT', path, data, token });
}