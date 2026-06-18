const mockFrotas = [
  { id: '1', placa: 'ABC-1234', modelo: 'Ford Transit', ano: 2022, marca: 'Ford', kmAtual: 45000, status: 'Ativo', combustivel: 60, ultimaManutencao: '2026-05-20', observacoes: 'Veículo em bom estado' },
  { id: '2', placa: 'XYZ-5678', modelo: 'Iveco Daily', ano: 2021, marca: 'Iveco', kmAtual: 62000, status: 'Parado', combustivel: 30, ultimaManutencao: '2026-04-10', observacoes: 'Aguardando manutenção' }
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toUpperCase() || '';
    const status = searchParams.get('status') || '';

    let resultado = mockFrotas;

    if (search) {
      resultado = resultado.filter((f) => f.placa.includes(search) || f.modelo.toUpperCase().includes(search));
    }

    if (status) {
      resultado = resultado.filter((f) => f.status === status);
    }

    return Response.json({ success: true, data: resultado, total: resultado.length });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const existe = mockFrotas.some((f) => f.placa === body.placa);
    if (existe) {
      return Response.json({ success: false, error: 'Placa já existe' }, { status: 400 });
    }

    const novaFrota = {
      id: String(Math.max(...mockFrotas.map((f) => parseInt(f.id)), 0) + 1),
      ...body,
      ultimaManutencao: body.ultimaManutencao || new Date().toISOString().split('T')[0]
    };

    mockFrotas.push(novaFrota);
    return Response.json({ success: true, data: novaFrota }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
