'use client';

import { NextResponse } from 'next/server';

// Mock database
const pontosMock = [
  {
    id: '1',
    tecnicoId: '1',
    data: new Date('2026-06-18'),
    tipo: 'ENTRADA',
    hora: '08:30',
    latitude: -23.5505,
    longitude: -46.6333,
    status: 'Registrado'
  },
  {
    id: '2',
    tecnicoId: '1',
    data: new Date('2026-06-17'),
    tipo: 'ENTRADA',
    hora: '08:15',
    latitude: -23.5505,
    longitude: -46.6333,
    status: 'Registrado'
  }
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tecnicoId = searchParams.get('tecnicoId');
    const data = searchParams.get('data');

    let pontos = [...pontosMock];

    if (tecnicoId) {
      pontos = pontos.filter((p) => p.tecnicoId === tecnicoId);
    }

    if (data) {
      pontos = pontos.filter((p) => p.data === new Date(data).toISOString().split('T')[0]);
    }

    return NextResponse.json({
      success: true,
      data: pontos,
      total: pontos.length
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

    if (!body.tecnicoId || !body.tipo) {
      return NextResponse.json(
        { success: false, error: 'Técnico e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe entrada/saída no mesmo dia
    const hoje = new Date().toISOString().split('T')[0];
    const existente = pontosMock.find(
      (p) => p.tecnicoId === body.tecnicoId && p.data === hoje && p.tipo === body.tipo
    );

    if (existente) {
      return NextResponse.json(
        { success: false, error: `${body.tipo} já foi registrada hoje` },
        { status: 409 }
      );
    }

    const novoPonto = {
      id: Date.now().toString(),
      ...body,
      data: new Date(),
      status: 'Registrado'
    };

    pontosMock.push(novoPonto);

    return NextResponse.json(
      { success: true, data: novoPonto },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
