'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/Layout';
import { DataTable } from '@/components/ui/DataTable';
import {
    Search, FolderOpen, Download, Plus, X,
    FileText, Upload, Filter, Tag,
    ShieldCheck, UserPlus, Scale, Library, MessageSquare, Link as LinkIcon, Trash2, Key, History as HistoryIcon, Clock, FileJson
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalStorage } from '@/lib/storage';

interface Document {
    _id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    url: string;
    isPublic: boolean;
    uploadedBy: {
        _id: string;
        name: string;
    };
    createdAt: string;
    downloads: number;
    apiKeyDetails?: {
        keyValue: string;
        description?: string;
        usageCount: number;
        lastUsed?: string;
        lastUsedBy?: string;
    };
}

const CATEGORIES = [
    { id: 'all', name: 'All Resources', icon: FolderOpen },
    { id: 'policy', name: 'Policy Docs', icon: ShieldCheck },
    { id: 'onboarding', name: 'Onboarding', icon: UserPlus },
    { id: 'compliance', name: 'Compliance', icon: Scale },
    { id: 'training', name: 'Training', icon: Library },
    { id: 'prompts', name: 'Prompt Lib', icon: MessageSquare },
    { id: 'links', name: 'Ref Links', icon: LinkIcon },
    { id: 'api-keys', name: 'API Keys', icon: Key },
    { id: 'other', name: 'Other', icon: FileText }
];

