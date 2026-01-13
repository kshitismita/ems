'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import AuthGuard from '@/components/auth/AuthGuard';

import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Filter,
  Search,
  AlertCircle,
  Mail,
  Phone,
  X,
  ChevronRight,
  Info,
  Edit2,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  employeeId?: string;
}

interface LeaveRequest {
  _id: string;
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
}

export default function AdminLeaveManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    type: '' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: ''
  });

  const leaveTypes = [
    { value: 'sick', label: 'Sick Leave', color: 'red' },
    { value: 'vacation', label: 'Vacation', color: 'blue' },
    { value: 'personal', label: 'Personal Leave', color: 'purple' },
    { value: 'maternity', label: 'Maternity Leave', color: 'pink' },
    { value: 'paternity', label: 'Paternity Leave', color: 'cyan' },
    { value: 'bereavement', label: 'Bereavement Leave', color: 'gray' },
    { value: 'unpaid', label: 'Unpaid Leave', color: 'orange' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'admin') {
      router.push('/employee-dash');
      return;
    }

    fetchLeaveRequests(token);
  }, [router, filters.status, filters.type]);

  const fetchLeaveRequests = async (token: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/leave?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/leave/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (response.ok) {
        setLeaveRequests(leaveRequests.map(req =>
          req._id === requestId
            ? { ...req, status: 'approved', approvedBy: user!, approvedAt: new Date().toISOString() }
            : req
        ));
        // Update selected request if dynamic update is needed
        if (selectedRequest?._id === requestId) {
          setSelectedRequest({ ...selectedRequest, status: 'approved', approvedBy: user!, approvedAt: new Date().toISOString() });
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to approve leave request');
      }
    } catch (error) {
      alert('An error occurred while approving the leave request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(selectedRequest._id);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/leave/${selectedRequest._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        const updatedReq: LeaveRequest = {
          ...selectedRequest,
          status: 'rejected',
          approvedBy: user!,
          approvedAt: new Date().toISOString(),
          rejectionReason: rejectionReason.trim()
        };
        setLeaveRequests(leaveRequests.map(req =>
          req._id === selectedRequest._id ? updatedReq : req
        ));
        setSelectedRequest(updatedReq);
        setShowRejectModal(false);
        setRejectionReason('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to reject leave request');
      }
    } catch (error) {
      alert('An error occurred while rejecting the leave request');
    } finally {
      setProcessing(null);
    }
  };

  const handleEdit = () => {
    if (!selectedRequest) return;
    setEditForm({
      type: selectedRequest.type,
      startDate: selectedRequest.startDate.split('T')[0],
      endDate: selectedRequest.endDate.split('T')[0],
      reason: selectedRequest.reason
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;
    setProcessing(selectedRequest._id);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/leave/${selectedRequest._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const { leaveRequest: updatedReq } = await response.json();
        setLeaveRequests(leaveRequests.map(req =>
          req._id === selectedRequest._id ? updatedReq : req
        ));
        setSelectedRequest(updatedReq);
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update leave request');
      }
    } catch (error) {
      alert('An error occurred while updating the leave request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      cancelled: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };
    const style = styles[status as keyof typeof styles] || styles.pending;
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", style)}>
        {status}
      </span>
    );
  };

  const columns = [
    {
      key: 'employee.name' as any,
      label: 'Employee Name',
      sortable: true,
      render: (_: any, item: LeaveRequest) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-inner">
            {item.employee?.name?.charAt(0) || '?'}
          </div>
          <span className="font-medium text-white">{item.employee?.name || 'Unknown Employee'}</span>
        </div>
      )
    },
    {
      key: 'employee.employeeId' as any,
      label: 'Employee ID',
      sortable: true,
      render: (_: any, item: LeaveRequest) => (
        <span className="text-gray-400 font-mono text-xs">{item.employee?.employeeId || 'N/A'}</span>
      )
    },
    {
      key: 'status' as any,
      label: 'Leave Status',
      sortable: true,
      render: (value: string) => getStatusBadge(value)
    }
  ];

  const filteredData = leaveRequests.filter(req =>
    req.employee?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
    (req.employee?.employeeId && req.employee.employeeId.toLowerCase().includes(filters.search.toLowerCase())) ||
    req.reason.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="relative min-h-screen">
          <div className={cn("transition-all duration-300", showDetailPanel ? "pr-0 lg:pr-[400px]" : "pr-0")}>
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Leave Management</h1>
                  <p className="text-gray-400 mt-1">Review and manage employee leave requests</p>
                </div>
              </div>

              {/* Filters */}
              <Card className="p-6 border-white/5 bg-white/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search employees or reasons..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer text-sm"
                      >
                        <option value="" className="bg-gray-950">All Status</option>
                        <option value="pending" className="bg-gray-950">Pending</option>
                        <option value="approved" className="bg-gray-950">Approved</option>
                        <option value="rejected" className="bg-gray-950">Rejected</option>
                        <option value="cancelled" className="bg-gray-950">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Type</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer text-sm"
                      >
                        <option value="" className="bg-gray-950">All Types</option>
                        {leaveTypes.map((type) => (
                          <option key={type.value} value={type.value} className="bg-gray-950">
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Main Content Table */}
              <DataTable
                data={filteredData}
                columns={columns}
                onRowClick={(item) => {
                  setSelectedRequest(item);
                  setShowDetailPanel(true);
                  setIsEditing(false);
                }}
                loading={loading}
                emptyMessage="No leave requests found matching your filters."
                searchable={false}
                className="border-none bg-transparent shadow-none"
              />
            </div>
          </div>

          {/* Detail Panel Placeholder/Spacer for Mobile */}
          <div className="h-20 lg:hidden" />

          {/* Detail Sidebar / Modal */}
          <AnimatePresence>
            {showDetailPanel && selectedRequest && (
              <>
                {/* Backdrop for Mobile */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDetailPanel(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                />

                {/* Drawer Content */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] lg:w-[400px] bg-gray-950 border-l border-white/10 z-[70] shadow-2xl flex flex-col"
                >
                  {/* Drawer Header */}
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Leave Details</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Reference ID: {selectedRequest._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailPanel(false);
                        setIsEditing(false);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Body - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Type & Status */}
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg",
                          (isEditing ? editForm.type : selectedRequest.type) === 'sick' ? "bg-red-500/20 border-red-500/30 text-red-400" :
                            (isEditing ? editForm.type : selectedRequest.type) === 'vacation' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" :
                              "bg-primary/20 border-primary/30 text-primary"
                        )}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Leave Type</p>
                          {isEditing ? (
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                              className="bg-transparent text-sm font-bold text-white focus:outline-none border-b border-white/20 pb-1"
                            >
                              {leaveTypes.map(t => (
                                <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-sm font-bold text-white capitalize">{selectedRequest.type.replace('_', ' ')}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(selectedRequest.status)}
                    </div>

                    {/* Employee Info */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Employee Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-600 uppercase font-bold">Full Name</p>
                          <p className="text-sm text-white font-medium">{selectedRequest.employee?.name || 'Unknown Employee'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-600 uppercase font-bold">Employee ID</p>
                          <p className="text-sm text-gray-300 font-mono">{selectedRequest.employee.employeeId || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <p className="text-[10px] text-gray-600 uppercase font-bold">Email Address</p>
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            {selectedRequest.employee?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Date & Duration */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Schedule</h3>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 space-y-1 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-600 uppercase font-bold">Start Date</p>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                              className="bg-transparent text-sm text-white font-semibold focus:outline-none w-full"
                            />
                          ) : (
                            <p className="text-sm text-white font-semibold">{new Date(selectedRequest.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                        <div className="flex-1 space-y-1 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-600 uppercase font-bold">End Date</p>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.endDate}
                              onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                              className="bg-transparent text-sm text-white font-semibold focus:outline-none w-full"
                            />
                          ) : (
                            <p className="text-sm text-white font-semibold">{new Date(selectedRequest.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-primary font-bold px-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Total Duration: {selectedRequest.days} {selectedRequest.days === 1 ? 'Day' : 'Days'}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Reason for Leave</h3>
                        {!isEditing && selectedRequest.status === 'pending' && (
                          <button
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 font-bold uppercase tracking-wider transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit Details
                          </button>
                        )}
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        {isEditing ? (
                          <textarea
                            value={editForm.reason}
                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            className="w-full bg-transparent text-sm text-gray-300 leading-relaxed italic focus:outline-none resize-none"
                            rows={4}
                          />
                        ) : (
                          <p className="text-sm text-gray-300 leading-relaxed italic">"{selectedRequest.reason}"</p>
                        )}
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    {selectedRequest.emergencyContact && (
                      <div className="space-y-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-primary" />
                          <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Emergency Contact</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Contact Name</p>
                            <p className="text-sm text-white font-medium">{selectedRequest.emergencyContact.name}</p>
                            <p className="text-[10px] text-gray-600">({selectedRequest.emergencyContact.relationship})</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Phone Number</p>
                            <div className="flex items-center gap-2 text-sm text-white font-medium">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              {selectedRequest.emergencyContact.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approval Info */}
                    {selectedRequest.status !== 'pending' && selectedRequest.approvedBy && (
                      <div className="space-y-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Processing History</h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-1.5" />
                            <p className="text-sm text-gray-400">
                              Action taken by <span className="text-white font-medium">{selectedRequest.approvedBy.name}</span> on {new Date(selectedRequest.approvedAt!).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedRequest.rejectionReason && (
                            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 ml-2">
                              <p className="text-[10px] text-rose-400 uppercase font-bold mb-1">Rejection Remarks</p>
                              <p className="text-xs text-rose-300 italic">"{selectedRequest.rejectionReason}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Applied Date Footer */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                      <span>Requested On</span>
                      <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Drawer Footer - Actions */}
                  {selectedRequest.status === 'pending' && (
                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            disabled={!!processing}
                            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={!!processing}
                            className="flex-1 py-3 px-4 bg-primary text-black hover:bg-primary/90 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 disabled:opacity-50"
                          >
                            {processing === selectedRequest._id ? (
                              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Changes
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowRejectModal(true)}
                            disabled={!!processing}
                            className="flex-1 py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(selectedRequest._id)}
                            disabled={!!processing}
                            className="flex-1 py-3 px-4 bg-primary text-black hover:bg-primary/90 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 disabled:opacity-50"
                          >
                            {processing === selectedRequest._id ? (
                              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Reject Modal - Overlays everything */}
          {showRejectModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gray-950 border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl relative overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />

                <div className="relative">
                  <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <XCircle className="w-8 h-8 text-rose-500" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Reject Leave Request</h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    Provide a justification for rejecting <span className="text-white font-semibold">{selectedRequest.employee?.name || 'this employee'}</span>'s request. This will be visible to the employee.
                  </p>

                  <div className="space-y-2 mb-8">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g., Critical project deadline, lack of resource coverage..."
                      rows={4}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all shadow-inner text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectionReason('');
                      }}
                      className="flex-1 py-4 text-white font-bold rounded-2xl hover:bg-white/5 transition-all text-sm uppercase tracking-widest border border-white/10"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing === selectedRequest._id || !rejectionReason.trim()}
                      className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                    >
                      {processing === selectedRequest._id ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
                      ) : (
                        'Reject'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
