import React, { useState, useMemo, useEffect } from 'react';
import { Part, GarageSettings } from '../types';
import { Package, AlertTriangle, Plus, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { AddPartModal } from './AddPartModal';
import { EditPartModal } from './EditPartModal';
import { supabaseGarage } from '../lib/supabase';

interface InventoryProps {
  parts: Part[];
  settings: GarageSettings | null;
  onAddPart: (part: any) => Promise<void>;
  onUpdatePart: (id: string, updates: Partial<Part>) => Promise<void>;
  onDeletePart: (id: string) => Promise<void>;
}

type SortField = 'id' | 'name' | 'stock' | 'price';
type SortDirection = 'asc' | 'desc';
type TabType = 'all' | 'labor' | 'alerts';

const LIMIT = 50;

export function Inventory({ parts, settings, onAddPart, onUpdatePart, onDeletePart }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'name',
    direction: 'asc'
  });

  // SSR States
  const [inventoryParts, setInventoryParts] = useState<Part[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [counts, setCounts] = useState({ all: 0, labor: 0, alerts: 0 });

  const fetchCounts = async () => {
    if (!settings?.company_id) return;
    try {
      const [{ count: allCount }, { count: laborCount }, { count: alertsCount }] = await Promise.all([
        supabaseGarage.from('garage_parts').select('*', { count: 'exact', head: true })
          .eq('company_id', settings.company_id)
          .not('name', 'ilike', '%servicio%')
          .not('name', 'ilike', '%m.o.%')
          .not('name', 'ilike', '%mano de obra%'),
        supabaseGarage.from('garage_parts').select('*', { count: 'exact', head: true })
          .eq('company_id', settings.company_id)
          .or('name.ilike.%servicio%,name.ilike.%m.o.%,name.ilike.%mano de obra%'),
        supabaseGarage.from('vw_garage_parts_alerts').select('*', { count: 'exact', head: true })
          .eq('company_id', settings.company_id)
      ]);

      setCounts({
        all: allCount || 0,
        labor: laborCount || 0,
        alerts: alertsCount || 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchInventoryData = async (term: string, tab: TabType, sort: { field: SortField; direction: SortDirection }, pageIndex: number, append: boolean = false) => {
    if (!settings?.company_id) return;

    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const from = pageIndex * LIMIT;
      const to = from + LIMIT - 1;

      let query;
      if (tab === 'alerts') {
        query = supabaseGarage.from('vw_garage_parts_alerts').select('*').eq('company_id', settings.company_id);
      } else {
        query = supabaseGarage.from('garage_parts').select('*').eq('company_id', settings.company_id);
        if (tab === 'labor') {
          query = query.or('name.ilike.%servicio%,name.ilike.%m.o.%,name.ilike.%mano de obra%');
        } else {
          query = query.not('name', 'ilike', '%servicio%').not('name', 'ilike', '%m.o.%').not('name', 'ilike', '%mano de obra%');
        }
      }

      if (term) {
        query = query.or(`name.ilike.%${term}%,id.ilike.%${term}%`);
      }

      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        if (append) {
          setInventoryParts(prev => [...prev, ...data]);
        } else {
          setInventoryParts(data);
        }
        setHasMore(data.length === LIMIT);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (settings?.company_id) {
      fetchCounts();
    }
  }, [settings?.company_id]);

  useEffect(() => {
    if (settings?.company_id) {
      setPage(0);
      fetchInventoryData(searchTerm, activeTab, sortConfig, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeTab, sortConfig, settings?.company_id]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchTerm(searchInput);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchInventoryData(searchTerm, activeTab, sortConfig, nextPage, true);
  };

  const reloadData = () => {
     fetchCounts();
     setPage(0);
     fetchInventoryData(searchTerm, activeTab, sortConfig, 0, false);
  };

  const handleAddWrapper = async (part: any) => {
      await onAddPart(part);
      reloadData();
  };

  const handleUpdateWrapper = async (id: string, updates: Partial<Part>) => {
      await onUpdatePart(id, updates);
      reloadData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este repuesto del inventario?')) {
      try {
        await onDeletePart(id);
        setInventoryParts(prev => prev.filter(p => p.id !== id));
        fetchCounts();
      } catch (error) {
        alert('Error al eliminar el repuesto.');
      }
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (part: Part) => {
    setSelectedPart(part);
    setIsEditModalOpen(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // Skeleton Components
  const TableSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={`sk-table-${i}`} className="flex items-center px-6 py-4 border-b border-zinc-100">
          <div className="w-1/6"><div className="h-6 bg-zinc-200 rounded w-16"></div></div>
          <div className="w-2/5 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-200"></div>
             <div className="h-4 bg-zinc-200 rounded w-32"></div>
          </div>
          <div className="w-1/6 flex justify-end"><div className="h-6 bg-zinc-200 rounded w-12"></div></div>
          <div className="w-1/6 flex justify-end"><div className="h-4 bg-zinc-200 rounded w-20"></div></div>
          <div className="w-1/6 flex justify-center gap-2">
             <div className="h-8 w-16 bg-zinc-200 rounded-lg"></div>
             <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const MobileSkeleton = () => (
    <div className="animate-pulse divide-y divide-zinc-100 md:hidden">
      {[...Array(5)].map((_, i) => (
        <div key={`sk-mob-${i}`} className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-200"></div>
              <div className="space-y-2">
                 <div className="h-4 bg-zinc-200 rounded w-24"></div>
                 <div className="h-3 bg-zinc-200 rounded w-16"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-14 bg-zinc-200 rounded-lg"></div>
              <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1">
             <div className="h-14 bg-zinc-200 rounded-xl"></div>
             <div className="h-14 bg-zinc-200 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const AlertsSkeleton = () => (
    <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={`sk-al-${i}`} className="bg-white p-5 rounded-2xl border border-zinc-100 flex flex-col justify-between h-[180px]">
           <div>
              <div className="flex justify-between items-start mb-3">
                 <div className="w-10 h-10 rounded-xl bg-zinc-200"></div>
                 <div className="w-16 h-6 rounded-lg bg-zinc-200"></div>
              </div>
              <div className="h-4 bg-zinc-200 rounded w-3/4 mt-4"></div>
              <div className="h-3 bg-zinc-200 rounded w-1/2 mt-2"></div>
           </div>
           <div className="w-full h-10 mt-4 px-4 py-2.5 rounded-xl bg-zinc-200"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 font-sans pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Inventario y Repuestos</h2>
          <p className="text-zinc-500 mt-1">Gestiona el stock de piezas y servicios.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Item
        </button>
      </div>

      <AddPartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWrapper}
      />

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-zinc-100 rounded-xl w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'all' 
              ? "bg-white text-zinc-900 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Package className="w-4 h-4" />
          Repuestos
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-zinc-200 text-[10px] text-zinc-600">
            {counts.all}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('labor')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'labor' 
              ? "bg-white text-zinc-900 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Wrench className="w-4 h-4 text-blue-500" />
          Servicios
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-zinc-200 text-[10px] text-zinc-600">
            {counts.labor}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'alerts' 
              ? "bg-amber-500 text-white shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <AlertTriangle className={cn("w-4 h-4", activeTab === 'alerts' ? "text-white" : "text-amber-500")} />
          Alertas
          {counts.alerts > 0 && (
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
              activeTab === 'alerts' ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-600"
            )}>
              {counts.alerts}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        {activeTab !== 'alerts' ? (
          <>
            <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-md flex gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                   <input
                     type="text"
                     placeholder="Buscar por nombre o código..."
                     className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                     value={searchInput}
                     onChange={e => setSearchInput(e.target.value)}
                   />
                </div>
                <button
                   type="submit"
                   className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors text-sm whitespace-nowrap"
                >
                  Buscar
                </button>
              </form>
            </div>

            {isLoading ? (
               <>
                  <MobileSkeleton />
                  <div className="hidden md:block">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              <th className="px-6 py-4">ID / Código</th>
                              <th className="px-6 py-4">Nombre</th>
                              <th className="px-6 py-4 text-right">Stock</th>
                              <th className="px-6 py-4 text-right">Precio Unit.</th>
                              <th className="px-1 py-4 text-center">Acciones</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr><td colSpan={5} className="p-0"><TableSkeleton /></td></tr>
                        </tbody>
                     </table>
                  </div>
               </>
            ) : (
               <>
                 {/* Mobile View (Cards) */}
                 <div className="md:hidden divide-y divide-zinc-100">
                   {inventoryParts.length === 0 ? (
                     <div className="px-6 py-12 text-center">
                       <Package className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                       <p className="text-zinc-500 font-medium">No se encontraron ítems.</p>
                     </div>
                   ) : (
                     inventoryParts.map((part) => (
                       <div key={`mob-${part.id}`} className="p-4 space-y-3">
                         <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                               {part.name.toUpperCase().includes('SERVICIO') || part.name.toUpperCase().includes('M.O.') ? <Wrench className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-zinc-500" />}
                             </div>
                             <div>
                               <h4 className="font-bold text-zinc-900 leading-tight">{part.name}</h4>
                               <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-tighter">ID: {part.id}</span>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <button
                               onClick={() => handleEdit(part)}
                               className="text-emerald-600 font-extrabold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                             >
                               Editar
                             </button>
                             <button
                               onClick={() => handleDelete(part.id)}
                               className="text-red-600 font-extrabold text-xs bg-red-50 px-2 py-1.5 rounded-lg active:scale-95 transition-transform"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
     
                         <div className="grid grid-cols-2 gap-4 pt-1">
                           <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                             <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Stock</p>
                             <div className="flex items-baseline gap-1">
                               <span className={cn(
                                 "font-black text-lg",
                                 part.stock <= part.min_stock ? "text-red-600" : "text-zinc-900"
                               )}>
                                 {part.stock}
                               </span>
                               <span className="text-[10px] text-zinc-400 font-medium">/ Min: {part.min_stock}</span>
                             </div>
                           </div>
                           <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                             <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Precio</p>
                             <p className="font-black text-lg text-zinc-900">
                               ${part.price.toLocaleString('es-CL')}
                             </p>
                           </div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
     
                 {/* Desktop View (Table) */}
                 <div className="hidden md:block overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                         <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('id')}>
                           <div className="flex items-center">ID / Código <SortIcon field="id" /></div>
                         </th>
                         <th className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('name')}>
                           <div className="flex items-center">Nombre <SortIcon field="name" /></div>
                         </th>
                         <th className="px-6 py-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('stock')}>
                           <div className="flex items-center justify-end">Stock <SortIcon field="stock" /></div>
                         </th>
                         <th className="px-6 py-4 text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('price')}>
                           <div className="flex items-center justify-end">Precio Unit. <SortIcon field="price" /></div>
                         </th>
                         <th className="px-1 py-4 text-center">Acciones</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100">
                       {inventoryParts.length === 0 ? (
                         <tr>
                           <td colSpan={5} className="px-6 py-12 text-center">
                             <Package className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                             <p className="text-zinc-500 font-medium">No se encontraron ítems.</p>
                           </td>
                         </tr>
                       ) : (
                         inventoryParts.map((part) => (
                           <tr key={`desk-${part.id}`} className="hover:bg-zinc-50/50 transition-colors group">
                             <td className="px-6 py-4">
                               <span className="font-mono text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
                                 {part.id}
                               </span>
                             </td>
                             <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                   {part.name.toUpperCase().includes('SERVICIO') || part.name.toUpperCase().includes('M.O.') ? <Wrench className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-zinc-500" />}
                                 </div>
                                 <span className="font-semibold text-zinc-900">{part.name}</span>
                               </div>
                             </td>
                             <td className="px-6 py-4 text-right">
                               <div className="flex flex-col items-end">
                                 <span className={cn(
                                   "font-bold text-sm",
                                   part.stock <= part.min_stock ? "text-red-600" : "text-zinc-900"
                                 )}>
                                   {part.stock}
                                 </span>
                                 <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Min: {part.min_stock}</span>
                               </div>
                             </td>
                             <td className="px-6 py-4 text-right font-bold text-zinc-700">
                               ${part.price.toLocaleString('es-CL')}
                             </td>
                             <td className="px-6 py-4">
                               <div className="flex items-center justify-center gap-2">
                                 <button
                                   onClick={() => handleEdit(part)}
                                   className="text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                 >
                                   Editar
                                 </button>
                                 <button
                                   onClick={() => handleDelete(part.id)}
                                   className="text-red-300 hover:text-red-600 transition-colors p-1.5"
                                   title="Eliminar"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>

                 {/* Load More Button */}
                 {hasMore && (
                    <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 flex justify-center">
                       <button
                          onClick={loadMore}
                          disabled={isLoadingMore}
                          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          {isLoadingMore && <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></span>}
                          {!isLoadingMore && <ArrowDown className="w-4 h-4 text-zinc-400" />}
                          {isLoadingMore ? 'Cargando...' : 'Cargar más registros'}
                       </button>
                    </div>
                 )}
               </>
            )}
          </>
        ) : (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg">Stock Crítico</h3>
                  <p className="text-sm text-zinc-500">Repuestos con existencia igual o inferior al mínimo configurado.</p>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
                 <form onSubmit={handleSearch} className="relative flex gap-2">
                   <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar alerta..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                      />
                   </div>
                   <button type="submit" className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors text-sm">
                     Buscar
                   </button>
                 </form>
              </div>
            </div>

            {isLoading ? (
               <AlertsSkeleton />
            ) : inventoryParts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <h4 className="font-bold text-emerald-900">¡Todo en orden!</h4>
                <p className="text-emerald-600 text-sm">No hay repuestos con bajo stock en este momento para la búsqueda actual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryParts.map(part => (
                  <div key={`al-${part.id}`} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between group hover:border-amber-300 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                          <Package className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                          Stock: {part.stock}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 group-hover:text-amber-700 transition-colors" title={part.name}>{part.name}</h4>
                      <p className="text-xs text-zinc-500 mt-1 mb-4 flex items-center gap-1.5">
                        Límite mínimo: <span className="font-bold text-zinc-700">{part.min_stock}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const message = `Hola Roma Center, necesito re-stock de:\n\n*ID:* ${part.id}\n*Repuesto:* ${part.name}\n*Stock Actual:* ${part.stock}\n*Mínimo Requerido:* ${part.min_stock}\n\nFavor cotizar.`;
                        window.open(`https://wa.me/${settings?.phone || ''}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Enviar Pedido WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Load More Button specific to Alerts */}
            {hasMore && !isLoading && (
              <div className="mt-6 flex justify-center">
                 <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-amber-200 hover:bg-amber-50 hover:border-amber-300 text-amber-700 font-medium rounded-xl transition-all shadow-sm disabled:opacity-50"
                 >
                    {isLoadingMore && <span className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin"></span>}
                    {!isLoadingMore && <ArrowDown className="w-4 h-4" />}
                    {isLoadingMore ? 'Cargando...' : 'Cargar más alertas'}
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      <EditPartModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        part={selectedPart}
        onUpdate={handleUpdateWrapper}
      />
    </div>
  );
}
