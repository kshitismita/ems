import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

async function handleGetEmployees(req: NextRequest, user: AuthUser) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    let matchQuery: any = {};

    if (department) matchQuery.department = department;
    if (role) matchQuery.role = role;
    if (isActive !== null) matchQuery.isActive = isActive === 'true';

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'projects',
          localField: 'projects',
          foreignField: '_id',
          as: 'projects'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportingAdmin',
          foreignField: '_id',
          as: 'reportingAdmin'
        }
      },
      { $unwind: { path: '$reportingAdmin', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      pipeline.push({
        $match: {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { employeeId: searchRegex },
            { department: searchRegex },
            { position: searchRegex },
            { 'projects.name': searchRegex }
          ]
        }
      });
    }

    const skip = (page - 1) * limit;

    const employees = await User.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Add password field for admin users only (encrypted)
    const employeesWithPasswords = employees.map(emp => {
      const employeeObj = { ...emp };
      if (user.role === 'admin') {
        // Include password for admin users
        employeeObj.password = emp.password;
      } else {
        // Exclude password for non-admin users
        delete employeeObj.password;
      }
      return employeeObj;
    });

    const totalResult = await User.aggregate([
      ...pipeline,
      { $count: 'total' }
    ]);
    const total = totalResult[0]?.total || 0;

    return NextResponse.json({
      employees: employeesWithPasswords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Employees API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}

async function handleCreateEmployee(req: NextRequest, user: AuthUser) {
  try {
    await connectDB();
    const userData = await req.json();

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    if (userData.employeeId) {
      userData.employeeId = userData.employeeId.toUpperCase();
      const existingEmployeeId = await User.findOne({ employeeId: userData.employeeId });
      if (existingEmployeeId) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
    } else if (userData.role === 'employee') {
      const lastEmployee = await User.findOne({ role: 'employee' }).sort({ employeeId: -1 });
      const lastNumber = lastEmployee?.employeeId ? parseInt(lastEmployee.employeeId.replace('EMP', '')) : 0;
      userData.employeeId = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
    }

    if (userData.reportingAdmin) {
      const admin = await User.findById(userData.reportingAdmin);
      if (!admin || admin.role !== 'admin') {
        return NextResponse.json(
          { error: 'Invalid admin assigned' },
          { status: 400 }
        );
      }
    }

    const employee = new User(userData);
    await employee.save();

    const populatedEmployee = await User.findById(employee._id)
      .populate('reportingAdmin', 'name email')
      .populate('projects', 'name status');

    return NextResponse.json({
      message: 'Employee created successfully',
      employee: populatedEmployee,
    }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetEmployees);
export const POST = withAuth(handleCreateEmployee, 'admin');
