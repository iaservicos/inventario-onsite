'use client';

import PageHeader from '@/components/ui/PageHeader';
import CombustvelImportForm from './ImportForm';

export default function CombustvelImportPage() {
  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Importar Consumo de Combustível"
        subtitle="Selecione o arquivo de relatório para importar"
      />

      <div style={{ maxWidth: '800px', marginTop: '2rem' }}>
        <CombustvelImportForm />
      </div>
    </div>
  );
}
