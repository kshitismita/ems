import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
    employeeId?: string;
}

// GET /api/projects - List projects with role-based filtering
export async function GET(req: NextRequest) {
    try {
        console.log('Projects API - GET request received');

        // Extract and verify token
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let user: AuthUser;
        try {
            user = verifyToken(token);
            console.log('Projects API - User authenticated:', user.role);
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const search = searchParams.get('search');

        let matchQuery: any = {};

        // Role-based filtering
        if (user.role === 'employee') {
            matchQuery.assignedEmployees = new mongoose.Types.ObjectId(user.id);
        }

        // Apply filters
        if (status && status !== 'all') matchQuery.status = status;
        if (priority && priority !== 'all') matchQuery.priority = priority;

        const pipeline: any[] = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedEmployees',
                    foreignField: '_id',
                    as: 'assignedEmployees'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'admin',
                    foreignField: '_id',
                    as: 'admin'
                }
            },
            { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy'
                }
            },
            { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
        ];

        if (search) {
            const trimmedSearch = search.trim();
            const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapedSearch, 'i');

            pipeline.push({
                $match: {
                    $or: [
                        { name: searchRegex },
                        { description: searchRegex },
                        { tags: searchRegex },
                        { 'assignedEmployees.name': searchRegex },
                        { 'assignedEmployees.email': searchRegex },
                        { 'admin.name': searchRegex }
                    ]
                }
            });
        }

        const skip = (page - 1) * limit;

        const projects = await Project.aggregate([
            ...pipeline,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        const totalCountResult = await Project.aggregate([
            ...pipeline,
            { $count: 'total' }
        ]);
        const totalCount = totalCountResult[0]?.total || 0;

        const activeCountResult = await Project.aggregate([
            { $match: { ...matchQuery, status: 'active' } },
            { $count: 'total' }
        ]);
        const activeCount = activeCountResult[0]?.total || 0;

        const completedCountResult = await Project.aggregate([
            { $match: { ...matchQuery, status: 'completed' } },
            { $count: 'total' }
        ]);
        const completedCount = completedCountResult[0]?.total || 0;

        console.log('Projects API - Found:', projects.length, 'Total:', totalCount);

        return NextResponse.json({
            projects,
            stats: {
                total: totalCount,
                active: activeCount,
                completed: completedCount,
            },
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
            },
        });

    } catch (error: any) {
        console.error('Projects API - Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects', details: error.message },
            { status: 500 }
        );
    }
}


// POST /api/projects - Create new project (admin only)
export async function POST(req: NextRequest) {
    try {
        console.log('Projects API - POST request received');

        // Extract and verify token
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let user: AuthUser;
        try {
            user = verifyToken(token);
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Only admins can create projects
        if (user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        await connectDB();

        const projectData = await req.json();

        // Validate required fields - manager or admin field can be used
        const projectAdminId = projectData.manager || projectData.admin;

        if (!projectData.name || !projectData.description || !projectData.startDate || !projectAdminId) {
            return NextResponse.json(
                { error: 'Missing required fields: name, description, startDate, admin' },
                { status: 400 }
            );
        }

        // Map manager/admin field to admin for DB storage
        const admin = await User.findById(projectAdminId);
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json(
                { error: 'Invalid admin. Project admin must have admin role.' },
                { status: 400 }
            );
        }

        // Verify assigned employees exist
        if (projectData.assignedEmployees && projectData.assignedEmployees.length > 0) {
            const employees = await User.find({ _id: { $in: projectData.assignedEmployees } });
            if (employees.length !== projectData.assignedEmployees.length) {
                return NextResponse.json(
                    { error: 'One or more assigned employees not found' },
                    { status: 400 }
                );
            }
        }

        // Set createdBy to current user and map admin correctly
        projectData.createdBy = user.id;
        projectData.admin = projectAdminId;
        if (projectData.manager) delete projectData.manager;

        const project = new Project(projectData);
        const savedProject = await project.save();

        console.log('✅ [DB Success] Project created:', savedProject._id, savedProject.name);

        // Populate and return the created project
        const populatedProject = await Project.findById(savedProject._id)
            .populate('admin', 'name email employeeId')
            .populate('assignedEmployees', 'name email employeeId')
            .populate('createdBy', 'name email')
            .populate('remarks.createdBy', 'name email role')
            .populate('documents.uploadedBy', 'name email role');


        return NextResponse.json({
            message: 'Project created successfully',
            project: populatedProject,
        }, { status: 201 });

    } catch (error: any) {
        console.error('❌ [DB Error] Create project error:', error);
        return NextResponse.json(
            { error: 'Failed to create project', details: error.message },
            { status: 500 }
        );
    }
}
