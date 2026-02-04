'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface User {
  username: string;
  password: string;
  role: 'admin' | 'moderator' | 'user';
  permissions: string[];
  created_at: string;
  last_login: string;
  last_duration: string;
}

type ModalType = 'create' | 'edit' | 'view' | 'delete' | null;

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const PERMISSIONS = [
  { key: 'closing', label: 'Closing Report' },
  { key: 'po_sheet', label: 'PO Sheet' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'sewing_closing_report', label: 'Sewing Closing' },
  { key: 'daily_line_wise_input_report', label: 'Hourly Report' },
  { key: 'challan_wise_input_report', label: 'Challan Report' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'moderator' | 'user',
    permissions: {
      closing: true,
      po_sheet: false,
      accessories: false,
      sewing_closing_report: false,
      daily_line_wise_input_report: false,
      challan_wise_input_report: false,
    },
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'user',
      permissions: {
        closing: true,
        po_sheet: false,
        accessories: false,
        sewing_closing_report: false,
        daily_line_wise_input_report: false,
        challan_wise_input_report: false,
      },
    });
    setMessage(null);
  };

  const openModal = (type: ModalType, user?: User, usernameKey?: string) => {
    if (user) {
      const userWithUsername = { ...user, username: user.username || usernameKey || '' };
      setSelectedUser(userWithUsername);
      setFormData({
        username: userWithUsername.username,
        password: user.password,
        role: user.role === 'admin' ? 'user' : (user.role || 'user'),
        permissions: {
          closing: user.permissions?.includes('closing') ?? false,
          po_sheet: user.permissions?.includes('po_sheet') ?? false,
          accessories: user.permissions?.includes('accessories') ?? false,
          sewing_closing_report: user.permissions?.includes('sewing_closing_report') ?? false,
          daily_line_wise_input_report: user.permissions?.includes('daily_line_wise_input_report') ?? false,
          challan_wise_input_report: user.permissions?.includes('challan_wise_input_report') ?? false,
        },
      });
    } else {
      resetForm();
      setSelectedUser(null);
    }
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    resetForm();
    setShowPassword({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const permissions: string[] = [];
    if (formData.permissions.closing) permissions.push('closing');
    if (formData.permissions.po_sheet) permissions.push('po_sheet');
    if (formData.permissions.accessories) permissions.push('accessories');
    if (formData.permissions.sewing_closing_report) permissions.push('sewing_closing_report');
    if (formData.permissions.daily_line_wise_input_report) permissions.push('daily_line_wise_input_report');
    if (formData.permissions.challan_wise_input_report) permissions.push('challan_wise_input_report');

    try {
      const isEdit = modalType === 'edit';
      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          permissions,
          role: formData.role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', isEdit ? 'User updated!' : 'User created!');
        fetchUsers();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser.username }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('success', 'User deleted!');
        fetchUsers();
        closeModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = Object.entries(users).filter(([username, user]) => {
    const query = searchQuery.toLowerCase();
    return (
      username.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: Object.keys(users).length,
    admins: Object.values(users).filter(u => u.role === 'admin').length,
    moderators: Object.values(users).filter(u => u.role === 'moderator').length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-slate-800 text-white';
      case 'moderator':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      default:
        return 'User';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-6 bg-slate-400 rounded-full"
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">User Management</h1>
            <p className="text-sm text-slate-500">{stats.total} users • {stats.moderators} moderators</p>
          </div>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">User</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">Password</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">Role</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">Permissions</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">Last Login</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(([username, user]) => (
                <motion.tr
                  key={username}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-slate-800' : user.role === 'moderator' ? 'bg-amber-100' : 'bg-slate-200'}`}>
                        <span className={`text-xs font-bold ${user.role === 'admin' ? 'text-white' : user.role === 'moderator' ? 'text-amber-700' : 'text-slate-600'}`}>
                          {username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">{username}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    {user.role === 'admin' ? (
                      <span className="text-xs text-slate-400 italic">Protected</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {showPassword[username] ? user.password : '••••••'}
                        </code>
                        <button
                          onClick={() => setShowPassword(prev => ({ ...prev, [username]: !prev[username] }))}
                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getRoleBadge(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700">
                        <ShieldCheckIcon className="w-3 h-3" />
                        All Access
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.length > 0 ? (
                          <>
                            {user.permissions.slice(0, 2).map((perm) => (
                              <span key={perm} className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                                {perm.split('_')[0]}
                              </span>
                            ))}
                            {user.permissions.length > 2 && (
                              <span className="text-xs text-slate-400">+{user.permissions.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs text-slate-500">{user.last_login}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => openModal('view', user, username)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => openModal('edit', user, username)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal('delete', user, username)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            {/* Create/Edit Modal */}
            {(modalType === 'create' || modalType === 'edit') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl w-full max-w-lg shadow-xl my-8"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">
                    {modalType === 'create' ? 'Create New User' : 'Edit User'}
                  </h2>
                  <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5">
                  {message && (
                    <div className={`mb-4 p-2.5 rounded-lg text-sm ${
                      message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Username */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        disabled={modalType === 'edit'}
                        className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
                        required
                      />
                    </div>
                    
                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-600 mb-2">User Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'user' })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.role === 'user'
                            ? 'border-slate-800 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center">
                            <UsersIcon className="w-3 h-3 text-slate-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">Regular User</span>
                        </div>
                        <p className="text-xs text-slate-500">View access only</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'moderator' })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.role === 'moderator'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-slate-200 hover:border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
                            <ShieldCheckIcon className="w-3 h-3 text-amber-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">Moderator</span>
                        </div>
                        <p className="text-xs text-slate-500">Can edit/delete accessories</p>
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-600 mb-2">Permissions</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PERMISSIONS.map(({ key, label }) => (
                        <label
                          key={key}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all ${
                            formData.permissions[key as keyof typeof formData.permissions]
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions[key as keyof typeof formData.permissions]}
                            onChange={(e) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, [key]: e.target.checked }
                            })}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-700"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Moderator Info */}
                  {formData.role === 'moderator' && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-start gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-800">Moderator Privileges</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Can edit/delete accessories data. All actions will be logged and notified to admin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-5">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-9 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : (modalType === 'create' ? 'Create User' : 'Save Changes')}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 h-9 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* View Modal */}
            {modalType === 'view' && selectedUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl w-full max-w-sm shadow-xl"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-800">User Details</h2>
                  <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      selectedUser.role === 'admin' ? 'bg-slate-800' : 
                      selectedUser.role === 'moderator' ? 'bg-amber-100' : 'bg-slate-200'
                    }`}>
                      <span className={`text-lg font-bold ${
                        selectedUser.role === 'admin' ? 'text-white' : 
                        selectedUser.role === 'moderator' ? 'text-amber-700' : 'text-slate-600'
                      }`}>
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{selectedUser.username}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getRoleBadge(selectedUser.role)}`}>
                        {getRoleLabel(selectedUser.role)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Password - Hidden for admin */}
                    {selectedUser.role !== 'admin' && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <label className="text-xs font-medium text-slate-500 uppercase">Password</label>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="text-sm font-mono text-slate-800">
                            {showPassword['modal'] ? selectedUser.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => setShowPassword(prev => ({ ...prev, modal: !prev['modal'] }))}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Permissions */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-slate-500 uppercase">Permissions</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedUser.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-700">
                            <ShieldCheckIcon className="w-3 h-3" />
                            Full Access
                          </span>
                        ) : selectedUser.permissions?.length > 0 ? (
                          selectedUser.permissions.map((perm) => (
                            <span key={perm} className="px-2 py-1 text-xs font-medium rounded bg-white text-slate-600 border border-slate-200">
                              {perm.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No permissions</span>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <label className="text-xs font-medium text-slate-500">Created</label>
                        <p className="text-sm font-medium text-slate-800">{selectedUser.created_at}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <label className="text-xs font-medium text-slate-500">Last Login</label>
                        <p className="text-sm font-medium text-slate-800">{selectedUser.last_login}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {selectedUser.role !== 'admin' && (
                      <button
                        onClick={() => { setModalType('edit'); setShowPassword({}); }}
                        className="flex-1 h-9 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
                      >
                        Edit User
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className={`${selectedUser.role === 'admin' ? 'flex-1' : ''} h-9 px-4 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200`}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Delete Modal */}
            {modalType === 'delete' && selectedUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl w-full max-w-xs shadow-xl"
              >
                <div className="p-5 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Delete User</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Delete <span className="font-semibold">{selectedUser.username}</span>?
                  </p>
                  
                  {message && (
                    <div className="mb-3 p-2 rounded-lg text-xs bg-red-50 text-red-700">
                      {message.text}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={closeModal}
                      className="flex-1 h-9 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="flex-1 h-9 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm ${
                toast.type === 'success' ? 'bg-slate-800 text-white' : 'bg-red-600 text-white'
              }`}
            >
              <span>{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="p-0.5 hover:bg-white/20 rounded">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
