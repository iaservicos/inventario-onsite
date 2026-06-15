/**
 * Script de teste para a função detectSubgroup
 * Execução: node test_subgroups.js
 */

function detectSubgroup(name) {
  if (!name) return 'Outros';
  
  const words = name.trim().toUpperCase().split(/\s+/);
  const firstWord = words[0];

  // Regras baseadas na primeira palavra
  if (firstWord === 'PLM') return 'PLM';
  if (firstWord === 'ADAPT' || firstWord === 'FONTE') return 'Fonte/Adaptador';
  if (firstWord === 'HDD' || firstWord === 'SSD') return 'SSD/HD';
  if (firstWord === 'MON' && words[1] === 'LED') return 'MONITOR';
  if (firstWord === 'MEM') return 'Memória';
  if (firstWord === 'CONJ.') return 'Diversos';
  if (firstWord === 'LCD') return 'LCD';
  if (firstWord === 'BATER') return 'Bateria';
  if (firstWord === 'PROC') return 'Processador';
  // Acessórios que contêm palavras de outros subgrupos no nome mas não pertencem a eles
  if (firstWord === 'CABO' || firstWord === 'HEAT' || firstWord === 'SUPORTE' || firstWord === 'KIT') return 'Outros';

  // Fallback para busca por palavras-chave se a primeira palavra não bater
  const n = name.toUpperCase();
  if (n.includes('SSD') || n.includes('HD ') || n.includes('DISCO RIGIDO')) return 'SSD/HD';
  if (n.includes('MEM') || n.includes('DDR') || n.includes('DIMM')) return 'Memória';
  if (n.includes('PLM') || n.includes('PLACA MAE') || n.includes('MOTHERBOARD')) return 'PLM';
  if (n.includes('BAT') || n.includes('LI-ION') || n.includes('BATERIA')) return 'Bateria';
  if (n.includes('LCD') || n.includes('TELA') || n.includes('DISPLAY')) return 'LCD';
  if (n.includes('FONTE') || n.includes('ADAPTADOR') || n.includes('POWER SUPPLY')) return 'Fonte/Adaptador';
  if (n.includes('TECLADO') || n.includes('KBD')) return 'Teclado';
  
  return 'Outros';
}

const testCases = [
  { name: 'PLM NOTEBOOK POSITIVO', expected: 'PLM' },
  { name: 'ADAPTADOR AC/DC 19V', expected: 'Fonte/Adaptador' },
  { name: 'FONTE DE ALIMENTACAO ATX', expected: 'Fonte/Adaptador' },
  { name: 'HDD 500GB SATA', expected: 'SSD/HD' },
  { name: 'SSD 240GB KINGSTON', expected: 'SSD/HD' },
  { name: 'MON LED 19.5 POLEGADAS', expected: 'MONITOR' },
  { name: 'MEMORIA DDR4 8GB', expected: 'Memória' },
  { name: 'CONJ. CABOS SATA', expected: 'Diversos' },
  { name: 'LCD 14.0 SLIM', expected: 'LCD' },
  { name: 'BATERIA LI-ION 3 CELULAS', expected: 'Bateria' },
  { name: 'PROC CORE I5 10TH GEN', expected: 'Processador' },
  { name: 'TECLADO USB PRETO', expected: 'Teclado' },
  { name: 'MOUSE OPTICO USB', expected: 'Outros' },
  { name: 'PLACA MAE DESKTOP', expected: 'PLM' }, // Fallback
  { name: 'DISCO RIGIDO EXTERNO', expected: 'SSD/HD' }, // Fallback
  { name: 'HEAT SINK PARA SSD M.2 SEA SHARK JEYI', expected: 'Outros' },
  { name: 'CABO SATA HD GAB POS UFPG01 MINIPRO', expected: 'Outros' },
  { name: 'SUPORTE PARA HD 2.5', expected: 'Outros' },
  { name: 'KIT BATERIA LI-ION', expected: 'Outros' },
];

console.log('--- INICIANDO TESTES DE SUBGRUPOS ---\n');
let passed = 0;
testCases.forEach(tc => {
  const result = detectSubgroup(tc.name);
  const status = result === tc.expected ? '✅ PASSOU' : `❌ FALHOU (Esperado: ${tc.expected}, Obtido: ${result})`;
  console.log(`${status} | Nome: "${tc.name}"`);
  if (result === tc.expected) passed++;
});

console.log(`\n--- RESULTADO FINAL: ${passed}/${testCases.length} TESTES PASSARAM ---`);
