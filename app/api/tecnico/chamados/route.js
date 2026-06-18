'use client';

import { NextResponse } from 'next/server';

// Mock database
const chamadosMock = [
  {
    id: '1',
    numero: '50014582863',
    tecnicoId: '1',
    frotaId: '1',
    statusChamado: 'Em Atendimento',
    dataAbertura: new Date('2026-06-18T09:30:00'),
    dataFechamento: null,
    descricao: 'Manutenção preventiva',
    observacaoFinal: null,
    duracao: null
  },
  {
    id: '2',
    numero: '50014582864',
    tecnicoId: '1',
    frotaId: '2',
    statusChamado: 'Finalizado',
    dataAbertura: new Date('2026-06-18T08:00:00'),
    dataFechamento: new Date('2026-06-18T09:00:00'),
    descricao: 'Reparo de pneu',
    observacaoFinal: 'Pneu substituído com sucesso',
    duracao: 60
  }
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tecnicoId = searchParams.get('tecnicoId');
    const status = searchParams.get('status');

    let chamados = [...chamadosMock];

    if (tecnicoId) {
      chamados = chamados.filter((c) => c.tecnicoId === tecnicoId);
    }

    if (status) {
      chamados = chamados.filter((c) => c.statusChamado === status);
    }

    return NextResponse.json({
      success: true,
      data: chamados,
      total: chamados.length
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

    if (!body.numero || !body.tecnicoId) {
      return NextResponse.json(
        { success: false, error: 'Número e técnico são obrigatórios' },
        { status: 400 }
      );
    }

    const novoChamado = {
      id: Date.now().toString(),
      ...body,
      dataAbertura: new Date(),
      statusChamado: 'Aberto',
      dataFechamento: null
    };

    chamadosMock.push(novoChamado);

    return NextResponse.json(
      { success: true, data: novoChamado },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
