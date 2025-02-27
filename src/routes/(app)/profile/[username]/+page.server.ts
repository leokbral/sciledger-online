import { redirect } from '@sveltejs/kit';
import Users from '$lib/db/models/User';
import '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongo';

// function findUser(id: string) {
//     return userProfiles.find((a: { id: string; }) => a.id === (id).replace(/\s+/g, ''))
// }
await start_mongo(); // Não necessário mais

export async function load({ locals, params }) {

    const user = locals.user;
    if (!user) { redirect(302, '/login') }
    
    const fetchUser = async () => {
		const user = await Users.findOne({username: params.username}, { _id: 0 }).populate("papers").lean().exec();
		//console.log(user)
		return user;
	};
	//console.log("chamou kkk", userCount);
	return {
		user: await fetchUser(),
		loggedUser: user
	};
}