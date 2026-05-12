'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

export default function PecasPage() {
  const { data: session, status } = useSession();
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(true);

  // 1. Carrega a lista de técnicos do Supabase
  useEffect(() => {
    async function loadTechnicians() {
      try {
        setLoadingTechs(true);
        const res = await fetch('/api/technicians');
        if (!res.ok) throw new Error('Falha ao carregar técnicos');
        const data = await res.json();
        const activeTechs = Array.isArray(data) ? data.filter(t => t.active) : [];
        setTechnicians(activeTechs);
      } catch (error) {
        console.error("Erro ao carregar lista de técnicos:", error);
      } finally {
        setLoadingTechs(false);
      }
    }

    if (status === 'authenticated') {
      loadTechnicians();
    }
  }, [status]);

  // 2. Busca as peças direto do Databricks
  async function fetchItems(techId) {
    if (!techId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const tech = technicians.find(t => String(t.id) === String(techId));
      const identifier = tech?.databricks_name || tech?.name;

      if (!identifier) {
        alert("Este técnico não possui um nome configurado para o Databricks.");
        setItems([]);
        return;
      }

      const res = await fetch(`/api/technician-items?technicianId=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar peças no Databricks:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    // MUDANÇA AQUI: Removi 'max-w-7xl' e 'mx-auto' para ocupar toda a largura
    <div className="p-6 w-full space-y-6">
      <PageHeader 
        title="Consulta de Peças" 
        description="Dados sincronizados em tempo real com o Databricks."
      />

      <div className="bg-[#141414] border border-[#2a2a2a] p-6 rounded-xl shadow-sm">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          SELECIONAR TÉCNICO {loadingTechs && <span className="text-xs text-blue-400 ml-2">(Carregando lista...)</span>}
        </label>
        <select
          value={selectedTech}
          onChange={(e) => {
            setSelectedTech(e.target.value);
            fetchItems(e.target.value);
          }}
          className="w-full max-w-md bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 outline-none"
        >
          <option value="">
            {loadingTechs ? 'Carregando técnicos...' : 'Selecione um técnico...'}
          </option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        
        {!loadingTechs && technicians.length === 0 && (
          <p className="text-xs text-red-400 mt-2">
            Nenhum técnico ativo encontrado no banco de dados.
          </p>
        )}
      </div>

      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex justify-between items-center">
          <h3 className="font-medium text-white">Peças no Databricks ({items.length})</h3>
          {loading && <span className="text-sm text-blue-400 animate-pulse">Consultando...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#1a1a1a] text-xs uppercase text-gray-500">
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Unidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-sm font-mono text-blue-400">{item.item_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.unit || 'un'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500 italic">
                    {selectedTech ? (loading ? 'Buscando dados...' : 'Sem dados para este técnico.') : 'Aguardando seleção...'}
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
