const { createClient } = require('@supabase/supabase-js');
const { DatabricksClient } = require('@databricks/sql');

// Configurações do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configurações do Databricks
const databricks = new DatabricksClient({
  host: process.env.DATABRICKS_HOST,
  path: process.env.DATABRICKS_PATH,
  token: process.env.DATABRICKS_TOKEN,
});

async function syncStatus() {
  console.log('Iniciando sincronização diária de status do Datalake...');

  try {
    // 1. Busca todos os técnicos ativos no Supabase
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('active', true);

    if (error) throw error;

    console.log(`Processando ${technicians.length} técnicos...`);

    const session = await databricks.openSession();

    for (const tech of technicians) {
      const searchName = tech.databricks_name || tech.name;
      
      try {
        // 2. Verifica no Databricks
        const query = `SELECT 1 FROM ${process.env.DATABRICKS_TABLE} WHERE UPPER(TRIM(tecnico_nome)) = UPPER(TRIM(?)) LIMIT 1`;
        const operation = await session.executeStatement(query, { namedParameters: { 1: searchName } });
        const result = await operation.fetchAll();

        const isOk = result.length > 0;

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
    console.log('Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('Falha na sincronização:', err.message);
  }
}

syncStatus();
