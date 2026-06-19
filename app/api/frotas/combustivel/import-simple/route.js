/**
 * API de Importação Simplificada - sem dependências externas
 * POST /api/frotas/combustivel/import-simple
 */

import { saveCombustivelBatch, normalizeCombustivel, validateCombustivel } from '@/lib/models/combustivel';

export async function POST(request) {
  try {
    console.log('[Import Simple] Iniciando');
    const contentType = request.headers.get('content-type');
    console.log('[Import Simple] Content-Type:', contentType);

    // Receber o arquivo como FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    console.log('[Import Simple] Arquivo:', { name: file.name, size: file.size });

    // Ler arquivo como texto
    const text = await file.text();
    console.log('[Import Simple] Arquivo lido, tamanho:', text.length);

    // Parse simples - trata como CSV/XLSX exportado como texto
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    console.log('[Import Simple] Total de linhas:', lines.length);

    if (lines.length < 2) {
      return Response.json(
        { success: false, error: 'Arquivo vazio ou sem dados' },
        { status: 400 }
      );
    }

    // Extrair headers (primeira linha)
    const headerLine = lines[0];
    // Tenta com vírgula, depois ponto-e-vírgula
    let headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    if (headers.length === 1) {
      headers = headerLine.split(';').map(h => h.trim().toLowerCase());
    }

    console.log('[Import Simple] Headers:', headers);

    // Processar dados
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      let values = line.split(',').map(v => v.trim());
      if (values.length === 1) {
        values = line.split(';').map(v => v.trim());
      }

      if (values.every(v => !v)) continue; // pular linhas vazias

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      data.push(row);
      console.log(`[Import Simple] Linha ${i}:`, {
        placa: row.placa || row.vehicle,
        data: row.data || row.date
      });
    }

    console.log('[Import Simple] Total de registros:', data.length);

    if (data.length === 0) {
      return Response.json(
        { success: false, error: 'Nenhum dado para importar' },
        { status: 400 }
      );
    }

    // Normalizar nomes de campo para lowercase
    const normalized = data.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().trim();
        newRow[lowerKey] = row[key];
      });
      return newRow;
    });

    console.log('[Import Simple] Normalizando registros');

    // Tentar salvar
    let saved = 0;
    const errors = [];

    for (let i = 0; i < normalized.length; i++) {
      const record = normalized[i];

      try {
        // Validar
        const validation = validateCombustivel(record);
        if (!validation.valid) {
          console.log(`[Import Simple] Linha ${i + 2} inválida:`, validation.errors);
          errors.push({
            line: i + 2,
            errors: validation.errors
          });
          continue;
        }

        // Normalizar
        const normalized_record = normalizeCombustivel(record);

        // Salvar no Supabase
        const { createServiceClient } = await import('@/lib/supabase');
        const supabase = createServiceClient();

        const { data: insertData, error: insertError } = await supabase
          .from('combustiveis')
          .insert({
            data: normalized_record.data,
            placa: normalized_record.placa,
            motorista: normalized_record.motorista,
            uf: normalized_record.uf,
            produto: normalized_record.produto,
            litros: normalized_record.litros,
            km_l: normalized_record.kmL,
            hodometro: normalized_record.hodometro,
            vl_unit: normalized_record.vl_unit,
            vl_total: normalized_record.vl_total,
            filial: normalized_record.filial,
            uso: normalized_record.uso
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[Import Simple] Erro ao salvar linha ${i + 2}:`, insertError.message);
          errors.push({
            line: i + 2,
            errors: [insertError.message]
          });
          continue;
        }

        saved++;
        console.log(`[Import Simple] Linha ${i + 2} salva com sucesso`);
      } catch (err) {
        console.error(`[Import Simple] Exceção na linha ${i + 2}:`, err.message);
        errors.push({
          line: i + 2,
          errors: [err.message]
        });
      }
    }

    console.log('[Import Simple] Conclusão:', { saved, total: normalized.length, errors: errors.length });

    return Response.json({
      success: errors.length === 0,
      imported: saved,
      total: normalized.length,
      failed: errors.length,
      message: `${saved} de ${normalized.length} registros importados`,
      details: {
        errors: errors.length > 0 ? errors.slice(0, 10) : null
      }
    });
  } catch (error) {
    console.error('[Import Simple] Erro geral:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
        details: error.stack
      },
      { status: 500 }
    );
  }
}
