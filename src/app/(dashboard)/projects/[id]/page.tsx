'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { Card } from '@/components/ui/Card';
import {
    Plus, Trash, MessageSquare, FileJson, Download, Upload,
    ChevronRight, Info, ArrowLeft, User as UserIcon, Calendar, Edit, Trash2, Save, X,
    Link as LinkIcon, FileText, Clock, Search, Check, History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalStorage, removeLocalStorage } from '@/lib/storage';

interface Employee {
    _id: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    position?: string;
}

interface Remark {
    _id: string;
    text: string;
    createdBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    createdAt: string;
}

interface ProjectDocument {
    _id: string;
    name: string;
    url: string;
    fileType: string;
    size: number;
    uploadedBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    uploadedAt: string;
}

interface ReferenceLink {
    _id: string;
    title: string;
    url: string;
    addedBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    addedAt: string;
}



interface APIKey {
    _id: string;
    name: string;
    keyValue: string;
    description?: string;
    addedBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    addedAt: string;
    lastUsed?: string;
    lastUsedBy?: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    usageCount?: number;
}

interface Project {
    _id: string;
    name: string;
    description: string;
    status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    startDate: string;
    endDate?: string;
    deadline?: string;
    progress: number;
    admin: Employee;
    assignedEmployees: Employee[];
    createdBy: {
        _id: string;
        name: string;
        email: string;
        role: string;
    };
    tags?: string[];
    remarks?: Remark[];
    documents?: ProjectDocument[];
    referenceLinks?: ReferenceLink[];
    apiKeys?: APIKey[];
    createdAt: string;
    updatedAt: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'employee';
}

