import axios from 'axios';
import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class LinkedInAdapter implements PlatformAdapter {
    platform = Platform.LINKEDIN;
    name = 'LinkedIn';
    couldAutoPublish = true;

    async publish(article: Article, accessToken?: string): Promise<PublishResult> {
        if (!accessToken) {
            return { success: false, error: 'LinkedIn requires an access token.' };
        }

        if (!article.linkedinTeaser) {
            return { success: false, error: 'LinkedIn teaser content is missing.' };
        }

        try {
            // 1. Get the current user's URN
            const meResponse = await axios.get('https://api.linkedin.com/v2/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const personUrn = `urn:li:person:${meResponse.data.id}`;

            // 2. Post the content
            const postResponse = await axios.post(
                'https://api.linkedin.com/v2/ugcPosts',
                {
                    author: personUrn,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: {
                                text: article.linkedinTeaser
                            },
                            shareMediaCategory: 'NONE'
                        }
                    },
                    visibility: {
                        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'X-Restli-Protocol-Version': '2.0.0',
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                platformId: postResponse.data.id
            };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            console.error('[LinkedInAdapter] Error:', errorData);
            return {
                success: false,
                error: typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
            };
        }
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean> {
        if (!accessToken || !platformId) return false;
        try {
            await axios.delete(`https://api.linkedin.com/v2/ugcPosts/${platformId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            return true;
        } catch (error) {
            console.error('[LinkedInAdapter] Delete Error:', error);
            return false;
        }
    }
}

