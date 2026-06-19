/**
 * API de Importação de Combustível
 * POST /api/frotas/combustivel/import
 *
 * Recebe dados de combustível, valida e insere no banco
 */

import { saveCombustivelBatch, normalizeCombustivel, validateCombustivel } from '@/lib/models/combustivel';
import { parseExcelFile, validateImportStructure } from '@/lib/simple-xlsx-parser';

export async function POST(request) {
  try {
    console.log('[Import API] Iniciando POST');
    const contentType = request.headers.get('content-type');
    console.log('[Import API] Content-Type:', contentType);

    let parseResult;
    let data = [];

    // Processar FormData (arquivo)
    if (contentType?.includes('multipart/form-data')) {
      console.log('[Import API] Processando FormData');
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        console.log('[Import API] Nenhum arquivo enviado');
        return Response.json(
          { success: false, error: 'Nenhum arquivo enviado' },
          { status: 400 }
        );
      }

      console.log('[Import API] Arquivo recebido:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Validar tipo de arquivo
      const filename = file.name.toLowerCase();
      const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json'];
      const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));

      if (!hasValidExtension) {
        console.log('[Import API] Tipo de arquivo não suportado:', filename);
        return Response.json(
          {
            success: false,
            error: `Tipo de arquivo não suportado. Aceitos: ${allowedExtensions.join(', ')}`
          },
          { status: 400 }
        );
      }

      console.log('[Import API] Iniciando parseExcelFile');
      try {
        const parsedData = await parseExcelFile(file);
        console.log('[Import API] parseExcelFile sucesso, registros:', Array.isArray(parsedData) ? parsedData.length : 0);
        parseResult = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
      } catch (parseError) {
        console.error('[Import API] Erro no parseExcelFile:', parseError);
        throw parseError;
      }
    }
    // Processar JSON direto
    else if (contentType?.includes('application/json')) {
      const body = await request.json();

      if (!body.data || !Array.isArray(body.data)) {
        return Response.json(
          { success: false, error: 'Campo "data" deve ser um array' },
          { status: 400 }
        );
      }

      parseResult = { success: true, data: body.data };
    } else {
      return Response.json(
        { success: false, error: 'Content-Type inválido' },
        { status: 400 }
      );
    }

    // Validar estrutura dos dados
    console.log('[Import API] Iniciando validateImportStructure');
    const validation = validateImportStructure(parseResult);
    console.log('[Import API] Validação completa:', {
      valid: validation.valid,
      validRecords: validation.validRecords.length,
      invalidRecords: validation.invalidRecords.length
    });

    if (!validation.valid && validation.invalidRecords.length > 0) {
      // Se há registros válidos, importar mesmo assim com avisos
      if (validation.validRecords.length === 0) {
        console.log('[Import API] Nenhum registro válido encontrado');
        return Response.json(
          {
            success: false,
            error: 'Nenhum registro válido encontrado',
            details: validation.invalidRecords,
            summary: validation.summary
          },
          { status: 400 }
        );
      }
    }

    // Normalizar e salvar registros válidos
    console.log('[Import API] Normalizando', validation.validRecords.length, 'registros');
    try {
      const recordsToSave = validation.validRecords.map(record => normalizeCombustivel(record));
      console.log('[Import API] Normalizados com sucesso');

      console.log('[Import API] Salvando no banco com saveCombustivelBatch');
      const saveResult = await saveCombustivelBatch(recordsToSave);
      console.log('[Import API] saveCombustivelBatch completo:', saveResult);
    } catch (saveError) {
      console.error('[Import API] Erro ao salvar:', saveError);
      throw saveError;
    }

    // Resposta com resultado detalhado
    return Response.json(
      {
        success: saveResult.success,
        imported: saveResult.saved,
        total: saveResult.total,
        failed: validation.invalidRecords.length,
        message: `${saveResult.saved} de ${saveResult.total} registros importados com sucesso`,
        details: {
          summary: validation.summary,
          errors: validation.invalidRecords.length > 0 ? validation.invalidRecords : null,
          warnings: parseResult.warnings || null
        }
      },
      {
        status: saveResult.success ? 200 : 207 // 207 Multi-Status se há erros parciais
      }
    );
  } catch (error) {
    console.error('Erro na importação:', error);

    return Response.json(
      {
        success: false,
        error: 'Erro ao processar importação',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Info da rota de importação
 */
export async function GET(request) {
  return Response.json({
    info: 'API de importação de combustível',
    method: 'POST',
    acceptedFormats: ['.xlsx', '.xls', '.csv', '.json'],
    expectedFields: [
      'data',
      'placa',
      'motorista',
      'uf',
      'produto',
      'litros',
      'kmL',
      'hodometro',
      'vl_unit',
      'vl_total',
      'filial'
    ],
    example: {
      data: [
        {
          data: '2026-06-19',
          placa: 'ABC-1234',
          motorista: 'João Silva',
          uf: 'SP',
          produto: 'Diesel',
          litros: 50,
          kmL: 5.5,
          hodometro: 45000,
          vl_unit: 5.80,
          vl_total: 290.00,
          filial: 'SP-01',
          uso: 'servico'
        }
      ]
    }
  });
}
