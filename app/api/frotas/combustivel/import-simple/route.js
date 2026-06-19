/**
 * API de Importação Simplificada
 * POST /api/frotas/combustivel/import-simple
 *
 * Compatível com o relatório padrão de consumo da Positivo
 */

export async function POST(request) {
  try {
    console.log('[Import Simple] Iniciando');

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

    // Ler arquivo como ArrayBuffer e usar XLSX
    const arrayBuffer = await file.arrayBuffer();

    let data = [];
    try {
      console.log('[Import Simple] Tentando importar XLSX');
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;
      console.log('[Import Simple] XLSX importado');

      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      console.log('[Import Simple] Workbook lido');

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      console.log('[Import Simple] Sheet lida:', sheetName);

      // Converter para JSON
      data = XLSX.utils.sheet_to_json(worksheet);
      console.log('[Import Simple] Dados parseados:', data.length, 'registros');

      if (data.length > 0) {
        console.log('[Import Simple] Primeiro registro:', Object.keys(data[0]).slice(0, 5));
      }
    } catch (xlsxError) {
      console.error('[Import Simple] Erro ao ler com XLSX:', {
        message: xlsxError.message,
        code: xlsxError.code
      });
      throw xlsxError;
    }

    if (data.length === 0) {
      return Response.json(
        { success: false, error: 'Nenhum dado encontrado no arquivo' },
        { status: 400 }
      );
    }

    // Importar Supabase para salvar
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    // Processar e salvar
    let saved = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Normalizar nomes de coluna - Excel vem com MAIÚSCULA
        const record = {};
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();
          record[lowerKey] = row[key];
        });

        console.log(`[Import Simple] Processando linha ${i + 1}:`, {
          placa: record.placa,
          motorista: record.motorista
        });

        // Validar campos obrigatórios
        if (!record.placa || !record.data || !record.motorista) {
          throw new Error('Campos obrigatórios faltando: placa, data, motorista');
        }

        // Converter data (vem como "01/05/2026 00:07:22" ou número Excel)
        let dataFormatada = record.data;
        if (typeof record.data === 'string' && record.data.includes('/')) {
          const [dataPart] = record.data.split(' ');
          const [dia, mes, ano] = dataPart.split('/');
          dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T00:00:00`;
        } else if (typeof record.data === 'number') {
          // Excel serial date
          const date = new Date((record.data - 25569) * 86400 * 1000);
          dataFormatada = date.toISOString().split('T')[0];
        }

        // Converter números
        const quantidade = parseFloat(record.quantidade) || 0;
        const valor_unitario = parseFloat(record['valor unitario'] || record['valor_unitario']) || 0;
        const valor_total = parseFloat(record['valor total'] || record['valor_total']) || 0;
        const distancia = parseInt(record.distancia) || 0;
        const consumo = parseFloat(record.consumo) || 0;
        const hodometro = parseInt(record.hodometro) || 0;

        // Preparar dados para inserção
        const insertData = {
          placa: record.placa.toString().toUpperCase().trim(),
          data: dataFormatada,
          numero_cartao: record['numero cartao'] || record['numero_cartao'] || null,
          matricula: record.matricula || null,
          motorista: record.motorista.toString().trim(),
          tipo_frota: record['tipo frota'] || record['tipo_frota'] || null,
          modelo: record.modelo || null,
          fabricante: record.fabricante || null,
          terminal: record.terminal || null,
          estabelecimento: record.estabelecimento || null,
          cidade: record.cidade || null,
          uf: record.uf ? record.uf.toString().toUpperCase().trim() : null,
          produto: record.produto || null,
          distancia: distancia,
          consumo: consumo,
          unidade: record.unidade || null,
          hodometro: hodometro,
          quantidade: quantidade,
          valor_unitario: valor_unitario,
          valor_total: valor_total,
          cupom_fiscal: record['cupom fiscal'] || record['cupom_fiscal'] || null,
          centro_resultado: record['centro resultado'] || record['centro_resultado'] || null,
          filial: record.filial || null,
          centro_custo: record['centro custo'] || record['centro_custo'] || null
        };

        // Inserir no banco
        const { error: insertError } = await supabase
          .from('combustiveis')
          .insert(insertData);

        if (insertError) {
          throw insertError;
        }

        saved++;
        console.log(`[Import Simple] Linha ${i + 1} importada com sucesso`);
      } catch (err) {
        console.error(`[Import Simple] Erro na linha ${i + 1}:`, err.message);
        errors.push({
          line: i + 1,
          placa: row.PLACA || row.placa || 'N/A',
          error: err.message
        });
      }
    }

    console.log('[Import Simple] Importação concluída:', { saved, total: data.length, errors: errors.length });

    return Response.json({
      success: errors.length === 0,
      imported: saved,
      total: data.length,
      failed: errors.length,
      message: `${saved} de ${data.length} registros importados com sucesso`,
      details: {
        errors: errors.length > 0 ? errors.slice(0, 10) : null
      }
    });
  } catch (error) {
    console.error('[Import Simple] Erro geral:', error);
    return Response.json(
      {
        success: false,
        error: 'Erro ao processar importação: ' + error.message
      },
      { status: 500 }
    );
  }
}