// Searchable Dropdown Component for Team Members
const SearchableEmployeeDropdown = ({
    employees,
    selectedEmployees,
    onEmployeeToggle,
    placeholder = "Search and select team members..."
}: {
    employees: Employee[];
    selectedEmployees: string[];
    onEmployeeToggle: (employeeId: string) => void;
    placeholder?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter employees based on search term
    const filteredEmployees = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedEmployeesData = employees.filter(emp => selectedEmployees.includes(emp._id));

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        {selectedEmployees.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedEmployeesData.slice(0, 3).map(employee => (
                                    <span
                                        key={employee._id}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20"
                                    >
                                        {employee.name}
                                    </span>
                                ))}
                                {selectedEmployees.length > 3 && (
                                    <span className="text-xs text-gray-400">
                                        +{selectedEmployees.length - 3} more
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-400">{placeholder}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {selectedEmployees.length} selected
                        </span>
                        <ChevronRight
                            className={cn(
                                "w-4 h-4 text-gray-400 transition-transform",
                                isOpen && "rotate-90"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Dropdown Content */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search employees..."
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Employee List */}
                    <div className="max-h-64 overflow-y-auto">
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(employee => {
                                const isSelected = selectedEmployees.includes(employee._id);
                                return (
                                    <div
                                        key={employee._id}
                                        onClick={() => {
                                            onEmployeeToggle(employee._id);
                                            setSearchTerm('');
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0",
                                            isSelected && "bg-primary/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/50"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">
                                                    {employee.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {employee.email}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-gray-400">
                                {searchTerm ? 'No employees found' : 'No employees available'}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {selectedEmployees.length > 0 && (
                        <div className="p-3 border-t border-white/10 bg-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    {selectedEmployees.length} member{selectedEmployees.length !== 1 ? 's' : ''} selected
                                </span>
                                <button
                                    onClick={() => {
                                        selectedEmployees.forEach(empId => onEmployeeToggle(empId));
                                        setSearchTerm('');
                                    }}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ProjectDetails({
    params,
    searchParams
}: {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const router = useRouter();
    const resolvedParams = params;
    const resolvedSearchParams = searchParams;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Project>>({});
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [activeTab, setActiveTab] = useState<'info' | 'remarks' | 'documents' | 'api'>('info');
    const [newRemark, setNewRemark] = useState('');
    const [remarkLoading, setRemarkLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [newReferenceLink, setNewReferenceLink] = useState({ title: '', url: '' });
    const [referenceLoading, setReferenceLoading] = useState(false);
    const [newApiKey, setNewApiKey] = useState({ name: '', keyValue: '', description: '' });
    const [apiKeyLoading, setApiKeyLoading] = useState(false);
    const [accessingKeyId, setAccessingKeyId] = useState<string | null>(null);
    const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
    const [keyLogs, setKeyLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [documentCategory, setDocumentCategory] = useState<'document' | 'api'>('document');

    useEffect(() => {
        const token = getLocalStorage('token');
        const userData = getLocalStorage('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        fetchProject(resolvedParams.id, token);

        // Only fetch employees if user is admin
        if (parsedUser.role === 'admin') {
            fetchEmployees(token);
        }

        // Check if edit mode is requested
        if (resolvedSearchParams.edit === 'true' && parsedUser.role === 'admin') {
            setIsEditing(true);
        }
    }, [resolvedParams.id, resolvedSearchParams.edit, router]);

    const fetchProject = async (id: string, token: string) => {
        try {
            console.log('Frontend - Fetching project with ID:', id);
            console.log('Frontend - Token length:', token.length);

            const response = await fetch(`/api/projects/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Frontend - Response status:', response.status);
            console.log('Frontend - Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('Frontend - Project data received:', !!data.project);
                setProject(data.project);
                setEditForm(data.project);
            } else if (response.status === 404) {
                setError('Project not found. The project may have been deleted or you don\'t have access to it.');
            } else if (response.status === 403) {
                setError('Access denied. You are not assigned to this project.');
            } else if (response.status === 401) {
                setError('Authentication failed. Please log in again.');
                // Clear invalid token
                removeLocalStorage('token');
                removeLocalStorage('user');
                router.push('/login');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Frontend - Error response:', errorData);
                setError(`Failed to fetch project details: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Frontend - Fetch error:', error);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async (token: string) => {
        try {
            const response = await fetch('/api/employees?limit=100', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setAllEmployees(data.employees || []);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm(project || {});
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm(project || {});
        setNewRemark('');
    };

    const handleSave = async () => {
        const token = getLocalStorage('token');
        if (!token) return;

        try {
            // Clean the data: convert objects to IDs for fields that might be populated
            const submitData = { ...editForm };

            // Explicitly handle fields that are populated but should be sent as IDs
            if (submitData.admin && typeof submitData.admin === 'object') {
                (submitData as any).admin = (submitData.admin as any)._id;
            }

            if (submitData.assignedEmployees && Array.isArray(submitData.assignedEmployees)) {
                submitData.assignedEmployees = submitData.assignedEmployees.map(
                    emp => typeof emp === 'object' ? (emp as any)._id : emp
                );
            }

            // Remove internal/readonly and complex fields that shouldn't be updated here
            // These have their own dedicated update handlers or are system managed
            const fieldsToRemove = [
                'createdBy', 'createdAt', 'updatedAt', '__v', '_id',
                'remarks', 'documents', 'workflow', 'apiKeys'
            ];

            fieldsToRemove.forEach(field => {
                delete (submitData as any)[field];
            });

            // Debug: Log what data is being sent
            console.log('Project Update - Submit data:', JSON.stringify(submitData, null, 2));
            console.log('Project Update - Admin field:', (submitData as any).admin);

            const response = await fetch(`/api/projects/${project?._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
                setIsEditing(false);
                setError('');
            } else {
                const errorData = await response.json();
                console.error('Project Update - Error response:', errorData);

                // Handle validation errors specifically
                if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
                    const errorMessages = errorData.validationErrors.map((err: any) =>
                        `${err.field}: ${err.message}`
                    ).join(', ');
                    setError(`Validation failed: ${errorMessages}`);
                } else {
                    setError(errorData.error || errorData.details || 'Failed to update project');
                }
            }
        } catch (error) {
            setError('An error occurred while updating project');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

        const token = getLocalStorage('token');
        if (!token) return;

        setDeleteLoading(true);
        try {
            const response = await fetch(`/api/projects/${project?._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                router.push('/projects');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to delete project');
            }
        } catch (error) {
            setError('An error occurred while deleting project');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm({
            ...editForm,
            [name]: name === 'progress' ? parseInt(value) : value,
        });
    };

    const handleEmployeeToggle = (employeeId: string) => {
        const currentEmployees = editForm.assignedEmployees?.map(e => typeof e === 'string' ? e : e._id) || [];
        const isAssigned = currentEmployees.includes(employeeId);

        if (isAssigned) {
            setEditForm({
                ...editForm,
                assignedEmployees: currentEmployees.filter(id => id !== employeeId) as any,
            });
        } else {
            setEditForm({
                ...editForm,
                assignedEmployees: [...currentEmployees, employeeId] as any,
            });
        }
    };

    const handleAddRemark = async () => {
        if (!newRemark.trim() || !project) return;

        const token = getLocalStorage('token');
        if (!token) return;

        setRemarkLoading(true);
        try {
            const response = await fetch(`/api/projects/${project._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ remark: newRemark }),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
                setNewRemark('');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add remark');
            }
        } catch (error) {
            setError('An error occurred while adding remark');
        } finally {
            setRemarkLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !project) return;

        const token = getLocalStorage('token');
        if (!token) return;

        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/projects/${project._id}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to upload document');
            }
        } catch (error) {
            setError('An error occurred while uploading document');
        } finally {
            setUploadLoading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleAddReferenceLink = async () => {
        if (!newReferenceLink.title.trim() || !project) return;

        const token = getLocalStorage('token');
        if (!token) return;

        setReferenceLoading(true);
        try {
            const response = await fetch(`/api/projects/${project._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ referenceLink: newReferenceLink }),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
                setNewReferenceLink({ title: '', url: '' });
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add reference link');
            }
        } catch (error) {
            setError('An error occurred while adding reference link');
        } finally {
            setReferenceLoading(false);
        }
    };

    const handleDeleteReferenceLink = async (referenceLinkId: string) => {
        if (!confirm('Are you sure you want to delete this reference link?')) return;

        const token = getLocalStorage('token');
        if (!token || !project) return;

        setReferenceLoading(true);
        try {
            const response = await fetch(`/api/projects/${project._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deleteReferenceLink: referenceLinkId }),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to remove reference link');
            }
        } catch (error) {
            setError('An error occurred while removing reference link');
        } finally {
            setReferenceLoading(false);
        }
    };

    const handleAddApiKey = async () => {
        if (!newApiKey.name.trim() || !newApiKey.keyValue.trim() || !project) return;

        const token = getLocalStorage('token');
        if (!token) return;

        setApiKeyLoading(true);
        try {
            const response = await fetch(`/api/projects/${project._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: newApiKey }),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
                setNewApiKey({ name: '', keyValue: '', description: '' });
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add API key');
            }
        } catch (error) {
            setError('An error occurred while adding API key');
        } finally {
            setApiKeyLoading(false);
        }
    };

    const handleDeleteApiKey = async (apiKeyId: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;

        const token = getLocalStorage('token');
        if (!token || !project) return;

        setApiKeyLoading(true);
        try {
            const response = await fetch(`/api/projects/${project._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deleteApiKey: apiKeyId }),
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data.project);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to remove API key');
            }
        } catch (error) {
            setError('An error occurred while removing API key');
        } finally {
            setApiKeyLoading(false);
        }
    };

    const handleAccessApiKey = async (apiKeyId: string) => {
        if (!project) return;

        setAccessingKeyId(apiKeyId);
        try {
            const token = getLocalStorage('token');
            if (!token) return;

            const response = await fetch(`/api/projects/${project._id}/api-keys/${apiKeyId}/access`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Copy the API key to clipboard
                navigator.clipboard.writeText(data.apiKey.keyValue);

                // Show success message (optional)
                console.log('API key accessed and copied to clipboard');

                // Refresh project data to update usage count
                const projectResponse = await fetch(`/api/projects/${project._id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (projectResponse.ok) {
                    const projectData = await projectResponse.json();
                    setProject(projectData.project);
                }
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to access API key');
            }
        } catch (error) {
            setError('An error occurred while accessing API key');
        } finally {
            setAccessingKeyId(null);
        }
    };

    const fetchKeyLogs = async (apiKeyId: string) => {
        if (!project) return;

        setLogsLoading(true);
        try {
            const token = getLocalStorage('token');
            if (!token) return;

            const response = await fetch(`/api/projects/${project._id}/api-keys/${apiKeyId}/logs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setKeyLogs(data.logs || []);
            } else {
                console.error('Failed to fetch logs');
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleViewLogs = (apiKeyId: string) => {
        setViewingLogsId(apiKeyId);
        fetchKeyLogs(apiKeyId);
    };

    // Check if current user is admin
    const isAdmin = user?.role === 'admin';

    // Check if current user is assigned to the project
    const isAssigned = project?.assignedEmployees?.some(emp => emp._id === user?._id) || false;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project && error) {
        return (
            <DashboardLayout>
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Project Not Found</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/projects')}
                        className="px-4 py-2 bg-primary text-black rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const currentAssignedEmployees = isEditing
        ? (editForm.assignedEmployees?.map(e => typeof e === 'string' ? e : e._id) || [])
        : [];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/projects')}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Project Details</h1>
                            <p className="text-gray-500 text-sm">
                                {isAdmin ? 'View and manage project information' : 'View project information'}
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'info' ? "bg-primary text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Info className="w-4 h-4" />
                        Project Info
                    </button>
                    <button
                        onClick={() => setActiveTab('remarks')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'remarks' ? "bg-primary text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Remarks ({project?.remarks?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'api' ? "bg-primary text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <FileJson className="w-4 h-4" />
                        Reference URLs ({project?.referenceLinks?.length || 0}) & API Keys ({project?.apiKeys?.length || 0})
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main Content Area */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* Tab Content with Enhanced Layout */}
                        {activeTab === 'info' && (
                            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                                <div className="p-8">
                                    <div className="space-y-8">
                                        {/* Project Header */}
                                        <div className="flex items-start justify-between mb-8">
                                            <div>
                                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                                                    {project?.name}
                                                </h2>
                                                <p className="text-gray-400 max-w-2xl">{project?.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={editForm.status}
                                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled' })}
                                                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        >
                                                            <option value="planning" className="bg-zinc-900">Planning</option>
                                                            <option value="active" className="bg-zinc-900">Active</option>
                                                            <option value="on-hold" className="bg-zinc-900">On Hold</option>
                                                            <option value="completed" className="bg-zinc-900">Completed</option>
                                                            <option value="cancelled" className="bg-zinc-900">Cancelled</option>
                                                        </select>
                                                        <select
                                                            value={editForm.priority}
                                                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                                                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        >
                                                            <option value="low" className="bg-zinc-900">Low</option>
                                                            <option value="medium" className="bg-zinc-900">Medium</option>
                                                            <option value="high" className="bg-zinc-900">High</option>
                                                            <option value="critical" className="bg-zinc-900">Critical</option>
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={cn(
                                                            "inline-flex px-3 py-1 rounded-full text-sm font-medium border",
                                                            project?.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                project?.status === 'planning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                    project?.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                                                        project?.status === 'on-hold' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                                        )}>
                                                            {project?.status}
                                                        </span>
                                                        <span className={cn(
                                                            "inline-flex px-3 py-1 rounded-full text-sm font-medium border ml-2",
                                                            project?.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                project?.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                                    project?.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                        'bg-green-500/10 text-green-400 border-green-500/20'
                                                        )}>
                                                            {project?.priority}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Project Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Timeline Card */}
                                            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                                                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Timeline
                                                </h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">Start Date</span>
                                                        <span className="text-sm text-white font-medium">{new Date(project?.startDate || '').toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">End Date</span>
                                                        <span className="text-sm text-white font-medium">
                                                            {project?.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">Deadline</span>
                                                        <span className="text-sm text-white font-medium">
                                                            {project?.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Card */}
                                            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                                                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Progress</h3>
                                                <div className="space-y-3">
                                                    {isEditing ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-4">
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={editForm.progress}
                                                                    onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                                                                    className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={editForm.progress}
                                                                    onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                                                                    className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-sm text-white font-medium">{project?.progress}%</span>
                                                                <span className="text-xs text-gray-500">Complete</span>
                                                            </div>
                                                            <div className="w-full bg-white/10 rounded-full h-3">
                                                                <div
                                                                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                                    style={{ width: `${project?.progress || 0}%` }}
                                                                ></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Members */}
                                        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                                            <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">
                                                Team Members ({project?.assignedEmployees?.length || 0})
                                            </h3>
                                            {isEditing ? (
                                                <SearchableEmployeeDropdown
                                                    employees={allEmployees}
                                                    selectedEmployees={currentAssignedEmployees}
                                                    onEmployeeToggle={handleEmployeeToggle}
                                                    placeholder="Search and select team members..."
                                                />
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {project?.assignedEmployees.map((employee) => (
                                                        <div
                                                            key={employee._id}
                                                            className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group"
                                                        >
                                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                                {employee?.name?.charAt(0).toUpperCase() || '?'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">{employee?.name || 'Unknown'}</div>
                                                                <div className="text-xs text-gray-500 truncate">{employee?.position || employee?.email || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'remarks' && (
                            <Card className="p-6 border-white/5">
                                <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Project Remarks
                                </h3>

                                <div className="space-y-6">
                                    {/* Add Remark */}
                                    <div className="space-y-3">
                                        <textarea
                                            value={newRemark}
                                            onChange={(e) => setNewRemark(e.target.value)}
                                            placeholder="Add a remark or update about the project..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleAddRemark}
                                                disabled={!newRemark.trim() || remarkLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                                            >
                                                {remarkLoading ? (
                                                    <div className="w-4 h-4 border-2 border-black/20 border-b-black rounded-full animate-spin"></div>
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                                Post Remark
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remarks List */}
                                    <div className="space-y-4">
                                        {project?.remarks && project.remarks.length > 0 ? (
                                            [...project.remarks].reverse().map((remark) => (
                                                <div key={remark._id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                                {remark.createdBy?.name?.charAt(0).toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{remark.createdBy?.name || 'Unknown User'}</p>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-tight">{remark.createdBy?.role || 'User'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-gray-500">{new Date(remark.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{remark.text}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                                <p className="text-gray-500 text-sm">No remarks yet. Be the first to post!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeTab === 'api' && (
                            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                                <div className="p-8">
                                    {/* Reference URLs Section */}
                                    <div className="mb-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                    <LinkIcon className="w-4 h-4" />
                                                </div>
                                                Reference URLs
                                                <span className="ml-auto text-sm text-gray-400 bg-blue-500/10 px-3 py-1 rounded-full">
                                                    {project?.referenceLinks?.length || 0} URLs
                                                </span>
                                            </h3>
                                        </div>

                                        {/* Add Reference Link - All Users */}
                                        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-medium text-white">Add New Reference URL</h4>
                                                <div className="w-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    value={newReferenceLink.title}
                                                    onChange={(e) => setNewReferenceLink({ ...newReferenceLink, title: e.target.value })}
                                                    placeholder="Title (e.g. Documentation, API Reference)"
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                                                />
                                                <input
                                                    type="url"
                                                    value={newReferenceLink.url}
                                                    onChange={(e) => setNewReferenceLink({ ...newReferenceLink, url: e.target.value })}
                                                    placeholder="https://example.com"
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all font-mono text-sm"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleAddReferenceLink}
                                                    disabled={!newReferenceLink.title.trim() || referenceLoading}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg"
                                                >
                                                    {referenceLoading ? (
                                                        <div className="w-4 h-4 border-2 border-white/20 border-b-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-4 h-4" />
                                                            Add Reference URL
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Reference Links List */}
                                        <div className="space-y-3">
                                            {project?.referenceLinks && project.referenceLinks.length > 0 ? (
                                                project.referenceLinks.map((link) => (
                                                    <div key={link._id} className="group bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200">
                                                        <div className="p-4">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 min-w-0 mr-4">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                                            <LinkIcon className="w-4 h-4 text-blue-400" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{link.title}</h4>
                                                                            <p className="text-xs text-gray-500">Added by {link.addedBy?.name || 'Unknown'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 bg-black/30 px-3 py-2 rounded-lg font-mono text-xs text-gray-300 truncate">
                                                                            {link.url}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-2">
                                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                                        {new Date(link.addedAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <a
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-all"
                                                                        title="Open Link"
                                                                    >
                                                                        <LinkIcon className="w-4 h-4" />
                                                                    </a>
                                                                    <button
                                                                        onClick={() => navigator.clipboard.writeText(link.url)}
                                                                        className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 rounded-lg transition-all"
                                                                        title="Copy URL"
                                                                    >
                                                                        <FileJson className="w-4 h-4" />
                                                                    </button>
                                                                    {(isAdmin || link.addedBy?._id === user?._id) && (
                                                                        <button
                                                                            onClick={() => handleDeleteReferenceLink(link._id)}
                                                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all"
                                                                            title="Delete Reference Link"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                    <LinkIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                                    <h4 className="text-lg font-medium text-gray-500 mb-2">No Reference URLs</h4>
                                                    <p className="text-sm text-gray-400">Add reference URLs to share important links and resources</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* API Keys Section */}
                                    <div className="border-t border-white/10 pt-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                                                    <FileJson className="w-4 h-4" />
                                                </div>
                                                API Keys
                                                <span className="ml-auto text-sm text-gray-400 bg-yellow-500/10 px-3 py-1 rounded-full">
                                                    {project?.apiKeys?.length || 0} Keys
                                                </span>
                                            </h3>
                                        </div>

                                        {/* Add API Key - Admin Only */}
                                        {isAdmin && (
                                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4 mb-4">
                                                <h5 className="text-sm font-medium text-white">Add New API Key</h5>
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={newApiKey.name}
                                                        onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                                                        placeholder="Key Name (e.g. Google Maps API)"
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    />
                                                    <input
                                                        type="password"
                                                        value={newApiKey.keyValue}
                                                        onChange={(e) => setNewApiKey({ ...newApiKey, keyValue: e.target.value })}
                                                        placeholder="API Key Value"
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newApiKey.description}
                                                        onChange={(e) => setNewApiKey({ ...newApiKey, description: e.target.value })}
                                                        placeholder="Description (optional)"
                                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    />
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={handleAddApiKey}
                                                        disabled={!newApiKey.name.trim() || !newApiKey.keyValue.trim() || apiKeyLoading}
                                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all disabled:opacity-50 text-sm"
                                                    >
                                                        {apiKeyLoading ? (
                                                            <div className="w-4 h-4 border-2 border-black/20 border-b-black rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Plus className="w-4 h-4" />
                                                        )}
                                                        Add API Key
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* API Keys List */}
                                        <div className="space-y-3">
                                            {project?.apiKeys && project.apiKeys.length > 0 ? (
                                                project.apiKeys.map((apiKey) => (
                                                    <div key={apiKey._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                                        <div className="flex-1 min-w-0 mr-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="text-sm font-medium text-white truncate">{apiKey.name}</p>
                                                                <span className="text-[10px] text-gray-500">• Added by {apiKey.addedBy?.name || 'Unknown'}</span>
                                                                {apiKey.usageCount ? (
                                                                    <span className="text-[10px] text-yellow-400">
                                                                        • Used {apiKey.usageCount} times {apiKey.lastUsedBy ? `(last by ${apiKey.lastUsedBy.name})` : ''}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            {apiKey.description && (
                                                                <p className="text-xs text-gray-400 mb-2">{apiKey.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-[11px] text-gray-400 bg-black/30 px-2 py-0.5 rounded font-mono">
                                                                    {'•'.repeat(20)} (hidden)
                                                                </div>
                                                            </div>
                                                            {apiKey.lastUsed && (
                                                                <p className="text-[10px] text-gray-500 mt-1">Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleAccessApiKey(apiKey._id)}
                                                                disabled={accessingKeyId === apiKey._id}
                                                                className="p-2 bg-white/5 hover:bg-green-500/10 text-gray-400 hover:text-green-400 rounded-lg transition-all disabled:opacity-50"
                                                                title="Copy API Key (logs access and copies to clipboard)"
                                                            >
                                                                {accessingKeyId === apiKey._id ? (
                                                                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <FileJson className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewLogs(apiKey._id)}
                                                                className="p-2 bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg transition-all"
                                                                title="View Access History"
                                                            >
                                                                <HistoryIcon className="w-4 h-4" />
                                                            </button>
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={() => handleDeleteApiKey(apiKey._id)}
                                                                    className="p-2 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                                                                    title="Delete API Key"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                                                    <FileJson className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                                    <p className="text-gray-500 text-sm">No API keys added yet.</p>
                                                    {!isAdmin && (
                                                        <p className="text-xs text-gray-400 mt-1">Contact admin to add API keys</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <Card className="p-4 sm:p-6 border-white/5 max-w-full overflow-hidden">
                                {/* Header - Responsive Layout */}
                                <div className="mb-6">
                                    {/* Title Section */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="w-4 h-4" />
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                            Project Documents
                                        </h3>
                                    </div>

                                    {/* Controls Section - Responsive Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Category Selector */}
                                        <div className="flex items-center">
                                            <select
                                                value={documentCategory}
                                                onChange={(e) => setDocumentCategory(e.target.value as 'document' | 'api')}
                                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            >
                                                <option value="document">Documents</option>
                                                <option value="api">API Keys</option>
                                            </select>
                                        </div>

                                        {/* Hidden file input - always present */}
                                        <input
                                            type="file"
                                            id="file-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={uploadLoading}
                                        />

                                        {/* Upload button - only show for document category */}
                                        {documentCategory === 'document' && (
                                            <div className="flex items-center">
                                                <label
                                                    htmlFor="file-upload"
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all cursor-pointer w-full text-sm",
                                                        uploadLoading && "opacity-50 pointer-events-none"
                                                    )}
                                                >
                                                    {uploadLoading ? (
                                                        <div className="w-3 h-3 border-2 border-white/20 border-b-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <Upload className="w-3 h-3 text-primary" />
                                                    )}
                                                    <span className="hidden sm:inline">Upload File</span>
                                                    <span className="sm:hidden">Upload</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {documentCategory === 'document' && (
                                    <div className="space-y-2">
                                        {project?.documents && project.documents.length > 0 ? (
                                            [...project.documents].reverse().map((doc) => (
                                                <div key={doc._id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors group min-w-0">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                                                            <FileText className="w-3 h-3" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-medium text-white truncate">{doc.name}</p>
                                                            <div className="flex items-center gap-1 text-[8px] text-gray-500">
                                                                <span>{(doc.size / 1024).toFixed(1)} KB</span>
                                                                <span>•</span>
                                                                <span className="hidden sm:inline">{doc.uploadedBy?.name || 'Unknown'}</span>
                                                                <span className="sm:hidden">User</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-white/5 hover:bg-primary text-gray-400 hover:text-black rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                        title="Download document"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                                                <FileJson className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                                                <p className="text-gray-500 text-xs">No documents uploaded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="xl:col-span-1 space-y-6">
                        {/* Project Admin Card */}
                        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Project Admin</h3>
                                    <div className="w-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shadow-lg">
                                        {project?.admin?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base font-semibold text-white group-hover:text-primary transition-colors">{project?.admin?.name || 'Unassigned'}</div>
                                        <div className="text-sm text-gray-400">{project?.admin?.email || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Creator Info Card */}
                        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Created By</h3>
                                    <div className="w-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{project?.createdBy?.name || 'System'}</div>
                                            <div className="text-xs text-gray-500">{project?.createdBy?.role || 'Unknown'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">
                                                {new Date(project?.createdAt || '').toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">Created</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Card */}
                        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h3>
                                    <div className="w-2 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
                                </div>
                                <div className="space-y-3">
                                    {!isEditing && (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={handleEdit}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5 w-full justify-center"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit Project
                                            </button>

                                            <button
                                                onClick={handleDelete}
                                                disabled={deleteLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors disabled:opacity-50 w-full justify-center"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {deleteLoading ? 'Deleting...' : 'Delete Project'}
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
                            </div>
                        </div>

                        {/* Timeline Card */}
                        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.08] backdrop-blur-sm">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Timeline</h3>
                                    <div className="w-2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">Last Updated</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(project?.updatedAt || '').toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Logs Modal */}
            {viewingLogsId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <HistoryIcon className="w-5 h-5 text-primary" />
                                API Key Access History
                            </h3>
                            <button
                                onClick={() => setViewingLogsId(null)}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {logsLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : keyLogs.length > 0 ? (
                                keyLogs.map((log) => (
                                    <div key={log._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {log.userName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{log.userName}</p>
                                                <p className="text-xs text-gray-500 font-mono">IP: {log.ipAddress || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No access logs found for this API key.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}