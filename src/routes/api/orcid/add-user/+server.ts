import { json } from '@sveltejs/kit';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { start_mongo } from '$lib/db/mongooseConnection';

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function POST({ request }) {
    try {
        await start_mongo();
        
        const { orcidProfile, email } = await request.json();
        
        if (!orcidProfile) {
            return json({ error: 'ORCID profile is required' }, { status: 400 });
        }

        // Extract data from ORCID profile
        const name = orcidProfile?.person?.name;
        const biography = orcidProfile?.person?.biography?.content;
        const orcidId = orcidProfile?.['orcid-identifier']?.path;
        const affiliations = orcidProfile?.['activities-summary']?.employments?.['affiliation-group'] ?? [];
        const country = orcidProfile?.person?.addresses?.address?.[0]?.country?.value;
        const emails = orcidProfile?.person?.emails?.email ?? [];
        const primaryEmail = emails.find((email: unknown) => {
            if (typeof email === 'object' && email !== null && 'primary' in email) {
                return (email as { primary: boolean }).primary;
            }
            return false;
        })?.email || emails[0]?.email;
        const mainAffiliation = affiliations?.[0]?.['summaries']?.[0]?.['employment-summary'];

        // Use provided email or primary email from ORCID
        const userEmail = email || primaryEmail;
        
        if (!userEmail) {
            return json({ error: 'Email is required for user creation' }, { status: 400 });
        }

        // Prepare firstName for user existence check
        const firstName = name?.['given-names']?.value || 'Unknown';

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: userEmail },
                { username: "@" + firstName + "-" + orcidId}
            ]
        });

        if (existingUser) {
            return json({ 
                error: 'User already exists',
                user: existingUser 
            }, { status: 409 });
        }

        // Generate user data following UserSchema
        const userId = crypto.randomUUID();
        const lastName = name?.['family-name']?.value || 'User';
        const username = "@" + firstName + "-" + orcidId || `orcid_${crypto.randomUUID().substring(0, 8)}`;
        
        // Generate a temporary password (user will need to reset it)
        const tempPassword = crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const userData = {
            _id: userId,
            id: userId,
            firstName,
            lastName,
            country: country || 'Unknown',
            dob: '1900-01-01', // Default DOB since ORCID doesn't provide this
            username,
            email: userEmail,
            password: hashedPassword,
            refreshToken: null,
            darkMode: false,
            roles: {
                author: true,
                reviewer: false
            },
            bio: biography || '',
            profilePictureUrl: '',
            institution: mainAffiliation?.organization?.name || '',
            position: mainAffiliation?.['role-title'] || '',
            performanceReviews: {
                averageReviewDays: 0,
                recommendations: [],
                responseTime: 0,
                expertise: []
            },
            connections: [],
            followers: [],
            following: [],
            papers: [],
            hubs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Create new user
        const newUser = new User(userData);
        await newUser.save();

        // Return success response
        return json({
            success: true,
            user: {
                id: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                email: newUser.email,
                institution: newUser.institution,
                position: newUser.position,
                bio: newUser.bio,
                country: newUser.country
            },
            hasEmail: !!primaryEmail,
            isPreRegistration: !primaryEmail,
            tempPassword: !primaryEmail ? null : tempPassword // Only return temp password if email exists
        });

    } catch (error) {
        console.error('Error creating ORCID user:', error);
        return json({ 
            error: 'Failed to create user from ORCID profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}