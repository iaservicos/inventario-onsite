import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({ message: "Rota ativa!" });
}

export async function GET() {
  return NextResponse.json({ message: "Use POST para gerar agendamentos" });
}
