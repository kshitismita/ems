'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import DashboardLayout from '@/components/dashboard/Layout';
import AuthGuard from '@/components/auth/AuthGuard';

import { Card } from '@/components/ui/Card';
import { ArrowLeft, Save, X, Plus, Calendar, Briefcase, Tag, Target, Users, AlertCircle, ChevronDown, Check, Link } from 'lucide-react';
import { getLocalStorage } from '@/lib/storage';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function CreateProjectPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    deadline: '',
    budget: '',
    admin: '',
    assignedEmployees: [] as string[],
    tags: '',
    referenceUrls: [] as Array<{ title: string; url: string }>,
    apiKeys: [] as Array<{ name: string; keyValue: string; description?: string }>
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calculate days between start and end dates
  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Calculate deadline from end date (days remaining)
  const calculateDeadline = (endDate: string) => {
    if (!endDate) return '';

    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation
    end.setHours(0, 0, 0, 0); // Set to start of day for accurate calculation

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `${diffDays} days remaining`;
    }
  };
  const router = useRouter();

  useEffect(() => {
    const token = getLocalStorage('token');
    if (token) {
      fetchUsers(token);
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (portalRef.current && !portalRef.current.contains(target) && triggerRef.current && !triggerRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    // Throttled scroll/resize handler
    let scrollTimeout: NodeJS.Timeout;
    const handleScrollAndResize = () => {
      if (isDropdownOpen) {
        // Clear previous timeout
        if (scrollTimeout) clearTimeout(scrollTimeout);

        // Set new timeout to update position after scroll stops
        scrollTimeout = setTimeout(() => {
          updateDropdownPosition();
        }, 50); // 50ms delay for performance
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollAndResize, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollAndResize);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isDropdownOpen]);

  const fetchUsers = async (token: string) => {
    try {
      console.log('🔍 Fetching users with token...');
      const [adminsResponse, employeesResponse] = await Promise.all([
        fetch('/api/employees?role=admin', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/employees?role=employee', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json();
        setAdmins(adminsData.employees || []);
        console.log('✅ Admins fetched:', adminsData.employees?.length || 0);
      } else {
        console.error('❌ Failed to fetch admins:', adminsResponse.status);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.employees || []);
        console.log('✅ Employees fetched:', employeesData.employees?.length || 0);
      } else {
        console.error('❌ Failed to fetch employees:', employeesResponse.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
    }
  };

  const handleEmployeeSelect = (employee: User) => {
    const isSelected = selectedEmployees.some(emp => emp._id === employee._id);
    if (isSelected) {
      setSelectedEmployees(selectedEmployees.filter(emp => emp._id !== employee._id));
      setFormData(prev => ({
        ...prev,
        assignedEmployees: prev.assignedEmployees.filter(id => id !== employee._id)
      }));
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
      setFormData(prev => ({
        ...prev,
        assignedEmployees: [...prev.assignedEmployees, employee._id]
      }));
    }
  };

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320; // Estimated max height with padding

      // Check if dropdown would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let topPosition;
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        // Position above if not enough space below
        topPosition = rect.top + scrollY - dropdownHeight - 8;
      } else {
        // Position below (default)
        topPosition = rect.bottom + scrollY + 8;
      }

      setDropdownPosition({
        top: topPosition,
        left: rect.left + scrollX,
        width: rect.width
      });
    }
  };

  const handleDropdownToggle = () => {
    console.log('🔍 Dropdown toggle clicked, current state:', isDropdownOpen);
    console.log('🔍 Employees available:', employees.length);
    if (!isDropdownOpen) {
      updateDropdownPosition();
    }
    setIsDropdownOpen(!isDropdownOpen);
    console.log('🔍 Dropdown state changed to:', !isDropdownOpen);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      endDate: formData.endDate || undefined,
      deadline: formData.endDate ? new Date(formData.endDate) : undefined, // Store actual end date as deadline
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      referenceUrls: formData.referenceUrls.map(url => ({
        ...url,
        addedBy: getLocalStorage('user') ? JSON.parse(getLocalStorage('user')).id : undefined,
        addedAt: new Date()
      })),
      apiKeys: formData.apiKeys.map(key => ({
        ...key,
        keyValue: key.keyValue || `sk_${Math.random().toString(36).substr(2, 9)}`, // Auto-generate if empty
        addedBy: getLocalStorage('user') ? JSON.parse(getLocalStorage('user')).id : undefined,
        addedAt: new Date(),
        usageCount: 0
      }))
    };

    const token = getLocalStorage('token');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push('/projects');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create project');
      }
    } catch (error) {
      setError('An error occurred while creating the project');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Auto-calculate deadline when end date changes
    if (name === 'endDate' && value) {
      const deadline = calculateDeadline(value as string);
      setFormData(prev => ({
        ...prev,
        endDate: value,
        deadline
      }));
    }

    // Also update deadline when start date changes (as it affects duration context)
    if (name === 'startDate' && formData.endDate) {
      const deadline = calculateDeadline(formData.endDate);
      setFormData(prev => ({
        ...prev,
        startDate: value,
        deadline
      }));
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.includes(employeeId)
        ? prev.assignedEmployees.filter(id => id !== employeeId)
        : [...prev.assignedEmployees, employeeId]
    }));
  };

  const handleAddApiKey = () => {
    setFormData(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, { name: '', keyValue: '', description: '' }]
    }));
  };

  const handleApiKeyChange = (index: number, field: 'name' | 'keyValue' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveApiKey = (index: number) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.filter((_, i) => i !== index)
    }));
  };

  const handleAddReferenceUrl = () => {
    setFormData(prev => ({
      ...prev,
      referenceUrls: [...prev.referenceUrls, { title: '', url: '' }]
    }));
  };

  const handleReferenceUrlChange = (index: number, field: 'title' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      referenceUrls: prev.referenceUrls.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleRemoveReferenceUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      referenceUrls: prev.referenceUrls.filter((_, i) => i !== index)
    }));
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
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
                <h1 className="text-2xl font-bold text-white tracking-tight">Create New Project</h1>
                <p className="text-gray-500 text-sm">Fill in the details to launch a new project and assign team members</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Project Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Project Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., Q1 Security Audit"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description *</label>
                      <textarea
                        name="description"
                        required
                        rows={5}
                        minLength={20}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Detailed project scope and objectives... (minimum 20 characters)"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                      />
                      {formData.description && formData.description.length > 0 && formData.description.length < 20 && (
                        <p className="text-xs text-red-400 mt-1">Description must be at least 20 characters long</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tags (comma separated)</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="audit, security, internal"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Project Admin *</label>
                        <select
                          name="admin"
                          required
                          value={formData.admin}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="" className="bg-gray-900">Select an Admin</option>
                          {admins.map((admin) => (
                            <option key={admin._id} value={admin._id} className="bg-gray-900">
                              {admin.name} ({admin.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Team Assignment */}
                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Assignment
                  </h3>

                  {/* Simple Dropdown Container */}
                  <div ref={dropdownRef} className="relative">
                    <div
                      ref={triggerRef}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all flex items-center justify-between"
                      onClick={handleDropdownToggle}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedEmployees.length === 0 ? (
                          <span className="text-gray-400">Select team members...</span>
                        ) : (
                          <>
                            <span className="text-sm text-gray-300">{selectedEmployees.length} member{selectedEmployees.length !== 1 ? 's' : ''} selected</span>
                            <div className="flex gap-1 flex-wrap">
                              {selectedEmployees.slice(0, 3).map(emp => (
                                <span key={emp._id} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                                  {emp.name.split(' ')[0]}
                                </span>
                              ))}
                              {selectedEmployees.length > 3 && (
                                <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded-full">
                                  +{selectedEmployees.length - 3} more
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Portal Dropdown */}
                    {isDropdownOpen && typeof window !== 'undefined' && createPortal(
                      <div
                        ref={portalRef}
                        className="absolute z-[99999] bg-gray-900/98 border border-white/30 rounded-xl shadow-2xl max-h-64 overflow-hidden backdrop-blur-lg border-2"
                        style={{
                          top: dropdownPosition.top,
                          left: dropdownPosition.left,
                          width: dropdownPosition.width,
                          minWidth: '350px',
                          maxWidth: '450px',
                          willChange: 'transform',
                          transform: 'translateZ(0)'
                        }}
                      >
                        {/* Search Input */}
                        <div className="p-3 border-b border-white/10">
                          <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Employee List */}
                        <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {searchTerm ? 'No employees found' : 'No employees available'}
                            </div>
                          ) : (
                            filteredEmployees.map((employee) => {
                              const isSelected = selectedEmployees.some(emp => emp._id === employee._id);
                              return (
                                <div
                                  key={employee._id}
                                  className={`px-4 py-3 cursor-pointer transition-all duration-150 flex items-center gap-3 ${isSelected ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-white/5'
                                    }`}
                                  onClick={() => handleEmployeeSelect(employee)}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-primary border-primary scale-110'
                                    : 'border-white/20 hover:border-white/40'
                                    }`}>
                                    {isSelected && <Check className="w-3 h-3 text-black" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{employee.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Selected Employees Display */}
                  {selectedEmployees.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Selected Team Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployees.map((employee) => (
                          <div
                            key={employee._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full"
                          >
                            <span className="text-sm text-primary font-medium">{employee.name}</span>
                            <button
                              type="button"
                              onClick={() => handleEmployeeSelect(employee)}
                              className="text-primary/60 hover:text-primary transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Reference URLs */}
                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-400" />
                    Reference URLs
                  </h3>

                  <div className="space-y-4">
                    {formData.referenceUrls.map((refUrl, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Reference Title (e.g., Documentation, API Reference)"
                            value={refUrl.title}
                            onChange={(e) => handleReferenceUrlChange(index, 'title', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={refUrl.url}
                            onChange={(e) => handleReferenceUrlChange(index, 'url', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveReferenceUrl(index)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddReferenceUrl}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Reference URL
                    </button>
                  </div>
                </Card>

                {/* API Keys */}
                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    API Keys
                  </h3>

                  <div className="space-y-4">
                    {formData.apiKeys.map((apiKey, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="API Key Name"
                            value={apiKey.name}
                            onChange={(e) => handleApiKeyChange(index, 'name', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                          <input
                            type="password"
                            placeholder="Generated API Key (leave empty to auto-generate)"
                            value={apiKey.keyValue}
                            onChange={(e) => handleApiKeyChange(index, 'keyValue', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={apiKey.description || ''}
                            onChange={(e) => handleApiKeyChange(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveApiKey(index)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddApiKey}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add API Key
                    </button>
                  </div>
                </Card>
              </div>

              {/* Sidebar / Configuration */}
              <div className="space-y-6">
                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Configuration
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status *</label>
                      <select
                        name="status"
                        required
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                      >
                        <option value="planning" className="bg-gray-900">Planning</option>
                        <option value="active" className="bg-gray-900">Active</option>
                        <option value="on-hold" className="bg-gray-900">On Hold</option>
                        <option value="completed" className="bg-gray-900">Completed</option>
                        <option value="cancelled" className="bg-gray-900">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Priority *</label>
                      <select
                        name="priority"
                        required
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                      >
                        <option value="low" className="bg-gray-900">Low</option>
                        <option value="medium" className="bg-gray-900">Medium</option>
                        <option value="high" className="bg-gray-900">High</option>
                        <option value="critical" className="bg-gray-900">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Budget ($)</label>
                      <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-white/5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timeline
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Start Date *</label>
                      <input
                        type="date"
                        name="startDate"
                        required
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        min={formData.startDate}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all [color-scheme:dark]"
                      />
                      {formData.endDate && (
                        <div className="mt-2 text-xs text-gray-400">
                          Duration: <span className="font-medium">{calculateDays(formData.startDate, formData.endDate)}</span> days
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Deadline (Auto-calculated)</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="deadline"
                          value={formData.deadline || 'Set end date to calculate'}
                          readOnly
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-not-allowed opacity-75"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                      {formData.deadline && (
                        <div className="mt-2 text-xs">
                          <span className={`font-medium ${formData.deadline.includes('Overdue') ? 'text-red-400' : formData.deadline.includes('Due today') ? 'text-orange-400' : 'text-green-400'}`}>
                            {formData.deadline}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Form Actions */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                  >
                    <Plus className="w-5 h-5" />
                    {loading ? 'Launching...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/projects')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-white font-medium rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

