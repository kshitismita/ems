'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, Plus, TrendingUp, Briefcase, MessageSquare, LogOut } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/Layout';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';
import { useRouter, usePathname } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'leave' | 'work-from-home';
  notes?: string;
  totalHours?: number;
  isNewRecord?: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    checkIn: new Date().toTimeString().slice(0, 5), // Current time in HH:MM format
  });

  useEffect(() => {
    const token = getLocalStorage('token');
    const userData = getLocalStorage('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'employee') {
      router.push('/admin-dash');
      return;
    }

    fetchAttendance(token);
  }, [router]);

  const fetchAttendance = async (token: string) => {
    try {
      const response = await fetch('/api/attendance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const token = getLocalStorage('token');

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(prev => [data.attendance, ...prev]);
        setSuccess('Attendance marked successfully!');
        setShowMarkModal(false);

        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          checkIn: new Date().toTimeString().slice(0, 5)
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to mark attendance');
      }
    } catch (error) {
      setError('An error occurred while marking attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500/40 text-emerald-200 border-emerald-500/50 shadow-sm shadow-emerald-500/20';
      case 'absent': return 'bg-red-500/40 text-red-200 border-red-500/50 shadow-sm shadow-red-500/20';
      case 'late': return 'bg-orange-500/40 text-orange-200 border-orange-500/50 shadow-sm shadow-orange-500/20';
      case 'half-day': return 'bg-yellow-500/40 text-yellow-200 border-yellow-500/50 shadow-sm shadow-yellow-500/20';
      case 'holiday': return 'bg-purple-500/40 text-purple-200 border-purple-500/50 shadow-sm shadow-purple-500/20';
      case 'leave': return 'bg-blue-500/40 text-blue-200 border-blue-500/50 shadow-sm shadow-blue-500/20';
      case 'work-from-home': return 'bg-info/40 text-info/200 border-info/50 shadow-sm shadow-info/20';
      default: return 'bg-gray-500/40 text-gray-200 border-gray-500/50 shadow-sm shadow-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      case 'half-day': return <Clock className="w-4 h-4" />;
      case 'holiday': return <Calendar className="w-4 h-4" />;
      case 'leave': return <Calendar className="w-4 h-4" />;
      case 'work-from-home': return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">Daily Attendance</h1>
              <p className="text-muted-foreground mt-2 text-lg">Mark your daily attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMarkModal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:translate-y-[-1px]"
            >
              <Plus className="w-5 h-5" />
              Mark Attendance
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-emerald-300 font-medium text-lg">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-5 bg-destructive/20 border border-destructive/40 rounded-xl shadow-lg shadow-destructive/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-destructive/30 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-destructive font-medium text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        <Card className="p-8 border-border shadow-xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="w-6 h-6 bg-primary/20 p-1.5 rounded-lg shadow-md shadow-primary/20">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            Attendance History
          </h2>

          <div className="space-y-4">
            {attendance.length > 0 ? (
              attendance.map((record) => (
                <div key={record._id} className="p-5 bg-card/80 border border-border rounded-xl shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`px-4 py-2 rounded-full text-sm font-bold border flex items-center gap-2 shadow-sm backdrop-blur-sm ${getStatusColor(record.status)}`}>
                          <div className="w-4 h-4">
                            {getStatusIcon(record.status)}
                          </div>
                          <span className="uppercase tracking-wide">{record.status}</span>
                        </div>
                        <span className="text-sm text-muted-foreground font-medium bg-card/50 px-3 py-1 rounded-lg border border-border/50">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                        {record.isNewRecord && (
                          <span className="px-3 py-1.5 bg-blue-500/40 text-blue-300 text-sm rounded-full border border-blue-500/50 shadow-sm font-semibold">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        {record.checkIn && (
                          <div className="flex items-center gap-2 bg-card/50 px-3 py-2 rounded-lg border border-border/50">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">Check-in: {new Date(record.checkIn).toLocaleTimeString()}</span>
                          </div>
                        )}
                        {record.checkOut && (
                          <div className="flex items-center gap-2 bg-card/50 px-3 py-2 rounded-lg border border-border/50">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">Check-out: {new Date(record.checkOut).toLocaleTimeString()}</span>
                          </div>
                        )}
                        {record.totalHours && (
                          <div className="flex items-center gap-2 bg-card/50 px-3 py-2 rounded-lg border border-border/50">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-medium">Hours: {record.totalHours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {record.notes && (
                    <div className="mt-4 p-4 bg-card/60 rounded-xl border border-border/50">
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{record.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-card/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border shadow-lg">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg text-muted-foreground font-medium mb-2">No attendance records found</p>
                <p className="text-sm text-muted-foreground">Click "Mark Attendance" to record your daily attendance</p>
              </div>
            )}
          </div>
        </Card>

        {/* Mark Attendance Modal */}
        {showMarkModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen w-full p-4">
              <Card className="w-full max-w-md shadow-2xl shadow-primary/20 my-8">
                <div className="p-8 pb-4 flex items-center gap-4 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 p-2 shadow-lg shadow-primary/20">
                    <span className="text-primary-foreground font-bold text-xl">S</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Mark Attendance</h3>
                  <button
                    onClick={() => setShowMarkModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent ml-auto"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-4 bg-card/60 border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm focus:shadow-lg focus:shadow-primary/20 transition-all duration-300"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Check-in Time *</label>
                      <input
                        type="time"
                        value={formData.checkIn}
                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                        className="w-full px-4 py-4 bg-card/60 border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm focus:shadow-lg focus:shadow-primary/20 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowMarkModal(false)}
                      className="flex-1 px-6 py-4 bg-card hover:bg-accent text-foreground rounded-xl transition-all duration-300 font-semibold border border-border shadow-md hover:shadow-lg hover:translate-y-[-1px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:translate-y-[-1px]"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          <span>Marking...</span>
                        </div>
                      ) : (
                        'Mark Attendance'
                      )}
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
