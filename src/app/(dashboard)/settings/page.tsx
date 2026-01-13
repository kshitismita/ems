'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { getLocalStorage, setLocalStorage } from '@/lib/storage';
import { Card } from '@/components/ui/Card';
import {
    User,
    Shield,
    Bell,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Save,
    Loader2,
    Lock,
    LogOut
} from 'lucide-react';

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'employee';
    employeeId?: string;
    department?: string;
    designation?: string;
    phone?: string;
    address?: string;
    avatar?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
}

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'notifications'>('personal');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Security Form State
    const [securityForm, setSecurityForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Notifications State (Mock)
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        browserNotifications: false,
        marketingEmails: false
    });

    useEffect(() => {
        fetchProfile();
    }, [router]);

    const fetchProfile = async () => {
        try {
            const token = getLocalStorage('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data.user);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        setMessage(null);
        const token = getLocalStorage('token');

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: profile.phone,
                    address: profile.address,
                    emergencyContact: profile.emergencyContact
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully' });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred while saving' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (securityForm.newPassword !== securityForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setSaving(true);
        setMessage(null);
        const token = getLocalStorage('token');

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: securityForm.currentPassword,
                    newPassword: securityForm.newPassword
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully' });
                setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred while changing password' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!profile) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                    <p className="text-gray-400 mt-1">Manage your personal details and system preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar Tabs */}
                    <Card className="p-4 border-white/5 space-y-2 h-fit">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'personal'
                                ? 'bg-primary/20 text-cyan-300 border border-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Personal Details
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security'
                                ? 'bg-primary/20 text-cyan-300 border border-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications'
                                ? 'bg-primary/20 text-cyan-300 border border-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Bell className="w-4 h-4" />
                            Notifications
                        </button>
                    </Card>

                    {/* Main Content */}
                    <div className="md:col-span-3 space-y-6">
                        {message && (
                            <div className={`p-4 rounded-xl border ${message.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* Personal Details Tab */}
                        {activeTab === 'personal' && (
                            <Card className="p-6 border-white/5 space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                                        {profile.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                                        <p className="text-gray-400 capitalize">{profile.role}</p>
                                        {profile.employeeId && (
                                            <span className="text-xs text-gray-500">ID: {profile.employeeId}</span>
                                        )}
                                    </div>
                                </div>

                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={profile.name}
                                                    disabled
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="email"
                                                    value={profile.email}
                                                    disabled
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="tel"
                                                    value={profile.phone || ''}
                                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400">Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={profile.address || ''}
                                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                                    placeholder="Enter your address"
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/5 pt-6">
                                        <h3 className="text-sm font-medium text-white mb-4">Emergency Contact</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400">Contact Name</label>
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hidden" />
                                                <input
                                                    type="text"
                                                    value={profile.emergencyContact?.name || ''}
                                                    onChange={(e) => setProfile({
                                                        ...profile,
                                                        emergencyContact: { ...profile.emergencyContact!, name: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400">Relationship</label>
                                                <input
                                                    type="text"
                                                    value={profile.emergencyContact?.relationship || ''}
                                                    onChange={(e) => setProfile({
                                                        ...profile,
                                                        emergencyContact: { ...profile.emergencyContact!, relationship: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-400">Emergency Phone</label>
                                                <input
                                                    type="tel"
                                                    value={profile.emergencyContact?.phone || ''}
                                                    onChange={(e) => setProfile({
                                                        ...profile,
                                                        emergencyContact: { ...profile.emergencyContact!, phone: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </Card>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <Card className="p-6 border-white/5 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Security Settings</h2>
                                    <p className="text-sm text-gray-400">Manage your password and account security</p>
                                </div>

                                <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-md">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="password"
                                                value={securityForm.currentPassword}
                                                onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                                                required
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="password"
                                                value={securityForm.newPassword}
                                                onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                                                required
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="password"
                                                value={securityForm.confirmPassword}
                                                onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                                                required
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Update Password
                                        </button>
                                    </div>
                                </form>
                            </Card>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <Card className="p-6 border-white/5 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Notification Preferences</h2>
                                    <p className="text-sm text-gray-400">Choose how you receive updates</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">Email Alerts</h3>
                                                <p className="text-xs text-gray-400">Receive important updates via email</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifications.emailAlerts}
                                                onChange={() => setNotifications({ ...notifications, emailAlerts: !notifications.emailAlerts })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-white">Browser Notifications</h3>
                                                <p className="text-xs text-gray-400">Get push notifications in your browser</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifications.browserNotifications}
                                                onChange={() => setNotifications({ ...notifications, browserNotifications: !notifications.browserNotifications })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
