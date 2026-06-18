import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

let frotasDB = [
  {
    id: 1,
    placa: 'ABC-1234',
    modelo: 'Ford Transit',
    marca: 'Ford',
    ano: 2022,
    kmAtual: 42000,
    status: 'Ativo',
    combustivel: 50,
    observacoes: 'Veículo em bom estado',
    ultimaManutencao: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    proximaManutencao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 2,
    placa: 'XYZ-5678',
    modelo: 'Iveco Daily',
    marca: 'Iveco',
    ano: 2021,
    kmAtual: 62000,
    status: 'Parado',
    combustivel: 30,
    observacoes: 'Em manutenção preventiva',
    ultimaManutencao: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    proximaManutencao: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: frotasDB,
      count: frotasDB.length
    });
  } catch (error) {
    console.error('Erro ao buscar frotas:', error);
    return NextResponse.json({ error: 'Erro ao buscar frotas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    if (action === 'import') {
      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
      }

      const imported = data.map((row, idx) => ({
        id: frotasDB.length + idx + 1,
        placa: row.placa?.toUpperCase() || '',
        modelo: row.modelo || '',
        marca: row.marca || '',
        ano: parseInt(row.ano) || new Date().getFullYear(),
        kmAtual: parseInt(row.kmAtual) || 0,
        status: row.status || 'Ativo',
        combustivel: parseInt(row.combustivel) || 0,
        observacoes: row.observacoes || '',
        ultimaManutencao: row.ultimaManutencao || null,
        proximaManutencao: row.proximaManutencao || null
      })).filter(v => v.placa && v.modelo);

      if (imported.length === 0) {
        return NextResponse.json({ error: 'Nenhum veículo válido para importar' }, { status: 400 });
      }

      frotasDB = [...frotasDB, ...imported];

      return NextResponse.json({
        success: true,
        imported: imported.length,
        total: frotasDB.length,
        data: imported
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao importar frotas:', error);
    return NextResponse.json({ error: 'Erro ao importar frotas' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      frotasDB = frotasDB.slice(0, 2);
      return NextResponse.json({ success: true, message: 'Dados resetados para padrão' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 });
  }
}
