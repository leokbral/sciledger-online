import Notifications, { type INotification } from '$lib/db/models/Notification';
import Users from '$lib/db/models/User';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { LayoutServerLoad } from './$types';
import type { Notification } from '$lib/types/Notification'; // ajuste se necessário

await start_mongo();

export const load: LayoutServerLoad = async ({ locals }) => {
	const sessionUser = locals.user;

	if (!sessionUser) {
		return {
			user: sessionUser,
			notifications: []
		};
	}

	let user = sessionUser;
	try {
		const freshUser = await Users.findOne({ id: sessionUser.id })
			.select(
				'-password -refreshToken -resetPasswordToken -resetPasswordExpiry -orcidAccessToken -orcidRefreshToken'
			)
			.lean();

		if (freshUser) {
			user = {
				...sessionUser,
				...freshUser,
				id: freshUser.id || sessionUser.id
			};
		}
	} catch (error) {
		console.error('Erro ao sincronizar usuário do banco no layout:', error);
	}

	let notifications: Notification[] = [];

	try {
		const { aliases: userAliases } = await resolveUserIdentifiers(user);
		const notificationQueryIds = userAliases.length > 0 ? userAliases : [user.id];

		const rawNotifications = await Notifications.find({ user: { $in: notificationQueryIds } })
			.sort({ createdAt: -1 })
			.lean<INotification>()
			.exec();

		notifications = rawNotifications.map(
			(n): Notification => ({
				_id: String(n._id),
				id: n.id,
				user: typeof n.user === 'string' ? n.user : String(n.user?._id ?? ''),
				type: n.type,
				title: n.title,
				content: n.content,
				relatedUser: n.relatedUser,
				relatedPaperId: n.relatedPaperId,
				relatedCommentId: n.relatedCommentId,
				relatedHubId: n.relatedHubId,
				relatedReviewId: n.relatedReviewId,
				actionUrl: n.actionUrl,
				metadata: n.metadata,
				isRead: n.isRead,
				priority: n.priority,
				expiresAt: n.expiresAt,
				createdAt: n.createdAt,
				updatedAt: n.updatedAt,
				readAt: n.readAt
			})
		);
	} catch (error) {
		console.error('Erro ao buscar notificações:', error);
	}

	return {
		user: {
			_id: user.id,
			username: user.username,
			email: user.email,
			bio: user.bio,
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			country: user.country,
			dob: user.dob,
			darkMode: user.darkMode,
			roles: {
				author: user.roles?.author ?? false,
				reviewer: user.roles?.reviewer ?? false
			},
			profilePictureUrl: user.profilePictureUrl,
			institution: user.institution,
			position: user.position,
			performanceReviews: {
				averageReviewDays: user.performanceReviews?.averageReviewDays ?? null,
				recommendations: user.performanceReviews?.recommendations ?? null,
				responseTime: user.performanceReviews?.responseTime ?? null,
				expertise: user.performanceReviews?.expertise ?? null
			},
			connections: user.connections ?? [],
			followers: user.followers ?? [],
			following: user.following ?? [],
			papers: user.papers ?? [],
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		},
		notifications
	};
};
