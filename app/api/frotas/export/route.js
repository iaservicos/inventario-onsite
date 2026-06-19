/**
 * API de Exportação de Frotas
 * GET /api/frotas/export?type=combustiveis&format=xlsx
 */

import { createServiceClient } from '@/lib/supabase';
import XLSX from 'xlsx';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'combustiveis'; // combustiveis, manutencoes, veiculos
    const format = searchParams.get('format') || 'xlsx'; // sempre xlsx

    const supabase = createServiceClient();

    let data = [];
    let fileName = `export_${Date.now()}.xlsx`;

    switch (type) {
      case 'combustiveis':
        const { data: combustiveis, error: cError } = await supabase
          .from('combustiveis')
          .select('*')
          .order('data', { ascending: false });

        if (cError) throw cError;

        data = (combustiveis || []).map(c => ({
          'Data': c.data,
          'Placa': c.placa,
          'Motorista': c.motorista,
          'UF': c.uf,
          'Produto': c.produto,
          'Litros': c.litros,
          'Km/L': c.km_l,
          'Hodômetro': c.hodometro,
          'Vl. Unit.': c.vl_unit,
          'Vl. Total': c.vl_total,
          'Filial': c.filial,
          'Uso': c.uso
        }));

        fileName = `combustiveis_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      case 'manutencoes':
        const { data: manutencoes, error: mError } = await supabase
          .from('manutencoes')
          .select('*')
          .order('data_realizada', { ascending: false });

        if (mError) throw mError;

        data = (manutencoes || []).map(m => ({
          'Placa': m.placa,
          'Tipo': m.tipo,
          'Data Realizada': m.data_realizada,
          'Próxima Preventiva': m.proxima_preventiva,
          'KM': m.km,
          'Valor': m.valor,
          'Status': m.status,
          'Observações': m.observacoes
        }));

        fileName = `manutencoes_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      case 'veiculos':
        const { data: veiculos, error: vError } = await supabase
          .from('veiculos')
          .select('*')
          .order('placa');

        if (vError) throw vError;

        data = (veiculos || []).map(v => ({
          'Placa': v.placa,
          'Modelo': v.modelo,
          'Marca': v.marca,
          'Ano': v.ano,
          'KM Atual': v.km_atual,
          'Status': v.status,
          'Combustível': v.combustivel,
          'Última Manutenção': v.ultima_manutencao,
          'Próxima Manutenção': v.proxima_manutencao,
          'Observações': v.observacoes
        }));

        fileName = `veiculos_${new Date().toISOString().split('T')[0]}.xlsx`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Tipo de exportação desconhecido: ${type}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum dado para exportar' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Criar arquivo Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    // Auto-ajustar colunas
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, 12), 30)
    }));
    worksheet['!cols'] = colWidths;

    // Estilo cabeçalho
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_col(col) + '1';
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFF2CC' } }
          };
        }
      }
    }

    // Converter para buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Retornar como download
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('[Export API] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
