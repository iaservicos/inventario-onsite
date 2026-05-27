import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '@/lib/db';
import { createSchedule } from '@/lib/db-gptmaker';

export async function POST(request) {
  try {
    const supabase = createServiceClient();
    const now = new Date();

    // Ajusta para Brasília (GMT-3)
    const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const brTomorrow = new Date(brNow);
    brTomorrow.setDate(brNow.getDate() + 1);
    
    // Obtém o dia da semana de amanhã (1 para Segunda, 7 para Domingo)
    const tomorrowDayOfWeek = brTomorrow.getDay(); // getDay() retorna 0 para Domingo, 1 para Segunda...
    const targetDay = tomorrowDayOfWeek === 0 ? 7 : tomorrowDayOfWeek; // Ajusta para 1=Segunda, 7=Domingo

    // Busca técnicos que têm agendamento para o dia da semana de amanhã
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, inventory_day, inventory_time')
      .eq('active', true)
      .eq('inventory_day', targetDay);

    if (techError) {
      console.error('Erro ao buscar técnicos:', techError);
      return NextResponse.json({ error: 'Erro ao buscar técnicos' }, { status: 500 });
    }

    if (!technicians || technicians.length === 0) {
      return NextResponse.json({ message: 'Nenhum técnico agendado para amanhã.', generated_schedules: 0 });
    }

    const generatedSchedules = [];
    const weekSubgroup = await getWeekSubgroup(supabase); // Busca o subgrupo da semana uma vez

    for (const tech of technicians) {
      try {
        // Verifica se já existe um agendamento para este técnico amanhã
        const { data: existingSchedules } = await supabase
          .from('inventory_schedules')
          .select('id')
          .eq('technician_id', tech.id)
          .gte('scheduled_at', new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 0, 0, 0).toISOString())
          .lte('scheduled_at', new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 23, 59, 59).toISOString());

        if (existingSchedules && existingSchedules.length > 0) {
          console.log(`Agendamento para ${tech.name} em ${brTomorrow.toLocaleDateString()} já existe. Pulando.`);
          continue;
        }

        const consolidatedItems = await getConsolidatedTechnicianItems(supabase, tech.id, weekSubgroup);

        if (!consolidatedItems?.length) {
          console.warn(`Técnico ${tech.name} sem peças ativas ou para o subgrupo ${weekSubgroup}. Pulando agendamento.`);
          continue;
        }

        // Monta a data e hora do agendamento para amanhã
        const [hour, minute] = tech.inventory_time.split(':').map(Number);
        const scheduled_at = new Date(
          brTomorrow.getFullYear(),
          brTomorrow.getMonth(),
          brTomorrow.getDate(),
          hour,
          minute,
          0
        );

        // Cria o agendamento
        const newSchedule = await createSchedule({
          technician_id: tech.id,
          scheduled_by: 'system',
          scheduled_at: scheduled_at.toISOString(),
          week_ref: `${brTomorrow.getFullYear()}-W${Math.ceil((brTomorrow.getTime() - new Date(brTomorrow.getFullYear(), 0, 1).getTime()) / (86400000 * 7))}`, // Calcula week_ref
          items_count: consolidatedItems.length,
          notes: 'Agendamento automático diário',
          scheduled_subgroup: weekSubgroup,
          scheduled_items: consolidatedItems,
        });
        generatedSchedules.push(newSchedule);
      } catch (scheduleErr) {
        console.error(`Erro ao gerar agendamento para ${tech.name}:`, scheduleErr);
      }
    }

    return NextResponse.json({ 
      message: `Processamento concluído. ${generatedSchedules.length} agendamento(s) criado(s).`,
      generated_schedules: generatedSchedules.length,
      details: generatedSchedules.map(s => ({ id: s.id, technician_id: s.technician_id, scheduled_at: s.scheduled_at }))
    });

  } catch (err) {
    console.error('Erro interno na geração de agendamentos diários:', err);
    return NextResponse.json({ error: 'Erro interno na geração de agendamentos diários' }, { status: 500 });
  }
}

