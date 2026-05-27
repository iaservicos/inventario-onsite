import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '@/lib/db';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServiceClient();
    
    // 1. Descobre que dia é amanhã (0-6)
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    const diaAmanha = amanha.getDay(); // 0=Dom, 1=Seg...

    // 2. Busca técnicos que fazem inventário amanhã
    const { data: tecnicos } = await supabase
      .from('technicians')
      .select('*')
      .eq('inventory_day', diaAmanha)
      .eq('active', true);

    if (!tecnicos || tecnicos.length === 0) return NextResponse.json({ content: [] });

    const subgrupo = await getWeekSubgroup(supabase);
    const respostaPowerAutomate = [];

    for (const tech of tecnicos) {
      const pecas = await getConsolidatedTechnicianItems(supabase, tech.id, subgrupo);
      if (pecas.length === 0) continue;

      // 3. SALVA O AGENDAMENTO NO BANCO (Para o Power Automate ler amanhã)
      const { data: agendamento } = await supabase.from('inventory_schedules').insert({
        technician_id: tech.id,
        scheduled_at: amanha.toISOString(),
        status: 'pending',
        scheduled_subgroup: subgrupo || 'Geral',
        scheduled_items: pecas,
        week_ref: `${amanha.getFullYear()}-W${Math.ceil(amanha.getDate()/7)}`
      }).select().single();

      // 4. Prepara o retorno para o Dispara.ai
      respostaPowerAutomate.push({
        nome: tech.name,
        telefone: tech.phone,
        subgrupo: subgrupo || 'Geral',
        
      });
    }

    return NextResponse.json({ content: respostaPowerAutomate });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
