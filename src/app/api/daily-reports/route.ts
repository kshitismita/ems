import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DailyReport from '@/models/DailyReport';
import Project from '@/models/Project';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';
import fs from 'fs';
import path from 'path';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

async function handleSubmitDailyReport(req: NextRequest, user: AuthUser) {
  try {
    await connectDB();
    const reportData = await req.json();

    const existingReport = await DailyReport.findOne({
      employee: user.id,
      date: new Date(reportData.date).setHours(0, 0, 0, 0),
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'Daily report already exists for this date' },
        { status: 409 }
      );
    }

    const report = new DailyReport({
      ...reportData,
      employee: user.id,
      date: new Date(reportData.date).setHours(0, 0, 0, 0),
    });

    await report.save();

    const populatedReport = await DailyReport.findById(report._id)
      .populate('employee', 'name email employeeId')
      .populate('project', 'name')
      .populate('reviewedBy', 'name email');


    return NextResponse.json({
      message: 'Daily report submitted successfully',
      report: populatedReport,
    }, { status: 201 });
  } catch (error) {
    console.error('Submit daily report error:', error);
    return NextResponse.json(
      { error: 'Failed to submit daily report' },
      { status: 500 }
    );
  }
}

async function handleGetDailyReports(req: NextRequest, user: AuthUser) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employee = searchParams.get('employee');
    const project = searchParams.get('project');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query: any = {};

    // Base authorization filter
    if (user.role !== 'admin') {
      query.employee = new mongoose.Types.ObjectId(user.id);
    } else if (employee) {
      query.employee = new mongoose.Types.ObjectId(employee);
    }

    if (project) {
      query.project = new mongoose.Types.ObjectId(project);
    }

    const hasFeedback = searchParams.get('hasFeedback');

    if (status) query.status = status;
    if (hasFeedback === 'true') {
      query.feedback = { $exists: true, $ne: '' };
    }
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    // Add search functionality
    if (search) {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      const searchPipeline: any[] = [
        { $match: query }, // Filter early for performance and security
        {
          $lookup: {
            from: 'users',
            localField: 'employee',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'projects',
            localField: 'project',
            foreignField: '_id',
            as: 'project'
          }
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'reviewedBy',
            foreignField: '_id',
            as: 'reviewedBy'
          }
        },
        { $unwind: { path: '$reviewedBy', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { 'tasksCompleted': searchRegex },
              { 'tasksInProgress': searchRegex },
              { 'challenges': searchRegex },
              { 'achievements': searchRegex },
              { 'notes': searchRegex },
              { 'feedback': searchRegex },
              { 'employee.name': searchRegex },
              { 'employee.email': searchRegex },
              { 'employee.employeeId': searchRegex },
              { 'project.name': searchRegex },
              { 'reviewedBy.name': searchRegex }
            ]
          }
        }
      ];

      // Add sorting to pipeline
      let sortObj: any = {};
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'employee') sortObj['employee.name'] = sortDirection;
      else if (sortBy === 'project') sortObj['project.name'] = sortDirection;
      else if (sortBy === 'status') sortObj.status = sortDirection;
      else sortObj.date = sortDirection;

      searchPipeline.push({ $sort: sortObj });

      // Execute aggregation with search
      const skipValue = (page - 1) * limit;

      const reports = await DailyReport.aggregate([
        ...searchPipeline,
        { $skip: skipValue },
        { $limit: limit }
      ]);

      const countPipeline = [...searchPipeline, { $count: 'total' }];
      const totalResult = await DailyReport.aggregate(countPipeline);
      const total = totalResult[0]?.total || 0;

      return NextResponse.json({
        reports,
        pagination: {
          page,
          limit,
          pages: Math.ceil(total / limit),
          total
        }
      });
    }

    // Non-search query path
    const skip = (page - 1) * limit;

    // Build sort object
    let sortObj: any = {};
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    console.log('🔍 Non-Search Query:', JSON.stringify(query, null, 2));

    switch (sortBy) {
      case 'status':
        sortObj.status = sortDirection;
        break;
      case 'employee':
        sortObj['employee.name'] = sortDirection;
        break;
      case 'project':
        sortObj['project.name'] = sortDirection;
        break;
      case 'date':
      default:
        sortObj.date = sortDirection;
        break;
    }

    console.log('📊 Sort Object:', JSON.stringify(sortObj, null, 2));

    const reports = await DailyReport.find(query)
      .populate('employee', 'name email employeeId')
      .populate('project', 'name')
      .populate('reviewedBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    console.log('📈 Non-Search Results:', reports.length, 'reports');

    const total = await DailyReport.countDocuments(query);

    console.log('📈 Non-Search Total:', total);

    try {
      const logPath = path.join(process.cwd(), 'api-debug.log');
      const logMsg = `[${new Date().toISOString()}] GET Reports - Query: ${JSON.stringify(query)} | Sort: ${JSON.stringify(sortObj)} | Found: ${reports.length} | User: ${user.name} (${user.role})\n`;
      fs.appendFileSync(logPath, logMsg);
    } catch (logErr) {
      console.error('Logging failed:', logErr);
    }

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get daily reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily reports' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handleSubmitDailyReport);
export const GET = withAuth(handleGetDailyReports);
