import { createServiceClient } from './supabase';

function db() {
  return createServiceClient();
}

// ── VEÍCULOS ──────────────────────────────────────────────────────────────────

export async function getAllVeiculos() {
  const { data, error } = await db().from('veiculos').select('*').order('placa');
  if (error) throw error;
  return data || [];
}

export async function getVeiculoByPlaca(placa) {
  const { data, error } = await db().from('veiculos').select('*').eq('placa', placa).single();
  if (error) throw error;
  return data;
}

export async function createVeiculo({ placa, modelo, marca, ano, km_atual, status, combustivel, observacoes }) {
  const { data, error } = await db().from('veiculos').insert({
    placa,
    modelo,
    marca,
    ano,
    km_atual,
    status,
    combustivel,
    observacoes
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateVeiculo(placa, fields) {
  const { data, error } = await db().from('veiculos').update(fields).eq('placa', placa).select().single();
  if (error) throw error;
  return data;
}

export async function deleteVeiculo(placa) {
  const { error } = await db().from('veiculos').delete().eq('placa', placa);
  if (error) throw error;
}

// ── COMBUSTÍVEIS ──────────────────────────────────────────────────────────────────

export async function getAllCombustiveis() {
  const { data, error } = await db()
    .from('combustiveis')
    .select('*')
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCombustiveisByPlaca(placa) {
  const { data, error } = await db()
    .from('combustiveis')
    .select('*')
    .eq('placa', placa)
    .order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCombustivel(combustivel) {
  const { data, error } = await db()
    .from('combustiveis')
    .insert(combustivel)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCombustiveisBatch(combustiveis) {
  const { data, error } = await db()
    .from('combustiveis')
    .insert(combustiveis)
    .select();
  if (error) throw error;
  return data || [];
}

export async function updateCombustivel(id, fields) {
  const { data, error } = await db()
    .from('combustiveis')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCombustivel(id) {
  const { error } = await db().from('combustiveis').delete().eq('id', id);
  if (error) throw error;
}

// ── MANUTENÇÕES ───────────────────────────────────────────────────────────────────

export async function getAllManutencoes() {
  const { data, error } = await db()
    .from('manutencoes')
    .select('*')
    .order('data_realizada', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getManutencoesByPlaca(placa) {
  const { data, error } = await db()
    .from('manutencoes')
    .select('*')
    .eq('placa', placa)
    .order('data_realizada', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createManutencao(manutencao) {
  const { data, error } = await db()
    .from('manutencoes')
    .insert(manutencao)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── MOVIMENTAÇÕES ─────────────────────────────────────────────────────────────────

export async function getAllMovimentacoes() {
  const { data, error } = await db()
    .from('movimentacoes')
    .select('*')
    .order('data_movimentacao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMovimentacoesByPlaca(placa) {
  const { data, error } = await db()
    .from('movimentacoes')
    .select('*')
    .eq('placa', placa)
    .order('data_movimentacao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createMovimentacao(movimentacao) {
  const { data, error } = await db()
    .from('movimentacoes')
    .insert(movimentacao)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── FOTOS HODÔMETRO ───────────────────────────────────────────────────────────────

export async function getAllFotos() {
  const { data, error } = await db()
    .from('fotos_hodometro')
    .select('*')
    .order('data_upload', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFotosByPlaca(placa) {
  const { data, error } = await db()
    .from('fotos_hodometro')
    .select('*')
    .eq('placa', placa)
    .order('data_upload', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFotosAguardandoAprovacao() {
  const { data, error } = await db()
    .from('fotos_hodometro')
    .select('*')
    .eq('status', 'pendente')
    .order('data_upload', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createFoto(foto) {
  const { data, error } = await db()
    .from('fotos_hodometro')
    .insert(foto)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFoto(id, fields) {
  const { data, error } = await db()
    .from('fotos_hodometro')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── DEVOLUÇÕES ────────────────────────────────────────────────────────────────────

export async function getAllDevolucoes() {
  const { data, error } = await db()
    .from('devolucoes')
    .select('*')
    .order('data_devolucao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDevoluçoesByPlaca(placa) {
  const { data, error } = await db()
    .from('devolucoes')
    .select('*')
    .eq('placa', placa)
    .order('data_devolucao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createDevolucao(devolucao) {
  const { data, error } = await db()
    .from('devolucoes')
    .insert(devolucao)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── DESPESAS ──────────────────────────────────────────────────────────────────────

export async function getAllDespesas() {
  const { data, error } = await db()
    .from('despesas')
    .select('*')
    .order('data_despesa', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDespesasByPlaca(placa) {
  const { data, error } = await db()
    .from('despesas')
    .select('*')
    .eq('placa', placa)
    .order('data_despesa', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createDespesa(despesa) {
  const { data, error } = await db()
    .from('despesas')
    .insert(despesa)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDespesa(id, fields) {
  const { data, error } = await db()
    .from('despesas')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── KPIs ──────────────────────────────────────────────────────────────────────────

export async function getVeiculosKPI() {
  const { data, error } = await db().from('veiculos').select('status');
  if (error) throw error;
  const rows = data || [];

  return {
    total: rows.length,
    ativos: rows.filter(r => r.status === 'Ativo').length,
    manutencao: rows.filter(r => r.status === 'Manutenção').length,
    parados: rows.filter(r => r.status === 'Parado').length,
    descartados: rows.filter(r => r.status === 'Descartado').length
  };
}

export async function getCombustiveisKPI() {
  const { data, error } = await db()
    .from('combustiveis')
    .select('litros, vl_total, km_l');
  if (error) throw error;
  const rows = data || [];

  const totalLitros = rows.reduce((sum, r) => sum + (parseFloat(r.litros) || 0), 0);
  const totalGasto = rows.reduce((sum, r) => sum + (parseFloat(r.vl_total) || 0), 0);
  const mediaKmL = rows.length > 0
    ? rows.reduce((sum, r) => sum + (parseFloat(r.km_l) || 0), 0) / rows.length
    : 0;

  return {
    totalLitros: totalLitros.toFixed(2),
    totalGasto: totalGasto.toFixed(2),
    mediaKmL: mediaKmL.toFixed(2),
    registros: rows.length
  };
}
