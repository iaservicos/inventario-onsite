'use client';

import { NextResponse } from 'next/server';

// Mock database - substituir com real DB
const frotasMock = [
  {
    id: '1',
    placa: 'ABC-1234',
    modelo: 'Ford Transit',
    ano: 2022,
    marca: 'Ford',
    kmAtual: 45000,
    status: 'Ativo',
    tecnicoAssignado: null,
    ultimaManutencao: new Date('2024-05-15'),
    proximaManutencao: new Date('2024-12-15'),
    combustivel: 60,
    observacoes: 'Veículo em bom estado'
  },
  {
    id: '2',
    placa: 'XYZ-5678',
    modelo: 'Volkswagen Kombi',
    ano: 2021,
    marca: 'Volkswagen',
    kmAtual: 32000,
    status: 'Manutenção',
    tecnicoAssignado: null,
    ultimaManutencao: new Date('2024-01-20'),
    proximaManutencao: new Date('2024-07-20'),
    combustivel: 30,
    observacoes: 'Aguardando revisão'
  }
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let frotas = [...frotasMock];

    // Filtrar por status
    if (status) {
      frotas = frotas.filter((f) => f.status === status);
    }

    // Buscar por placa ou modelo
    if (search) {
      const query = search.toLowerCase();
      frotas = frotas.filter(
        (f) =>
          f.placa.toLowerCase().includes(query) ||
          f.modelo.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      data: frotas,
      total: frotas.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validações básicas
    if (!body.placa || !body.modelo) {
      return NextResponse.json(
        { success: false, error: 'Placa e modelo são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar placa duplicada
    if (frotasMock.some((f) => f.placa === body.placa)) {
      return NextResponse.json(
        { success: false, error: 'Placa já existe no sistema' },
        { status: 409 }
      );
    }

    const novaFrota = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    frotasMock.push(novaFrota);

    return NextResponse.json(
      { success: true, data: novaFrota },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
