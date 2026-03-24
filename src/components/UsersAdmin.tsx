import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Loader2, Save, Search, Plus, Building2, Lock, Shield, UserPlus, MoreVertical, UserMinus, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Profile } from '../types';
import { cn } from '../lib/utils';

interface Company {
  id: string;
  name: string;
}

export function UsersAdmin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  
  // Create Company State
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  // New User State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', company_id: '' });
  
  // Reset Password State
  const [showResetPassword, setShowResetPassword] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profilesRes, companiesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('companies').select('id, name').order('name')
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const callManager = async (action: string, userData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action, userData }
      });
      if (error) throw (error.message || error);
      if (data?.error) throw data.error;
      return data;
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      throw error;
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.company_id) return;
    try {
      setSaving('adding_user');
      await callManager('create_user', newUser);
      await fetchData();
      setShowAddUser(false);
      setNewUser({ email: '', password: '', full_name: '', company_id: '' });
    } catch (error: any) {
      alert('Error al crear usuario: ' + (error.message || error));
    } finally {
      setSaving(null);
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !newPassword) return;
    try {
      setSaving('resetting_pwd');
      await callManager('update_password', { userId: showResetPassword.id, newPassword });
      alert('Contraseña actualizada correctamente.');
      setShowResetPassword(null);
      setNewPassword('');
    } catch (error: any) {
      alert('Error al actualizar contraseña: ' + (error.message || error));
    } finally {
      setSaving(null);
    }
  };

  const toggleBlock = async (userId: string, currentBlocked: boolean) => {
    try {
      setSaving(userId);
      await callManager('toggle_block', { userId, isBlocked: !currentBlocked });
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_blocked: !currentBlocked } : p));
    } catch (error: any) {
      alert('Error al cambiar estado de bloqueo: ' + (error.message || error));
    } finally {
      setSaving(null);
    }
  };

  const updateCompany = async (userId: string, newCompanyId: string) => {
    try {
      setSaving(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: newCompanyId })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === userId ? { ...p, company_id: newCompanyId } : p));
      
      // Si el admin cambió su PROPIA empresa, recargar
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === userId) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Error updating company.');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      setSaving('new_company');
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name: newCompanyName.trim(), schema_name: 'garage' }])
        .select('id, name')
        .single();

      if (error) throw error;
      
      setCompanies(prev => [...prev, data]);
      setNewCompanyName('');
      setIsCreatingCompany(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Error al crear la empresa.');
    } finally {
      setSaving(null);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Administración de Usuarios
          </h2>
          <p className="text-zinc-500 mt-1">
            Gestión completa de accesos y perfiles (Superadmin)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-wrap gap-4 justify-between items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
                <UserPlus className="w-4 h-4" />
                Agregar Usuario
            </button>

            {isCreatingCompany ? (
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-300 shadow-sm">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Nombre empresa..."
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCompany()}
                    className="pl-9 pr-3 py-1.5 focus:outline-none text-sm w-48 bg-transparent"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleCreateCompany}
                  disabled={!newCompanyName.trim() || saving === 'new_company'}
                  className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                  title="Guardar"
                >
                  {saving === 'new_company' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsCreatingCompany(false)}
                  className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Cancelar"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingCompany(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Empresa
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-sm text-zinc-500">
                <th className="px-6 py-4 font-medium">Usuario</th>
                <th className="px-6 py-4 font-medium">Empresa</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900">{profile.full_name || 'Sin nombre'}</div>
                    <div className="text-sm text-zinc-500">{profile.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={profile.company_id || ''}
                      onChange={(e) => updateCompany(profile.id, e.target.value)}
                      disabled={saving === profile.id}
                      className="w-full max-w-[200px] px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="" disabled>Seleccione empresa</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {profile.is_blocked ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setShowResetPassword(profile)}
                            className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Cambiar Contraseña"
                        >
                            <Lock className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleBlock(profile.id, !!profile.is_blocked)}
                            disabled={saving === profile.id}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                profile.is_blocked 
                                    ? "text-emerald-600 hover:bg-emerald-50" 
                                    : "text-red-600 hover:bg-red-50"
                            )}
                            title={profile.is_blocked ? "Desbloquear" : "Bloquear"}
                        >
                            {saving === profile.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                profile.is_blocked ? <Shield className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-emerald-500" />
                        Agregar Nuevo Usuario
                    </h3>
                </div>
                <form onSubmit={handleAddUser} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            value={newUser.full_name}
                            onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Email</label>
                        <input
                            required
                            type="email"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Contraseña Inicial</label>
                        <input
                            required
                            type="password"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Empresa Asignada</label>
                        <select
                            required
                            value={newUser.company_id}
                            onChange={e => setNewUser({...newUser, company_id: e.target.value})}
                            className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        >
                            <option value="">Seleccionar empresa...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowAddUser(false)}
                            className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving === 'adding_user'}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                        >
                            {saving === 'adding_user' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Crear Usuario
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-100 bg-red-50">
                    <h3 className="text-xl font-bold text-red-900 flex items-center gap-2">
                        <Lock className="w-6 h-6 text-red-500" />
                        Resetear Contraseña
                    </h3>
                    <p className="text-red-700 text-sm mt-1">{showResetPassword.email}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nueva Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPwd ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all pr-10"
                                placeholder="Nueva contraseña..."
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowResetPassword(null)}
                            className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleResetPassword}
                            disabled={saving === 'resetting_pwd' || !newPassword || newPassword.length < 6}
                            className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                        >
                            {saving === 'resetting_pwd' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
