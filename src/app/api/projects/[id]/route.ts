import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

// GET /api/projects/[id] - Get project details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Project Details API - GET request for ID:', id);

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

    await connectDB();
    console.log('Project Details API - Database connected successfully');

    console.log('Project Details API - Searching for project with ID:', id);
    console.log('Project Details API - ID type:', typeof id);
    console.log('Project Details API - ID length:', id.length);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Project Details API - Invalid ObjectId format');
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    console.log('Project Details API - ObjectId format is valid, executing query...');

    let project;
    let projectWithLastUsed;
    try {
      project = await Project.findById(id)
        .populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email role')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role')
        .populate({
          path: 'referenceLinks.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .lean();

      // Try to populate lastUsedBy separately and merge if successful
      try {
        projectWithLastUsed = await Project.findById(id)
          .populate({
            path: 'apiKeys.lastUsedBy',
            model: 'User',
            select: 'name email role'
          })
          .lean();

        if (project && projectWithLastUsed && project.apiKeys) {
          project.apiKeys = project.apiKeys.map((key: any, index: number) => ({
            ...key,
            lastUsedBy: projectWithLastUsed.apiKeys?.[index]?.lastUsedBy
          }));
        }
      } catch (lastUsedError) {
        console.log('Project Details API - Could not populate lastUsedBy (field may not exist):', lastUsedError.message);
        // Continue without lastUsedBy - this is expected for existing projects
      }
    } catch (populateError: any) {
      console.log('Project Details API - Populate failed, trying basic query:', populateError.message);
      // Fallback to basic query without problematic populates
      project = await Project.findById(id)
        .populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email role')
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .lean();

      // Try to populate lastUsedBy separately and merge if successful
      try {
        projectWithLastUsed = await Project.findById(id)
          .populate({
            path: 'apiKeys.lastUsedBy',
            model: 'User',
            select: 'name email role'
          })
          .lean();

        if (project && projectWithLastUsed && project.apiKeys) {
          project.apiKeys = project.apiKeys.map((key: any, index: number) => ({
            ...key,
            lastUsedBy: projectWithLastUsed.apiKeys?.[index]?.lastUsedBy
          }));
        }
      } catch (lastUsedError) {
        console.log('Project Details API - Could not populate lastUsedBy in fallback (field may not exist):', lastUsedError.message);
        // Continue without lastUsedBy - this is expected for existing projects
      }
    }

    console.log('Project Details API - Query executed, found project:', project ? 'Yes' : 'No');

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if employee has access to this project
    if (user.role === 'employee') {
      const isAssigned = project.assignedEmployees.some(
        (emp: any) => emp && emp._id && emp._id.toString() === user.id
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this project.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ project });

  } catch (error: any) {
    console.error('Project Details API - Error:', error);
    console.error('Project Details API - Error name:', error.name);
    console.error('Project Details API - Error message:', error.message);
    console.error('Project Details API - Error stack:', error.stack);

    // Check for specific error types
    if (error.name === 'CastError') {
      console.error('Project Details API - CastError details:', error);
      return NextResponse.json(
        { error: 'Invalid project ID format', details: error.message },
        { status: 400 }
      );
    }

    if (error.name === 'MongooseError') {
      console.error('Project Details API - MongooseError details:', error);
      return NextResponse.json(
        { error: 'Database connection error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch project details',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Project Details API - PUT request for ID:', id);

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
      console.error('Project Details API - Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();

    let updateData;
    try {
      updateData = await req.json();
      console.log('Project Details API - Update data:', JSON.stringify(updateData, null, 2));
    } catch (error) {
      console.error('Project Details API - JSON parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Handle Remarks (both Admins and Employees can add)
    if (updateData.remark) {
      // Employees must be assigned to the project
      if (user.role !== 'admin') {
        const project = await Project.findById(id);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        const isAssigned = project.assignedEmployees.some(empId => empId.toString() === user.id);
        if (!isAssigned) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          $push: {
            remarks: {
              text: updateData.remark,
              createdBy: user.id,
              createdAt: new Date()
            }
          }
        },
        { new: true }
      ).populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role');


      return NextResponse.json({ message: 'Remark added', project: updatedProject });
    }

    // Handle Reference Links (Admin and assigned Employees can add)
    if (updateData.referenceLink) {
      // Employees must be assigned to the project
      if (user.role !== 'admin') {
        const project = await Project.findById(id);
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        const isAssigned = project.assignedEmployees.some(empId => empId.toString() === user.id);
        if (!isAssigned) {
          return NextResponse.json({ error: 'Access denied - you must be assigned to this project' }, { status: 403 });
        }
      }

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          $push: {
            referenceLinks: {
              title: updateData.referenceLink.title,
              url: updateData.referenceLink.url,
              addedBy: user.id,
              addedAt: new Date()
            }
          }
        },
        { new: true }
      ).populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role')
        .populate({
          path: 'referenceLinks.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        });

      return NextResponse.json({ message: 'Reference link added', project: updatedProject });
    }

    // Handle deleting Reference Links (Admin only)
    if (updateData.deleteReferenceLink) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          $pull: {
            referenceLinks: { _id: updateData.deleteReferenceLink }
          }
        },
        { new: true }
      ).populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role')
        .populate({
          path: 'referenceLinks.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        });

      return NextResponse.json({ message: 'Reference link removed', project: updatedProject });
    }

    // Handle API Keys (Admin only)
    if (updateData.apiKey) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          $push: {
            apiKeys: {
              name: updateData.apiKey.name,
              keyValue: updateData.apiKey.keyValue,
              description: updateData.apiKey.description,
              addedBy: user.id,
              addedAt: new Date(),
              usageCount: 0
            }
          }
        },
        { new: true }
      ).populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role')
        .populate({
          path: 'referenceLinks.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.lastUsedBy',
          model: 'User',
          select: 'name email role'
        });

      return NextResponse.json({ message: 'API key added', project: updatedProject });
    }

    // Handle deleting API Keys (Admin only)
    if (updateData.deleteApiKey) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          $pull: {
            apiKeys: { _id: updateData.deleteApiKey }
          }
        },
        { new: true }
      ).populate('admin', 'name email employeeId department position')
        .populate('assignedEmployees', 'name email employeeId department position')
        .populate('createdBy', 'name email')
        .populate('remarks.createdBy', 'name email role')
        .populate('documents.uploadedBy', 'name email role')
        .populate({
          path: 'referenceLinks.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.addedBy',
          model: 'User',
          select: 'name email role'
        })
        .populate({
          path: 'apiKeys.lastUsedBy',
          model: 'User',
          select: 'name email role'
        });

      return NextResponse.json({ message: 'API key removed', project: updatedProject });
    }

    // Other updates (Admin only)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required for other updates' }, { status: 403 });
    }

    // Don't allow changing createdBy
    delete updateData.createdBy;

    // Handle admin field - convert string ID to ObjectId if needed
    if (updateData.admin && typeof updateData.admin === 'string') {
      try {
        updateData.admin = new mongoose.Types.ObjectId(updateData.admin);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid admin ID format' },
          { status: 400 }
        );
      }
    }

    // Handle assignedEmployees - convert string IDs to ObjectIds if needed
    if (updateData.assignedEmployees && Array.isArray(updateData.assignedEmployees)) {
      try {
        updateData.assignedEmployees = updateData.assignedEmployees.map(empId =>
          typeof empId === 'string' ? new mongoose.Types.ObjectId(empId) : empId
        );
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid assigned employee ID format' },
          { status: 400 }
        );
      }
    }

    // Verify assigned employees if being updated
    if (updateData.assignedEmployees) {
      const employees = await User.find({ _id: { $in: updateData.assignedEmployees } });
      if (employees.length !== updateData.assignedEmployees.length) {
        return NextResponse.json(
          { error: 'One or more assigned employees not found' },
          { status: 400 }
        );
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('admin', 'name email employeeId department position')
      .populate('assignedEmployees', 'name email employeeId department position')
      .populate('createdBy', 'name email')
      .populate('remarks.createdBy', 'name email role')
      .populate('documents.uploadedBy', 'name email role')
      .populate({
        path: 'referenceLinks.addedBy',
        model: 'User',
        select: 'name email role'
      })
      .populate({
        path: 'apiKeys.addedBy',
        model: 'User',
        select: 'name email role'
      })
      .populate({
        path: 'apiKeys.lastUsedBy',
        model: 'User',
        select: 'name email role'
      });

    if (!updatedProject) {
      console.log('❌ [DB Error] Project not found for ID:', id);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('✅ [DB Success] Project updated:', updatedProject._id, updatedProject.name);


    return NextResponse.json({
      message: 'Project updated successfully',
      project: updatedProject,
    });

  } catch (error: any) {
    console.error('❌ [DB Error] Update project error:', error);
    console.error('❌ [DB Error] Error stack:', error.stack);
    console.error('❌ [DB Error] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyValue: error.keyValue,
      errors: error.errors
    });

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.message,
          validationErrors
        },
        { status: 400 }
      );
    }

    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          error: 'Invalid data format',
          details: error.message,
          field: error.path
        },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(error.keyValue)[0];
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          details: `${duplicateField} already exists`,
          field: duplicateField
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Project Details API - DELETE request for ID:', id);

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

    // Only admins can delete projects
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('✅ [DB Success] Project deleted:', id);


    return NextResponse.json({
      message: 'Project deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ [DB Error] Delete project error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message },
      { status: 500 }
    );
  }
}
