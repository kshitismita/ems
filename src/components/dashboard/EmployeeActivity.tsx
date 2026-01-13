'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';

interface LoginRecord {
  _id: string;
  loginTime: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  breakStart?: string;
  breakEnd?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'leave';
  notes?: string;
  location?: string;
  totalHours?: number;
}

export default function EmployeeActivity() {
  const [activeTab, setActiveTab] = useState<'login' | 'attendance'>('login');
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    status: 'present' as const,
    notes: '',
    location: ''
  });

  useEffect(() => {
    fetchActivityData();
  }, [activeTab]);

  const fetchActivityData = async () => {
    try {
      const token = getLocalStorage('token');
      if (!token) return;

      setLoading(true);

      if (activeTab === 'login') {
        const response = await fetch('/api/employee-login-history?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setLoginHistory(data.loginHistory || []);
        }
      } else {
        const response = await fetch('/api/attendance?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setAttendance(data.attendance || []);
        }
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getLocalStorage('token');
      if (!token) return;

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceForm)
      });

      if (response.ok) {
        setShowAttendanceForm(false);
        setAttendanceForm({
          date: new Date().toISOString().split('T')[0],
          checkIn: '',
          checkOut: '',
          status: 'present',
          notes: '',
          location: ''
        });
        fetchActivityData();
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'late':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Employee Activity</h2>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'login' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('login')}
          >
            Login History
          </Button>
          <Button
            variant={activeTab === 'attendance' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </Button>
        </div>
      </div>

      {activeTab === 'attendance' && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAttendanceForm(!showAttendanceForm)}>
            {showAttendanceForm ? 'Cancel' : 'Update Attendance'}
          </Button>
        </div>
      )}

      {activeTab === 'attendance' && showAttendanceForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Update Attendance</h3>
          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={attendanceForm.date}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={attendanceForm.status}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half-day">Half Day</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check In
                </label>
                <input
                  type="time"
                  value={attendanceForm.checkIn}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Out
                </label>
                <input
                  type="time"
                  value={attendanceForm.checkOut}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={attendanceForm.location}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, location: e.target.value })}
                placeholder="Office / Remote / etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save Attendance</Button>
              <Button type="button" variant="outline" onClick={() => setShowAttendanceForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {activeTab === 'login' ? 'Login History' : 'Attendance Records'}
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'login' ? (
              loginHistory.length > 0 ? (
                loginHistory.map((record) => (
                  <div key={record._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {record.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{formatDate(record.loginTime)}</p>
                        <p className="text-sm text-gray-600">IP: {record.ipAddress}</p>
                        {record.failureReason && (
                          <p className="text-sm text-red-600">{record.failureReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No login history found</p>
              )
            ) : (
              attendance.length > 0 ? (
                attendance.map((record) => (
                  <div key={record._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            In: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                          {record.checkOut && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Out: {new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {record.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {record.location}
                            </span>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No attendance records found</p>
              )
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
