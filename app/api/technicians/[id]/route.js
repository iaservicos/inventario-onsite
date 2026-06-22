import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

// Função para calcular week_ref ISO
function getWeekRef(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Função para buscar o subgrupo prioritário da semana atual
async function getWeekSubgroup(supabase) {
  const { data } = await supabase
    .from('v_current_week_subgroup')
    .select('subgroup_name')
    .maybeSingle();
  return data?.subgroup_name || null;
}

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';

    const supabase = createServiceClient();

    let query = supabase
      .from('technicians')
      .select('*')
      .order('name');

    /* ─── Regra de Visibilidade por Perfil ──────────────────── */
    
    if (session.user.role === 'supervisor') {
      // REGRA ESPECIAL SP: Se o filtro for SP, permite ver todos de SP. 
      // Caso contrário, vê apenas os seus.
      if (region === 'SP') {
        query = query.eq('region', 'SP');
      } else {
        query = query.ilike('supervisor_name', session.user.name);
      }
    }

    /* ─── Filtros de Busca e Região ─────────────────────────── */

    if (search) {
      // Busca por nome ou e-mail
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (region && region !== 'SP') {
      // Se não for SP (que já tratamos na regra de supervisor), aplica o filtro de região
      query = query.eq('region', region);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const supabase = createServiceClient();
    
    const cleanData = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      region: body.region || null,
      supervisor_name: body.supervisor_name || session.user.name,
      active: body.active !== undefined ? body.active : true
    };

    const { data, error } = await supabase
      .from('technicians')
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('API Post Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores podem excluir técnicos' }, { status: 403 });

    const params = await context.params;
    const { id } = params;
    if (!id || id === 'undefined') return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const supabase = createServiceClient();

    // Verifica se o técnico tem inventários associados
    const { count } = await supabase
      .from('inventories')
      .select('id', { count: 'exact', head: true })
      .eq('technician_id', id);

    if (count > 0) {
      return NextResponse.json(
        { error: 'Este técnico possui inventários registrados e não pode ser excluído. Use a opção de inativar.' },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const isAdmin = session.user.role === 'admin';
    const isCoordinator = session.user.role === 'coordinator';
    const isAnalyst = session.user.role === 'analyst';

    const params = await context.params;
    const { id } = params;

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID do técnico inválido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    // Validação de Permissão para Supervisor (não aplica para admin, coordinator, analyst)
    if (!isAdmin && !isCoordinator && !isAnalyst) {
      const { data: tech } = await supabase.from('technicians').select('supervisor_name, region').eq('id', id).single();
      const isHisTech = tech?.supervisor_name === session.user.name;
      const isSPTech = tech?.region === 'SP';

      if (!isHisTech && !isSPTech) {
        return NextResponse.json({ error: 'Você não tem permissão para editar este técnico' }, { status: 403 });
      }
    }

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.region !== undefined) updateData.region = body.region || null;
    if (body.supervisor_name !== undefined && (isAdmin || isCoordinator)) updateData.supervisor_name = body.supervisor_name;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.inventory_day !== undefined) updateData.inventory_day = body.inventory_day;
    if (body.inventory_time !== undefined) updateData.inventory_time = body.inventory_time;
    
    updateData.updated_at = new Date().toISOString();

    const { data: techData, error } = await supabase
      .from('technicians')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase Update Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // --- LÓGICA DE AGENDAMENTO EM TEMPO REAL ---
    // Se o supervisor alterou o dia ou horário, já prepara o agendamento e as peças
    if (body.inventory_day !== undefined || body.inventory_time !== undefined) {
      try {
        const week = getWeekRef();
        
        // 1. Busca peças diretamente do Supabase (já espelhadas)
        const { data: allItems } = await supabase
          .from('technician_items')
          .select('*')
          .eq('technician_id', id)
          .eq('active', true);
        
        if (allItems && allItems.length > 0) {
          // 2. Busca subgrupo da semana
          const weekSubgroup = await getWeekSubgroup(supabase);
          
          // 3. Seleciona peças (Lógica de Subgrupo)
          let selected = [];
          if (weekSubgroup) {
            selected = allItems.filter(item => (item.item_subgroup || '').toLowerCase() === weekSubgroup.toLowerCase());
          }
          
          // Fallback se subgrupo vazio: pega todas as peças (sem limite de 10)
          if (selected.length === 0) {
            selected = allItems;
          }

          // 3.1 Consolidação de Peças (Soma quantidades de códigos iguais)
          const consolidatedMap = new Map();
          selected.forEach(item => {
            const code = item.item_code;
            if (consolidatedMap.has(code)) {
              const existing = consolidatedMap.get(code);
              existing.quantity = (existing.quantity || 0) + (item.quantity || 1);
            } else {
              consolidatedMap.set(code, { ...item });
            }
          });
          const consolidatedItems = Array.from(consolidatedMap.values());

          // 4. Calcula data do próximo agendamento (Brasília)
          const targetDay = techData.inventory_day || 1;
          const targetTime = techData.inventory_time || '09:00';
          const [hours, minutes] = targetTime.split(':').map(Number);
          
          const now = new Date();
          const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
          const scheduledDate = new Date(brNow);
          const jsTargetDay = targetDay === 7 ? 0 : targetDay;
          let dayDiff = jsTargetDay - brNow.getDay();
          
          if (dayDiff < 0 || (dayDiff === 0 && (brNow.getHours() > hours || (brNow.getHours() === hours && brNow.getMinutes() >= minutes)))) {
            dayDiff += 7;
          }
          
          scheduledDate.setDate(brNow.getDate() + dayDiff);
          scheduledDate.setHours(hours, minutes, 0, 0);
          const utcScheduledDate = new Date(scheduledDate.getTime() + (3 * 60 * 60 * 1000));

          // 5. Upsert no agendamento (evita duplicados para a mesma semana)
          await supabase.from('inventory_schedules').upsert({
            technician_id: id,
            scheduled_at: utcScheduledDate.toISOString(),
            week_ref: week,
            items_count: consolidatedItems.length, // Agora conta itens únicos consolidados
            status: 'pending',
            notes: `Agendamento em tempo real (Supervisor). Subgrupo: ${weekSubgroup || 'N/A'}. Total peças: ${selected.length}`
          }, { onConflict: 'technician_id,week_ref' });
        }
      } catch (err) {
        console.error('Erro ao processar agendamento em tempo real:', err);
        // Não bloqueia a resposta da API se o agendamento falhar
      }
    }

    return NextResponse.json(techData, { status: 200 });
  } catch (err) {
    console.error('API PATCH Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
