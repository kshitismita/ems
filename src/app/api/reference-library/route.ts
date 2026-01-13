import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ReferenceLibrary from '@/models/ReferenceLibrary';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

async function handleGetDocuments(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const conditions: any[] = [];

        if (category && category !== 'all') {
            conditions.push({ category });
        }

        if (search) {
            conditions.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Employees can only see public documents or their own
        if (user.role !== 'admin') {
            conditions.push({
                $or: [
                    { isPublic: true },
                    { uploadedBy: user.id }
                ]
            });
        }

        let query = conditions.length > 0 ? { $and: conditions } : {};

        const documents = await ReferenceLibrary.find(query)
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 });
        return NextResponse.json({ documents });
    } catch (error) {
        console.error('Fetch documents error:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

async function handleCreateDocument(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();
        const body = await req.json();
        console.log('Reference Library Create - User:', user);
        console.log('Reference Library Create - Body:', body);
        const { title, description, category, tags, url, isPublic } = body;

        // Specific validation for non-API-key items
        if (category !== 'api-keys' && (!title || !description || !url)) {
            return NextResponse.json({ error: 'Title, description and URL are required' }, { status: 400 });
        }

        // Validation for API keys
        if (category === 'api-keys' && (!title || !description)) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
        }

        let apiKeyDetails = undefined;
        if (category === 'api-keys') {
            // Generate a random key if not provided (though mapped from url/value field in frontend)
            const generatedKey = `sk_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
            // If the user provided a value (reusing 'url' field from frontend form or a specific field), use it, otherwise generate
            const keyValue = url || generatedKey;

            apiKeyDetails = {
                keyValue: keyValue,
                description: description,
                usageCount: 0
            };
        }

        const newDoc = new ReferenceLibrary({
            title,
            description,
            category,
            tags: tags || [],
            url: category === 'api-keys' ? undefined : url, // Clear URL for API keys if we used it for key value
            apiKeyDetails,
            isPublic: isPublic !== undefined ? isPublic : true,
            uploadedBy: user.id
        });

        await newDoc.save();


        return NextResponse.json({ document: newDoc }, { status: 201 });
    } catch (error: any) {
        console.error('Create document error details:', {
            message: error.message,
            stack: error.stack,
            errors: error.errors
        });
        return NextResponse.json({ error: 'Failed to create document', details: error.message }, { status: 500 });
    }
}

export const GET = withAuth(handleGetDocuments);
export const POST = withAuth(handleCreateDocument);
