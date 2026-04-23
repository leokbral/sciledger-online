import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import Invitations from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';

interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

function getIdAliases(value: unknown): string[] {
	if (!value) return [];

	if (typeof value === 'string') {
		return [String(value)];
	}

	if (typeof value !== 'object') {
		return [];
	}

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};

	const aliases = [candidate.id, candidate._id]
		.filter(Boolean)
		.map((alias) => String(alias));

	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases));
}

function matchesUser(value: unknown, userId: string): boolean {
	return getIdAliases(value).includes(String(userId));
}

function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}

	if (obj && typeof obj === 'object') {
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}

		if (obj instanceof Date) {
			return obj.toISOString();
		}

		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}

	return obj;
}

export async function load({ locals }) {
	try {
		const user = locals.user;
		if (!user) throw redirect(302, '/login');

		await start_mongo();

		const fetchUsers = async () => {
			return await Users.find({}, {}).lean().exec();
		};

		const fetchPapers = async () => {
			const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
			const acceptedReviews = await ReviewQueue.find({
				reviewer: user.id,
				status: 'accepted'
			})
				.lean()
				.exec();

			const acceptedPaperIds = acceptedReviews.map((review) => review.paperId);

			const papersRaw = await Papers.find({}, {})
				.populate('mainAuthor')
				.populate('coAuthors')
				.populate('correspondingAuthor')
				.populate('hubId')
				.lean()
				.exec();

			const normalizedPapers = papersRaw.map((paper: any) => {
				const peer_review = paper.peer_review
					? {
							reviewType: paper.peer_review.reviewType,
							assignedReviewers: paper.peer_review.assignedReviewers ?? [],
							responses: (paper.peer_review.responses ?? []).map((response: any) => ({
								reviewerId: response.reviewerId,
								status: response.status,
								responseDate: response.responseDate,
								_id: response._id?.toString?.()
							})),
							reviews: paper.peer_review.reviews ?? [],
							averageScore: paper.peer_review.averageScore ?? 0,
							reviewCount: paper.peer_review.reviewCount ?? 0,
							reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
						}
					: {
							reviewType: 'open',
							assignedReviewers: [],
							responses: [],
							reviews: [],
							averageScore: 0,
							reviewCount: 0,
							reviewStatus: 'not_started'
						};

				const hasAcceptedResponse = (peer_review.responses ?? []).some((response: any) => {
					return (
						matchesUser(response?.reviewerId, user.id) &&
						(response?.status === 'accepted' || response?.status === 'completed')
					);
				});

				return {
					...paper,
					peer_review,
					isAcceptedForReview: acceptedPaperIds.includes(paper.id) || hasAcceptedResponse
				};
			});

			const filteredPapers = normalizedPapers.filter((paper: any) => {
				try {
					const userId = user.id;
					const responses = paper.peer_review?.responses ?? [];
					const acceptedOrCompleted = responses.filter(
						(response: any) =>
							response.status === 'accepted' || response.status === 'completed'
					);

					const isMainAuthor = matchesUser(paper.mainAuthor, userId);
					const isCorrespondingAuthor = matchesUser(paper.correspondingAuthor, userId);
					const isSubmitter = matchesUser(paper.submittedBy, userId);
					const isCoAuthor = (paper.coAuthors ?? []).some((author: any) =>
						matchesUser(author, userId)
					);
					const isPaperAuthor =
						isMainAuthor || isCorrespondingAuthor || isSubmitter || isCoAuthor;

					const isHubOwner = matchesUser(paper.hubId?.createdBy, userId);
					const isHubReviewer =
						typeof paper.hubId === 'object' &&
						Array.isArray(paper.hubId?.reviewers) &&
						paper.hubId.reviewers.some((reviewer: any) => matchesUser(reviewer, userId));

					const isReviewer = acceptedOrCompleted.some((response: any) =>
						matchesUser(response.reviewerId, userId)
					);
					const hasAcceptedReview = paper.isAcceptedForReview === true;
					const hasCompleted = responses.some(
						(response: any) =>
							matchesUser(response.reviewerId, userId) && response.status === 'completed'
					);

					if (paper.status === 'in review' || paper.status === 'needing corrections') {
						return isReviewer || isHubReviewer || isHubOwner || hasAcceptedReview;
					}

					if (paper.status === 'published') {
						return hasCompleted;
					}

					if (paper.status === 'reviewer assignment') {
						return (
							!isPaperAuthor &&
							(acceptedOrCompleted.length < 3 ||
								isReviewer ||
								isHubReviewer ||
								isHubOwner ||
								hasAcceptedReview)
						);
					}

					return false;
				} catch (err) {
					console.error('Error filtering paper:', paper?._id, err);
					return false;
				}
			});

			return filteredPapers.map(sanitizePaper);
		};

		const fetchReviews = async (reviewerId: string) => {
			return await Reviews.find({ reviewer: reviewerId }).lean().exec();
		};

		const fetchReviewInvitation = async (reviewerId: string) => {
			const invitations = await Invitations.find({ reviewer: reviewerId }).lean().exec();
			console.log('Invitations5:', invitations);
			return invitations;
		};

		const fetchReviewerAssignments = async (reviewerId: string) => {
			const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
			const assignments = await ReviewAssignment.find({
				reviewerId,
				status: { $in: ['accepted', 'pending'] }
			})
				.lean()
				.exec();

			console.log(`Found ${assignments.length} ReviewAssignments for reviewer ${reviewerId}`);

			return assignments.map((assignment: any) => ({
				_id: assignment._id,
				id: assignment.id,
				paperId: assignment.paperId,
				reviewerId: assignment.reviewerId,
				status: assignment.status,
				deadline: assignment.deadline,
				hubId: assignment.hubId,
				assignedAt: assignment.assignedAt,
				acceptedAt: assignment.acceptedAt,
				updatedAt: assignment.updatedAt
			}));
		};

		return {
			users: sanitize(await fetchUsers()),
			papers: sanitize(await fetchPapers()),
			reviews: sanitize(await fetchReviews(user.id)),
			user: sanitize(user),
			reviewerInvitations: sanitize(await fetchReviewInvitation(user.id)),
			reviewAssignments: sanitize(await fetchReviewerAssignments(user.id))
		};
	} catch (err) {
		console.error('Error loading review page:', err);
		throw err;
	}
}
