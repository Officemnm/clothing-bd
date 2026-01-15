'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  username: string;
  password: string;
  role: string;
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
    permissions: {
      closing: true,
      po_sheet: false,
      accessories: false,
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
      permissions: { closing: true, po_sheet: false, accessories: false },
    });
    setMessage(null);
  };

  const openModal = (type: ModalType, user?: User, usernameKey?: string) => {
    if (user) {
      // Ensure username is set from the key if not in object
      const userWithUsername = { ...user, username: user.username || usernameKey || '' };
      setSelectedUser(userWithUsername);
      setFormData({
        username: userWithUsername.username,
        password: user.password,
        permissions: {
          closing: user.permissions?.includes('closing') ?? false,
          po_sheet: user.permissions?.includes('po_sheet') ?? false,
          accessories: user.permissions?.includes('accessories') ?? false,
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const permissions: string[] = [];
    if (formData.permissions.closing) permissions.push('closing');
    if (formData.permissions.po_sheet) permissions.push('po_sheet');
    if (formData.permissions.accessories) permissions.push('accessories');

    try {
      const isEdit = modalType === 'edit';
      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          permissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', isEdit ? 'User updated successfully' : 'User created successfully');
        fetchUsers();
        setTimeout(() => closeModal(), 800);
      } else {
        showToast('error', data.message || 'Operation failed');
        setMessage({ type: 'error', text: data.message || 'Operation failed' });
      }
    } catch {
      showToast('error', 'Connection error');
      setMessage({ type: 'error', text: 'Connection error' });
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
        showToast('success', 'User deleted successfully');
        fetchUsers();
        closeModal();
      } else {
        showToast('error', data.message || 'Failed to delete user');
        setMessage({ type: 'error', text: data.message || 'Failed to delete user' });
      }
    } catch {
      showToast('error', 'Connection error');
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = Object.entries(users).filter(([username]) =>
    username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = Object.keys(users).length;
  const adminCount = Object.values(users).filter(u => u.role === 'admin').length;
  const activeToday = Object.values(users).filter(u => u.last_login !== 'Never').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, permissions and access control</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{totalUsers}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Administrators</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{adminCount}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{activeToday}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-64 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
          />
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">User</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Password</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Role</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Permissions</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Last Login</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map(([username, user]) => (
              <tr key={username} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">{username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{username}</p>
                      <p className="text-xs text-gray-500">Created {user.created_at}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {showPassword[username] ? user.password : '••••••••'}
                    </code>
                    <button
                      onClick={() => setShowPassword(prev => ({ ...prev, [username]: !prev[username] }))}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title={showPassword[username] ? 'Hide password' : 'Show password'}
                    >
                      {showPassword[username] ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                    user.role === 'admin' 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {user.permissions?.length > 0 ? (
                      user.permissions.map((perm) => (
                        <span 
                          key={perm} 
                          className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600"
                        >
                          {perm.replace('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No permissions</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">{user.last_login}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openModal('view', user, username)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {user.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => openModal('edit', user, username)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit User"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openModal('delete', user, username)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete User"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <p className="text-sm text-gray-500">No users found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Backdrop */}
      {modalType && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* Create/Edit Modal */}
          {(modalType === 'create' || modalType === 'edit') && (
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {modalType === 'create' ? 'Create New User' : 'Edit User'}
                </h2>
                <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                {message && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={modalType === 'edit'}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 disabled:bg-gray-50 disabled:text-gray-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 font-mono"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Password is stored and visible to admins</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div className="space-y-2">
                      {[
                        { key: 'closing', label: 'Closing Report' },
                        { key: 'po_sheet', label: 'PO Sheet' },
                        { key: 'accessories', label: 'Accessories' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions[key as keyof typeof formData.permissions]}
                            onChange={(e) => setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, [key]: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/20"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : (modalType === 'create' ? 'Create User' : 'Save Changes')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* View Modal */}
          {modalType === 'view' && selectedUser && (
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
                <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                {/* User Avatar */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-700">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedUser.username}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                      selectedUser.role === 'admin' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedUser.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Password</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">
                        {showPassword['modal'] ? selectedUser.password : '••••••••'}
                      </code>
                      <button
                        onClick={() => setShowPassword(prev => ({ ...prev, modal: !prev['modal'] }))}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        {showPassword['modal'] ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedUser.password);
                          setMessage({ type: 'success', text: 'Password copied!' });
                          setTimeout(() => setMessage(null), 2000);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Copy password"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    {message && (
                      <p className="mt-1 text-xs text-green-600">{message.text}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedUser.permissions?.length > 0 ? (
                        selectedUser.permissions.map((perm) => (
                          <span 
                            key={perm} 
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700"
                          >
                            {perm.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.created_at}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.last_login}</p>
                    </div>
                  </div>

                  {selectedUser.last_duration && selectedUser.last_duration !== 'N/A' && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Session Duration</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.last_duration}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  {selectedUser.role !== 'admin' && (
                    <button
                      onClick={() => {
                        setModalType('edit');
                        setShowPassword({});
                      }}
                      className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Edit User
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {modalType === 'delete' && selectedUser && (
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete <span className="font-medium">{selectedUser.username}</span>? This action cannot be undone.
                </p>
                
                {message && (
                  <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                    {message.text}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-gray-900 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
