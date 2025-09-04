import Notifications, { type INotification } from '$lib/db/models/Notification'; 
import { start_mongo } from '$lib/db/mongooseConnection';
import type { LayoutServerLoad } from './$types';
import type { Notification } from '$lib/types/Notification'; // ajuste se necessário

await start_mongo();

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return {
			user: user,
			notifications: []
		};
	}

	let notifications: Notification[] = [];

	try {
		const rawNotifications = await Notifications.find({ user: user._id })
			.sort({ createdAt: -1 })
			.lean<INotification>()
			.exec();

		notifications = rawNotifications.map((n): Notification => ({
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
		}));
	} catch (error) {
		console.error('Erro ao buscar notificações:', error);
	}

	return {
		user: {
			_id: user._id,
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
				reviewer: user.roles?.reviewer ?? false,
			},
			profilePictureUrl: user.profilePictureUrl,
			institution: user.institution,
			position: user.position,
			performanceReviews: {
				averageReviewDays: user.performanceReviews?.averageReviewDays ?? null,
				recommendations: user.performanceReviews?.recommendations ?? null,
				responseTime: user.performanceReviews?.responseTime ?? null,
				expertise: user.performanceReviews?.expertise ?? null,
			},
			connections: user.connections ?? [],
			followers: user.followers ?? [],
			following: user.following ?? [],
			papers: user.papers ?? [],
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
		notifications
	};
};
