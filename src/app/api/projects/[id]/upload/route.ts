import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { verifyToken } from '@/lib/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let user: AuthUser;
        try {
            user = verifyToken(token);
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await connectDB();

        // Check permissions - must be admin or assigned employee
        const project = await Project.findById(id);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const isAssigned = project.assignedEmployees.some(empId => empId.toString() === user.id);
        if (user.role !== 'admin' && !isAssigned) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'projects', id);
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (err) {
            // Directory exists or other error
        }

        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/projects/${id}/${fileName}`;

        // Add document to project
        const newDoc = {
            name: file.name,
            url: fileUrl,
            fileType: file.type,
            size: file.size,
            uploadedBy: user.id,
            uploadedAt: new Date()
        };

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            { $push: { documents: newDoc } },
            { new: true }
        ).populate('remarks.createdBy', 'name email role')
            .populate('documents.uploadedBy', 'name email role');

        return NextResponse.json({
            message: 'File uploaded successfully',
            document: updatedProject.documents[updatedProject.documents.length - 1],
            project: updatedProject
        });

    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error.message },
            { status: 500 }
        );
    }
}
