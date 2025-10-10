import { json } from '@sveltejs/kit';
import { db } from '$lib/db/mongo';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { paperId, phase, timestampKey, timestamp } = await request.json();
        
        if (!paperId || !phase || !timestampKey || !timestamp) {
            return json({ 
                success: false, 
                error: 'Missing required parameters' 
            }, { status: 400 });
        }
        
        // Preparar o objeto de atualização usando dot notation para nested objects
        const updateKey = `phaseTimestamps.${timestampKey}`;
        const updateObj = {
            [updateKey]: new Date(timestamp)
        };
        
        // Atualizar apenas se o timestamp ainda não existe (não sobrescrever)
        const result = await db.collection('papers').updateOne(
            { 
                _id: paperId,
                // Só define se ainda não foi definido
                [`phaseTimestamps.${timestampKey}`]: { $exists: false }
            },
            {
                $set: updateObj
            }
        );
        
        if (result.matchedCount === 0) {
            // Tentar criar o objeto phaseTimestamps se não existir
            const fallbackResult = await db.collection('papers').updateOne(
                { 
                    _id: paperId,
                    phaseTimestamps: { $exists: false }
                },
                {
                    $set: {
                        phaseTimestamps: {
                            [timestampKey]: new Date(timestamp)
                        }
                    }
                }
            );
            
            if (fallbackResult.matchedCount === 0) {
                return json({ 
                    success: false, 
                    error: 'Paper not found or timestamp already exists' 
                }, { status: 404 });
            }
        }
        
        return json({ 
            success: true, 
            message: `Phase timestamp for ${phase} set successfully`,
            phase,
            timestampKey
        });
        
    } catch (error) {
        console.error('Error setting phase timestamp:', error);
        return json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
};