export default function ReferenceLibraryPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [accessingKeyId, setAccessingKeyId] = useState<string | null>(null);
    const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
    const [keyLogs, setKeyLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);

    // Upload Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'other',
        tags: '',
        url: '',
        isPublic: true
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const token = getLocalStorage('token');
        const userRaw = getLocalStorage('user');
        if (!token || !userRaw) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(userRaw);
        setUser(user);
        fetchDocuments(token);
    }, []);

    const fetchDocuments = async (token: string) => {
        setLoading(true);
        try {
            const url = new URL('/api/reference-library', window.location.origin);
            if (selectedCategory !== 'all') url.searchParams.append('category', selectedCategory);
            if (searchTerm) url.searchParams.append('search', searchTerm);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = getLocalStorage('token');
        if (token) fetchDocuments(token);
    }, [selectedCategory, searchTerm]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: e.target.files![0].name.split('.')[0] }));
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getLocalStorage('token');
        if (!token || (!selectedFile && formData.category !== 'api-keys')) return;

        setUploading(true);
        setError('');

        try {
            let finalUrl = formData.url;

            // 1. Upload file if selected
            if (selectedFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', selectedFile);

                const uploadRes = await fetch('/api/reference-library/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });

                if (!uploadRes.ok) throw new Error('File upload failed');
                const uploadData = await uploadRes.json();
                finalUrl = uploadData.url;
            }

            if (!finalUrl && formData.category !== 'api-keys') {
                throw new Error('Please upload a file or provide a URL');
            }

            // 2. Create document entry
            const docRes = await fetch('/api/reference-library', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    url: finalUrl,
                    tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                })
            });

            if (docRes.ok) {
                setShowUploadModal(false);
                setFormData({
                    title: '',
                    description: '',
                    category: 'other',
                    tags: '',
                    url: '',
                    isPublic: true
                });
                setSelectedFile(null);
                fetchDocuments(token);
            } else {
                const err = await docRes.json();
                setError(err.error || 'Failed to create document entry');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (docId: string, uploadedBy: string) => {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }

        const token = getLocalStorage('token');
        try {
            const response = await fetch(`/api/reference-library/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchDocuments(token);
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Failed to delete document');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred while deleting the document');
        }
    };

    const canDeleteDocument = (doc: any) => {
        const userId = user?.id || user?._id || user?.userId;
        const canDelete = user && (user.role === 'admin' || doc.uploadedBy?._id === userId);
        return canDelete;
    };

    const handleAccessApiKey = async (docId: string) => {
        setAccessingKeyId(docId);
        try {
            const token = getLocalStorage('token');
            if (!token) return;

            const response = await fetch(`/api/reference-library/${docId}/access`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                navigator.clipboard.writeText(data.apiKey.keyValue);
                // Refresh list to update count
                fetchDocuments(token);
            }
        } catch (error) {
            console.error('Error accessing API key:', error);
        } finally {
            setAccessingKeyId(null);
        }
    };

    const fetchKeyLogs = async (docId: string) => {
        setLogsLoading(true);
        try {
            const token = getLocalStorage('token');
            if (!token) return;

            const response = await fetch(`/api/reference-library/${docId}/logs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setKeyLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleViewLogs = (docId: string) => {
        setViewingLogsId(docId);
        fetchKeyLogs(docId);
    };

    const documentColumns = [
        {
            key: 'title' as keyof Document,
            label: 'Title',
            sortable: true,
            render: (value: string, item: Document) => (
                <div className="flex flex-col">
                    <span className="font-medium text-white">{value}</span>
                    {item.category === 'api-keys' && item.apiKeyDetails && (
                        <div className="flex items-center gap-2 mt-1">
                            <code className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                                {accessingKeyId === item._id ? 'Accessing...' : '••••••••••••••••'}
                            </code>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'category' as keyof Document,
            label: 'Category',
            sortable: true,
            render: (value: string, item: Document) => {
                const category = CATEGORIES.find(c => c.id === value);
                return (
                    <span className="px-2 py-1 text-[10px] font-medium text-gray-400 bg-white/5 rounded-md border border-white/5">
                        {category?.name || value}
                    </span>
                );
            }
        },
        {
            key: 'uploadedBy' as keyof Document,
            label: 'Uploaded By',
            sortable: true,
            render: (value: any, item: Document) => value?.name || 'Unknown'
        },
        {
            key: 'createdAt' as keyof Document,
            label: 'Created',
            sortable: true,
            render: (value: string, item: Document) => new Date(value).toLocaleDateString()
        },
        {
            key: 'downloads' as keyof Document,
            label: 'Downloads/Usage',
            sortable: true,
            render: (value: number, item: Document) => (
                item.category === 'api-keys' ? (
                    <span className="text-purple-400 font-mono text-xs">
                        {item.apiKeyDetails?.usageCount || 0} uses
                    </span>
                ) : (
                    <span className="text-blue-400">{value}</span>
                )
            )
        },
        {
            key: 'actions' as keyof Document,
            label: 'Actions',
            sortable: false,
            render: (value: any, item: Document) => (
                <div className="flex items-center gap-2">
                    {item.category === 'api-keys' ? (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccessApiKey(item._id);
                                }}
                                className="p-2 bg-white/5 hover:bg-green-500/10 text-gray-400 hover:text-green-400 rounded-lg transition-all"
                                title="Copy & Access API Key"
                            >
                                {accessingKeyId === item._id ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-b-white rounded-full animate-spin"></div>
                                ) : (
                                    <FileJson className="w-4 h-4" />
                                )}
                            </button>
                            {user?.role === 'admin' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewLogs(item._id);
                                    }}
                                    className="p-2 bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg transition-all"
                                    title="View Access History"
                                >
                                    <HistoryIcon className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    const downloadUrl = `/api/reference-library/download?url=${encodeURIComponent(item.url)}`;
                                    const response = await fetch(downloadUrl);

                                    if (!response.ok) {
                                        const err = await response.json();
                                        throw new Error(err.details || err.error || 'Download failed');
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    const filename = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() +
                                        (item.url.toLowerCase().endsWith('.pdf') ? '.pdf' : '');
                                    link.setAttribute('download', filename);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (err: any) {
                                    console.error('Download error:', err);
                                    alert(`Download failed: ${err.message}. Opening direct link instead.`);
                                    window.open(item.url, '_blank', 'noopener,noreferrer');
                                }
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                            title="Download/View"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}

                    {canDeleteDocument(item) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(item._id, item.uploadedBy?._id || '');
                            }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Reference Library</h1>
                        <p className="text-gray-500 text-sm">Centralized repository for policies, guides, and templates</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-5 h-5" />
                            Upload Document
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search documents by title, description, or tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <div className="w-10 h-10 border-4 border-primary/20 border-b-primary rounded-full animate-spin"></div>
                        <p className="text-gray-400">Loading library documents...</p>
                    </div>
                ) : documents.length > 0 ? (
                    <DataTable
                        data={documents}
                        columns={documentColumns}
                        onRowClick={(doc) => {
                            // Handle row click if needed
                        }}
                        searchable={false}
                        emptyMessage="No documents found"
                    />
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            The reference library is currently empty or no documents match your search.
                        </p>
                    </div>
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !uploading && setShowUploadModal(false)}></div>
                        <div className="relative bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                                <h2 className="text-xl font-bold text-white truncate pr-4">Upload to Library</h2>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    disabled={uploading}
                                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                                        {error}
                                    </div>
                                )}

                                {formData.category !== 'api-keys' && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">
                                            Document File
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="library-file"
                                            />
                                            <label
                                                htmlFor="library-file"
                                                className={cn(
                                                    "w-full flex flex-col items-center justify-center gap-3 py-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                                                    selectedFile ? "border-primary/50 bg-primary/10" : "border-white/10 hover:border-primary/30 hover:bg-white/5"
                                                )}
                                            >
                                                <Upload className={cn("w-6 h-6", selectedFile ? "text-primary" : "text-gray-500")} />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-300">
                                                        {selectedFile ? selectedFile.name : "Click to select file"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-600 mt-1">
                                                        PDF, DOCX, XLSX, images (up to 10MB)
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* URL Input */}
                                {formData.category !== 'api-keys' ? (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Resource URL/File Link <span className="text-red-400">*</span></label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={formData.url}
                                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                placeholder="https://..."
                                                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">API Key Value</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.url} // Reusing url field for key value transport
                                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                placeholder="Enter key value"
                                                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium font-mono"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                            placeholder="Document Title"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                        >
                                            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                                <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Description</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                        placeholder="What is this document about?"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wider">Tags (comma separated)</label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.tags}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                            placeholder="guide, technical, network"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        checked={formData.isPublic}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                                        className="w-5 h-5 rounded border-white/10 text-primary focus:ring-primary/50 bg-white/5"
                                    />
                                    <label htmlFor="isPublic" className="text-sm text-gray-300 font-medium cursor-pointer">
                                        Make this document public to all employees
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        disabled={uploading}
                                        className="flex-1 py-3 text-white font-semibold rounded-xl hover:bg-white/5 transition-all border border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading || (!selectedFile && formData.category !== 'api-keys')}
                                        className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-5 h-5 border-4 border-primary/20 border-b-primary rounded-full animate-spin"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            formData.category === 'api-keys' ? "Add API Key" : "Submit to Library"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
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
