'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/Layout';
import AuthGuard from '@/components/auth/AuthGuard';

import { Card } from '@/components/ui/Card';
import { ArrowLeft, UserPlus, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreateEmployeePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    address: '',
    reportingAdmin: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Check auth on mount
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAdmins(token);
  }, [router]);

  const fetchAdmins = async (token: string) => {
    try {
      console.log('🔍 Fetching admins...');
      const response = await fetch('/api/employees?role=admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('📊 Admins response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admins data received:', data);
        setAdmins(data.employees || []);
        console.log(`👑 Found ${data.employees?.length || 0} admins`);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch admins:', errorData);
        setError('Failed to fetch admins');
      }
    } catch (error) {
      console.error('❌ Fetch admins error:', error);
      setError('Failed to fetch admins');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    console.log('📤 Creating employee with data:', formData);

    const submitData = {
      ...formData,
      reportingAdmin: formData.reportingAdmin || undefined,
    };

    console.log('📋 Submit data:', submitData);

    try {
      console.log('🔍 Sending request to /api/employees...');
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      console.log('📊 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Employee created successfully:', data);
        router.push('/employees');
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create employee:', errorData);
        setError(errorData.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      setError('An error occurred while creating the employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const inputClasses = "block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all";
  const labelClasses = "block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider";

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/employees"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Add New Employee</h1>
              <p className="text-gray-500 text-sm">Create a new user account and assign permissions.</p>
            </div>
          </div>

          <Card className="max-w-4xl mx-auto p-8 border-white/5">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Employee ID</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="e.g. EMP0001 (leave empty to auto-generate)"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="john@neuralarc.com"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Password *</label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Role *</label>
                    <select
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleChange}
                      className={inputClasses}
                    >
                      <option value="employee" className="bg-gray-900">Employee</option>
                      <option value="admin" className="bg-gray-900">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="e.g. Engineering"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="e.g. Senior Developer"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 my-8"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>
                {formData.role === 'employee' && (
                  <div>
                    <label className={labelClasses}>Reporting Admin</label>
                    <select
                      name="reportingAdmin"
                      value={formData.reportingAdmin}
                      onChange={handleChange}
                      className={inputClasses}
                    >
                      <option value="" className="bg-gray-900">Select Admin</option>
                      {admins.map((admin: any) => (
                        <option key={admin._id} value={admin._id} className="bg-gray-900">
                          {admin.name} - {admin.email} {admin.employeeId && `(${admin.employeeId})`}
                        </option>
                      ))}
                    </select>
                    {admins.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No admins available. Please create an admin user first.</p>
                    )}
                    {admins.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Found {admins.length} admin(s)</p>
                    )}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className={labelClasses}>Address</label>
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link
                  href="/employees"
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black hover:bg-primary/90 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading ? 'Saving...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

