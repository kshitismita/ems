'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, Building2, UserCheck, Plus, Search, Filter, MoreHorizontal, ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalStorage } from '@/lib/storage';

// ... User Interface ...
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  reportingAdmin?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getLocalStorage('token');
    const userRaw = getLocalStorage('user');

    console.log('Employees Page - Token:', token);
    console.log('Employees Page - UserRaw:', userRaw);

    if (!token || !userRaw) {
      console.log('Employees Page - No token or user, redirecting to login');
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userRaw);
      console.log('Employees Page - Parsed User:', parsedUser);
      console.log('Employees Page - User Role:', parsedUser.role);
      setUser(parsedUser);

      fetchEmployees(token);
    } catch (error) {
      console.error('Employees Page - Error parsing user data', error);
      setLoading(false);
    }
  }, [router]);

  const fetchEmployees = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/employees?limit=50&page=1`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (activeFilter !== 'all') {
        if (activeFilter === 'inactive') url += `&isActive=false`;
        else if (filterModes.includes(activeFilter)) url += `&role=${activeFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch employees');
      }
    } catch (error: any) {
      setError('An error occurred while fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const filterModes = ['admin', 'employee'];


  const handleDeactivate = async (employeeId: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;

    const token = getLocalStorage('token');
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setEmployees(employees.map(emp =>
          emp._id === employeeId ? { ...emp, isActive: false } : emp
        ));
      } else {
        setError('Failed to deactivate employee');
      }
    } catch (error) {
      setError('An error occurred while deactivating employee');
    }
  };

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    const token = getLocalStorage('token');
    if (!token) return;

    setDeleteLoading(employeeId);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp._id !== employeeId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete employee');
      }
    } catch (error) {
      setError('An error occurred while deleting employee');
    } finally {
      setDeleteLoading(null);
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    const comparison = aValue.toString().localeCompare(bValue.toString());
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Debug: Log employee data structure
  console.log('Employees data:', employees);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const token = getLocalStorage('token');
    if (token) {
      fetchEmployees(token);
    }
  }, [activeFilter]);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const activeCount = employees.filter(e => e.isActive).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {user?.role === 'employee' ? 'Team' : 'Employees'}
            </h1>
            <p className="text-gray-400 mt-1">
              {user?.role === 'employee' ? 'View your team members' : 'Manage employee accounts'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => router.push('/employees/create')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black hover:bg-primary/90 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Employees"
            value={employees.length}
            icon={<Users className="w-6 h-6" />}
            color="primary"
          />
          <StatsCard
            title="Active Members"
            value={activeCount}
            icon={<UserCheck className="w-6 h-6" />}
            color="emerald"
            trend="neutral"
            trendValue="Stable"
          />
          <StatsCard
            title="Departments"
            value={new Set(employees.map(e => e.department).filter(Boolean)).size}
            icon={<Building2 className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm w-full md:w-auto">
            {['all', 'admin', 'employee', 'inactive'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                  activeFilter === filter
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEmployees(getLocalStorage('token') || '')}
              className="block w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="Search by name, ID, dept, position, or projects..."
            />
            <button
              onClick={() => fetchEmployees(getLocalStorage('token') || '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Employee Table */}
        <Card className="overflow-hidden border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 font-semibold text-white">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      Name
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold text-white">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      Email
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold text-white">Role</th>
                  <th className="text-left p-4 font-semibold text-white">Department</th>
                  <th className="text-left p-4 font-semibold text-white">Position</th>
                  <th className="text-left p-4 font-semibold text-white">Status</th>
                  <th className="text-left p-4 font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((employee) => (
                  <tr key={employee._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-primary font-bold text-sm">
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              const employeeId = employee._id;
                              console.log('Clicking employee:', employeeId, employee.name);
                              if (employeeId) {
                                router.push(`/employees/${employeeId}`);
                              } else {
                                console.error('Employee ID is undefined:', employee);
                              }
                            }}
                            className="font-medium text-white hover:text-primary transition-colors text-left"
                          >
                            {employee.name}
                          </button>
                          {employee.employeeId && (
                            <div className="text-xs text-gray-500">{employee.employeeId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{employee.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        employee.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      )}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{employee.department || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{employee.position || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        employee.isActive
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-white/5 text-gray-500 border-white/5'
                      )}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      {user?.role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/employees/${employee._id}?edit=true`)}
                            className="px-3 py-1 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-gray-300 rounded text-sm font-medium transition-all border border-white/5 hover:border-blue-500/30"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee._id)}
                            disabled={deleteLoading === employee._id}
                            className="px-3 py-1 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded text-sm font-medium transition-all border border-white/5 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading === employee._id ? (
                              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          View only
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedEmployees.length === 0 && !loading && (
            <div className="py-16 text-center text-gray-500">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-400">No employees found.</p>
              <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
