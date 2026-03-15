import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Loader2, Save, Search, Plus, Building2 } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
}

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profilesRes, companiesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, company_id').order('created_at', { ascending: false }),
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

  const updateCompany = async (userId: string, newCompanyId: string) => {
    try {
      setSaving(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: newCompanyId })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === userId ? { ...p, company_id: newCompanyId } : p));
      
      // Si el admin cambió su PROPIA empresa, recargar para re-instanciar los canales y contextos de useGarageStore
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
            Asigna usuarios a sus respectivos talleres (Superadmin)
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
                <th className="px-6 py-4 font-medium">Taller / Empresa Asignada</th>
                <th className="px-6 py-4 font-medium text-right">Acción</th>
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
                      className="w-full max-w-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none disabled:opacity-50"
                    >
                      <option value="" disabled>Seleccione una empresa</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {saving === profile.id ? (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
                        <Save className="w-4 h-4" /> Autoguardado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
