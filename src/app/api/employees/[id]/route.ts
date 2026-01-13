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

function canAccessEmployee(currentUser: AuthUser, targetEmployeeId: string): boolean {
  if (currentUser.role === 'admin') return true;
  return currentUser.id === targetEmployeeId;
}

async function handleGetEmployee(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    
    const { id } = context.params;

    if (!canAccessEmployee(user, id)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const employee = await User.findById(id)
      .select('+password +plainTextPassword') // Include both password fields
      .populate('reportingAdmin', 'name email')
      .populate('projects', 'name status deadline');

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

async function handleUpdateEmployee(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    
    const { id } = context.params;
    const updateData = await req.json();

    if (!canAccessEmployee(user, id) && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (user.role !== 'admin') {
      const allowedFields = ['name', 'phone', 'address'];
      const updateKeys = Object.keys(updateData);
      const hasRestrictedFields = updateKeys.some(key => !allowedFields.includes(key));
      
      if (hasRestrictedFields) {
        return NextResponse.json(
          { error: 'You can only update your profile information' },
          { status: 403 }
        );
      }
    }

    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        _id: { $ne: id } 
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    if (updateData.reportingAdmin) {
      const admin = await User.findById(updateData.reportingAdmin);
      if (!admin || admin.role !== 'admin') {
        return NextResponse.json(
          { error: 'Invalid admin assigned' },
          { status: 400 }
        );
      }
    }

    // Handle password update separately to ensure proper hashing
    let finalUpdateData = { ...updateData };
    
    if (updateData.password) {
      // For password updates, we need to handle hashing manually
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(updateData.password, salt);
      
      finalUpdateData = {
        ...updateData,
        password: hashedPassword,
        plainTextPassword: updateData.password // Store plain text for admin viewing
      };
    }

    const employee = await User.findByIdAndUpdate(
      id,
      finalUpdateData,
      { new: true, runValidators: true }
    ).select('+password +plainTextPassword') // Include both password fields
     .populate('reportingAdmin', 'name email')
     .populate('projects', 'name status deadline');

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Employee updated successfully',
      employee,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

async function handleDeleteEmployee(req: NextRequest, user: AuthUser, context: { params: { id: string } }) {
  try {
    await connectDB();
    
    const { id } = context.params;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete employees' },
        { status: 403 }
      );
    }

    const employee = await User.findById(id);
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (employee._id.toString() === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleGetEmployee(request, user, { params: { id } }))(req);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleUpdateEmployee(request, user, { params: { id } }))(req);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth((request, user) => handleDeleteEmployee(request, user, { params: { id } }), 'admin')(req);
}
