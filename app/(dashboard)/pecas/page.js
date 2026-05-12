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

  // 1. Carrega a lista de técnicos para o select
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/technicians')
        .then((r) => r.json())
        .then((d) => setTechnicians(Array.isArray(d) ? d.filter((t) => t.active) : []));
    }
  }, [status]);

  // 2. Busca as peças direto do Databricks quando o técnico é selecionado
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
        setItems([]);
        return;
      }

      const res = await fetch(`/api/technician-items?technicianId=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar peças:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Consulta de Peças por Técnico" 
        description="Visualize o portfólio de peças sincronizado diretamente do Databricks."
      />

      {/* Seletor de Técnico */}
      <div className="bg-[#141414] border border-[#2a2a2a] p-6 rounded-xl shadow-sm">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          SELECIONAR TÉCNICO
        </label>
        <select
          value={selectedTech}
          onChange={(e) => {
            setSelectedTech(e.target.value);
            fetchItems(e.target.value);
          }}
          className="w-full max-w-md bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
        >
          <option value="">Selecione um técnico...</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.region ? `— ${t.region}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Peças */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex justify-between items-center">
          <h3 className="font-medium text-white">Peças Ativas ({items.length})</h3>
          {loading && <span className="text-sm text-blue-400 animate-pulse">Buscando no Databricks...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3 font-semibold">Código</th>
                <th className="px-6 py-3 font-semibold">Descrição</th>
                <th className="px-6 py-3 font-semibold">Unidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-blue-400">{item.item_code}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 uppercase">{item.unit || 'un'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500 italic">
                    {selectedTech 
                      ? (loading ? 'Carregando dados...' : 'Nenhuma peça encontrada para este técnico no Databricks.')
                      : 'Selecione um técnico para visualizar as peças.'}
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
