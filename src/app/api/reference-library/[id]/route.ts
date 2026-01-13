import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReferenceLibrary from '@/models/ReferenceLibrary';
import { withAuth } from '@/middleware/auth';
import { v2 as cloudinary } from 'cloudinary';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

async function handleDeleteDocument(req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();

        // Wait for params to be available (required in Next.js 15+)
        const { id } = await params;

        const document = await ReferenceLibrary.findById(id);
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Check permissions: admin can delete any, employee can only delete their own
        const userId = user.id || (user as any)._id;
        if (user.role !== 'admin' && document.uploadedBy.toString() !== userId) {
            return NextResponse.json({ error: 'Unauthorized to delete this document' }, { status: 403 });
        }

        // Delete from Cloudinary
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (cloudName && apiKey && apiSecret) {
                cloudinary.config({
                    cloud_name: cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret,
                    secure: true,
                });

                // Extract public_id from URL
                const fileUrl = document.url;
                const urlObj = new URL(fileUrl);
                const pathParts = urlObj.pathname.split('/');
                const uploadIndex = pathParts.indexOf('upload');

                if (uploadIndex !== -1) {
                    const resourceType = pathParts[uploadIndex - 1] || 'image';
                    let remainingParts = pathParts.slice(uploadIndex + 1);

                    // Skip version number
                    if (remainingParts.length > 0 && /^v\d+$/.test(remainingParts[0])) {
                        remainingParts = remainingParts.slice(1);
                    }

                    let publicIdWithFolder = remainingParts.join('/');

                    // Strip extension for non-raw
                    if (resourceType !== 'raw') {
                        const lastDotIndex = publicIdWithFolder.lastIndexOf('.');
                        if (lastDotIndex !== -1) {
                            publicIdWithFolder = publicIdWithFolder.substring(0, lastDotIndex);
                        }
                    }

                    await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: resourceType as any });
                    console.log('Deleted from Cloudinary:', publicIdWithFolder);
                }
            }
        } catch (cloudinaryError) {
            console.error('Failed to delete from Cloudinary:', cloudinaryError);
        }

        // Delete from database
        await ReferenceLibrary.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Document deleted successfully' });
    } catch (error: any) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
    }
}

export const DELETE = withAuth(handleDeleteDocument);
