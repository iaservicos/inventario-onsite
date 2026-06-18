'use client';

import { NextResponse } from 'next/server';

// Mock database
const frotasMock = [
  {
    id: '1',
    placa: 'ABC-1234',
    modelo: 'Ford Transit',
    ano: 2022,
    marca: 'Ford',
    kmAtual: 45000,
    status: 'Ativo'
  }
];

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const frota = frotasMock.find((f) => f.id === id);

    if (!frota) {
      return NextResponse.json(
        { success: false, error: 'Veículo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: frota });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const index = frotasMock.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Veículo não encontrado' },
        { status: 404 }
      );
    }

    const updated = {
      ...frotasMock[index],
      ...body,
      updatedAt: new Date()
    };

    frotasMock[index] = updated;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const index = frotasMock.findIndex((f) => f.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Veículo não encontrado' },
        { status: 404 }
      );
    }

    const deleted = frotasMock.splice(index, 1);

    return NextResponse.json({
      success: true,
      message: 'Veículo deletado',
      data: deleted[0]
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
