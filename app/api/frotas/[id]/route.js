// Mock database - em produção seria um banco de dados real
let mockFrotas = [
  { id: '1', placa: 'ABC-1234', modelo: 'Ford Transit', ano: 2022, marca: 'Ford', kmAtual: 45000, status: 'Ativo', combustivel: 60, ultimaManutencao: '2026-05-20', observacoes: 'Veículo em bom estado' },
  { id: '2', placa: 'XYZ-5678', modelo: 'Iveco Daily', ano: 2021, marca: 'Iveco', kmAtual: 62000, status: 'Parado', combustivel: 30, ultimaManutencao: '2026-04-10', observacoes: 'Aguardando manutenção' }
];

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const frota = mockFrotas.find((f) => f.id === id);

    if (!frota) {
      return Response.json({ success: false, error: 'Veículo não encontrado' }, { status: 404 });
    }

    return Response.json({ success: true, data: frota });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const index = mockFrotas.findIndex((f) => f.id === id);
    if (index === -1) {
      return Response.json({ success: false, error: 'Veículo não encontrado' }, { status: 404 });
    }

    mockFrotas[index] = { ...mockFrotas[index], ...body, id };

    return Response.json({ success: true, data: mockFrotas[index] });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const index = mockFrotas.findIndex((f) => f.id === id);

    if (index === -1) {
      return Response.json({ success: false, error: 'Veículo não encontrado' }, { status: 404 });
    }

    mockFrotas.splice(index, 1);

    return Response.json({ success: true, message: 'Veículo deletado com sucesso' });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
