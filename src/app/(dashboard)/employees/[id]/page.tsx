'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, User, Mail, Building2, Briefcase, Phone, MapPin, Calendar, Edit, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Employee {
  _id: string;
  name: string;
  email: string;
  password?: string;
  plainTextPassword?: string; // Actual password for admin viewing
  role: 'admin' | 'employee';
  employeeId?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  isActive: boolean;
  reportingAdmin?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [admins, setAdmins] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!employeeId) {
      console.log('Employee Details - No employee ID provided');
      setError('No employee ID provided');
      setLoading(false);
      return;
    }

    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');

    console.log('Employee Details - Token:', token?.substring(0, 20) + '...');
    console.log('Employee Details - User data:', userRaw);
    console.log('Employee Details - Employee ID:', employeeId);

    if (!token || !userRaw) {
      console.log('Employee Details - No token or user data, redirecting to login');
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      setUser(parsedUser);
      console.log('Employee Details - Parsed user:', parsedUser);

      // Allow admins to view any employee, but employees can only view themselves
      if (parsedUser.role !== 'admin' && (parsedUser.id !== employeeId && parsedUser._id !== employeeId)) {
        console.log('Employee Details - Unauthorized access, redirecting');
        router.push(parsedUser.role === 'admin' ? '/admin-dash' : '/employee-dash');
        return;
      }

      fetchEmployee(employeeId, token);
      fetchAdmins(token);
    } catch (error) {
      console.error('Employee Details - Error parsing user data:', error);
      setError('Invalid user data');
      setLoading(false);
    }
  }, [employeeId, router]);

  const fetchEmployee = async (id: string, token: string) => {
    console.log('Fetching employee with ID:', id);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/employees/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Employee API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Employee API Response data:', data);

        if (data.employee) {
          setEmployee(data.employee);
          setEditForm(data.employee);
        } else {
          console.error('Employee API - No employee data in response');
          setError('Invalid response from server');
        }
      } else if (response.status === 404) {
        console.log('Employee not found (404)');
        setError('Employee not found');
      } else if (response.status === 401) {
        console.log('Unauthorized access (401)');
        setError('Unauthorized access');
        router.push('/login');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('Failed to fetch employee details:', response.status, errorData);
        setError(errorData.error || 'Failed to fetch employee details');
      }
    } catch (error) {
      console.error('Fetch employee error:', error);
      setError('Network error while fetching employee details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async (token: string) => {
    try {
      const response = await fetch('/api/employees?role=admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm(employee || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(employee || {});
  };

  const handleSave = async () => {
    const token = getLocalStorage('token');
    if (!token) return;

    console.log('Employee Edit - Starting save...');
    console.log('Employee Edit - Employee ID:', employee?._id);
    console.log('Employee Edit - Edit Form Data:', editForm);

    try {
      const response = await fetch(`/api/employees/${employee?._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      console.log('Employee Edit - Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Employee Edit - Response Data:', data);
        setEmployee(data.employee);
        setIsEditing(false);
        setError('');
      } else {
        const errorData = await response.json();
        console.log('Employee Edit - Error Data:', errorData);
        setError(errorData.error || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Employee Edit - Save Error:', error);
      setError('An error occurred while updating employee');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    const token = getLocalStorage('token');
    if (!token) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/employees/${employee?._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push('/employees');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete employee');
      }
    } catch (error) {
      setError('An error occurred while deleting employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('Enter new password for this employee:');
    if (!newPassword) return;

    const token = getLocalStorage('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/employees/${employee?._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
        setEditForm(data.employee);
        alert('Password reset successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('An error occurred while resetting password');
    }
  };

  const handleToggleActive = async () => {
    const token = getLocalStorage('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/employees/${employee?._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !employee?.isActive }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
        setEditForm(data.employee);
      } else {
        setError('Failed to update employee status');
      }
    } catch (error) {
      setError('An error occurred while updating employee status');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!employee && error) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Employee Not Found</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/employees')}
            className="px-4 py-2 bg-primary text-black rounded-xl hover:bg-primary/90 transition-colors"
          >
            Back to Employees
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/employees')}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Employee Details</h1>
              <p className="text-gray-500 text-sm">View and manage employee information</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Info Card */}
          <Card className="lg:col-span-2 p-6 border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-primary font-bold text-xl">
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{employee.name}</h2>
                <p className="text-gray-400">{employee.role}</p>
                {employee.employeeId && (
                  <p className="text-sm text-gray-500">ID: {employee.employeeId}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        name="employeeId"
                        value={editForm.employeeId || ''}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Employee ID"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.employeeId || 'No Employee ID'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.email}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <select
                        name="role"
                        value={editForm.role}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="employee" className="bg-gray-900">Employee</option>
                        <option value="admin" className="bg-gray-900">Admin</option>
                      </select>
                    ) : (
                      <span className="text-sm text-gray-300">{employee.role}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-gray-500">🔘</span>
                    {isEditing ? (
                      <select
                        name="isActive"
                        value={editForm.isActive?.toString()}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="true" className="bg-gray-900">Active</option>
                        <option value="false" className="bg-gray-900">Inactive</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        employee.isActive
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-white/5 text-gray-500 border-white/5'
                      )}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        name="department"
                        value={editForm.department || ''}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Department"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.department || 'N/A'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        name="position"
                        value={editForm.position || ''}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Position"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.position || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone || ''}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Phone"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.phone || 'N/A'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={editForm.address || ''}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Address"
                        rows={1}
                      />
                    ) : (
                      <span className="text-sm text-gray-300">{employee.address || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Section - Admin Only */}
              {user?.role === 'admin' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 text-gray-500">🔐</span>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={employee.plainTextPassword || employee.password || 'No password set'}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-white/5"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleResetPassword}
                        className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 rounded-lg text-sm font-medium transition-colors"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                  {employee.plainTextPassword && (
                    <p className="text-xs text-green-400 mt-2">✓ Actual password visible to admin</p>
                  )}
                </div>
              )}

              {/* Reporting Admin */}
              {employee.role === 'employee' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Reporting Admin</h3>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500" />
                    {isEditing ? (
                      <select
                        name="reportingAdmin"
                        value={(editForm.reportingAdmin && typeof editForm.reportingAdmin === 'object') ? (editForm.reportingAdmin as any)._id : editForm.reportingAdmin || ''}
                        onChange={(e) => setEditForm({ ...editForm, reportingAdmin: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="" className="bg-gray-900">Select Admin</option>
                        {admins.map((admin: any) => (
                          <option key={admin._id} value={admin._id} className="bg-gray-900">
                            {admin.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-300">
                        {employee.reportingAdmin && typeof employee.reportingAdmin === 'object' && employee.reportingAdmin.name ?
                          employee.reportingAdmin.name :
                          'No reporting admin'
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Status & Metadata Card */}
          <div className="space-y-6">
            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Account Status</span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    employee.isActive
                      ? 'bg-secondary/10 text-secondary border-secondary/20'
                      : 'bg-white/5 text-gray-500 border-white/5'
                  )}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {!isEditing && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Quick Actions</span>
                    <button
                      onClick={handleToggleActive}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
                        employee.isActive
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                      )}
                    >
                      {employee.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Actions</h3>
              <div className="space-y-3">
                {!isEditing && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5 w-full justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Employee
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors disabled:opacity-50 w-full justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteLoading ? 'Deleting...' : 'Delete Employee'}
                    </button>
                  </div>
                )}

                {isEditing && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-black hover:bg-primary/90 rounded-xl transition-colors w-full justify-center"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>

                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5 w-full justify-center"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>

                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border-white/5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-300">
                      {new Date(employee.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="text-sm text-gray-300">
                      {new Date(employee.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {employee.hireDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Hire Date</p>
                      <p className="text-sm text-gray-300">
                        {new Date(employee.hireDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
