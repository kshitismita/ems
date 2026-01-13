import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import connectDB from '@/lib/mongodb';
import { withAuth } from '@/middleware/auth';
import fs from 'fs';
import path from 'path';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

async function handleFileUpload(req: NextRequest, user: AuthUser) {
    try {
        await connectDB();
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        console.log(`Uploading file ${file.name} to Cloudinary...`);
        const result = await uploadToCloudinary(buffer, 'ems/reference-library');

        return NextResponse.json({
            message: 'File uploaded successfully to cloud',
            url: result.secure_url,
            fileName: file.name,
            fileType: result.resource_type,
            size: result.bytes
        });

    } catch (error: any) {
        const errorLog = `[${new Date().toISOString()}] Upload API Error: ${error.message}\nStack: ${error.stack}\n\n`;
        fs.appendFileSync(path.join(process.cwd(), 'api-debug.log'), errorLog);

        console.error('Library file upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error.message },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handleFileUpload);
