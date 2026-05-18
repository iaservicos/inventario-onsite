const { createClient } = require('@supabase/supabase-js');
const { DBSQLClient } = require('@databricks/sql');

// Configurações do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncStatus() {
  console.log('Iniciando sincronização diária de status do Datalake...');

  const table = process.env.DATABRICKS_TABLE;
  if (!table) {
    console.error('Erro: Variável de ambiente DATABRICKS_TABLE não definida.');
    return;
  }

  const client = new DBSQLClient();

  try {
    await client.connect({
      host: process.env.DATABRICKS_HOST,
      path: process.env.DATABRICKS_PATH,
      token: process.env.DATABRICKS_TOKEN,
    });

    // 1. Busca todos os técnicos ativos no Supabase
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('active', true);

    if (error) throw error;

    console.log(`Processando ${technicians.length} técnicos...`);

    const session = await client.openSession();

    for (const tech of technicians) {
      const searchName = tech.databricks_name || tech.name;
      
      try {
        // 2. Verifica no Databricks usando parâmetros posicionais (?)
        // A query é construída injetando o nome da tabela diretamente (seguro pois vem de env var)
        const query = `SELECT 1 FROM ${table} WHERE UPPER(TRIM(tecnico_nome)) = UPPER(TRIM(?)) LIMIT 1`;
        
        const operation = await session.executeStatement(query, {
          ordinalParameters: [searchName]
        });
        
        const result = await operation.fetchAll();

        const isOk = result && result.length > 0;

        // 3. Atualiza o status no Supabase
        await supabase
          .from('technicians')
          .update({ 
            datalake_status: isOk ? 'OK' : 'NOT_OK',
            last_datalake_sync: new Date().toISOString()
          })
          .eq('id', tech.id);

        console.log(`Técnico ${tech.name}: ${isOk ? 'OK' : 'NÃO ENCONTRADO'}`);
      } catch (err) {
        console.error(`Erro ao processar técnico ${tech.name}:`, err.message);
      }
    }

    await session.close();
    await client.close();
    console.log('Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('Falha na sincronização:', err.message);
  }
}

syncStatus();
