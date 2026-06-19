/**
 * Testes básicos do modelo Combustível
 * Execute com: npm test
 */

import {
  validateCombustivel,
  normalizeCombustivel,
  saveCombustivelBatch
} from '../combustivel';

describe('Combustível Model', () => {
  describe('validateCombustivel', () => {
    test('deve validar registro correto', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João Silva',
        uf: 'SP',
        produto: 'Diesel',
        litros: 50,
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      };

      const result = validateCombustivel(registro);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('deve rejeitar placa inválida', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'INVALIDO',
        motorista: 'João Silva',
        uf: 'SP',
        produto: 'Diesel',
        litros: 50,
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      };

      const result = validateCombustivel(registro);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Placa'))).toBe(true);
    });

    test('deve rejeitar produto inválido', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João Silva',
        uf: 'SP',
        produto: 'Gasolina Premium',
        litros: 50,
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      };

      const result = validateCombustivel(registro);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Produto'))).toBe(true);
    });

    test('deve rejeitar UF com mais de 2 letras', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João Silva',
        uf: 'SPA',
        produto: 'Diesel',
        litros: 50,
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      };

      const result = validateCombustivel(registro);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('UF'))).toBe(true);
    });

    test('deve rejeitar litros inválido', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João Silva',
        uf: 'SP',
        produto: 'Diesel',
        litros: 0, // Deve ser > 0.1
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      };

      const result = validateCombustivel(registro);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Litros'))).toBe(true);
    });
  });

  describe('normalizeCombustivel', () => {
    test('deve normalizar registro corretamente', () => {
      const registro = {
        data: '2026-06-19',
        placa: 'abc-1234', // minúsculas
        motorista: '  João Silva  ', // com espaços
        uf: 'sp', // minúsculas
        produto: 'Diesel',
        litros: '50', // string
        kmL: '5.5', // string
        hodometro: '45000', // string
        vl_unit: '5.80', // string
        vl_total: '290.00', // string
        filial: '  SP-01  ', // com espaços
        uso: 'servico'
      };

      const normalized = normalizeCombustivel(registro);

      expect(normalized.placa).toBe('ABC-1234');
      expect(normalized.motorista).toBe('João Silva');
      expect(normalized.uf).toBe('SP');
      expect(normalized.litros).toBe(50);
      expect(normalized.kmL).toBe(5.5);
      expect(normalized.hodometro).toBe(45000);
      expect(normalized.vl_unit).toBe(5.8);
      expect(normalized.vl_total).toBe(290);
      expect(normalized.filial).toBe('SP-01');
      expect(normalized.id).toBeDefined();
      expect(normalized.createdAt).toBeDefined();
    });
  });

  describe('saveCombustivelBatch', () => {
    test('deve salvar batch com registros válidos', async () => {
      const registros = [
        {
          data: '2026-06-19',
          placa: 'ABC-1234',
          motorista: 'João Silva',
          uf: 'SP',
          produto: 'Diesel',
          litros: 50,
          kmL: 5.5,
          hodometro: 45000,
          vl_unit: 5.80,
          vl_total: 290.00,
          filial: 'SP-01',
          uso: 'servico'
        }
      ];

      const result = await saveCombustivelBatch(registros);

      expect(result.success).toBe(true);
      expect(result.saved).toBe(1);
      expect(result.total).toBe(1);
    });

    test('deve retornar erros para registros inválidos', async () => {
      const registros = [
        {
          data: '2026-06-19',
          placa: 'ABC-1234',
          motorista: 'João Silva',
          uf: 'SP',
          produto: 'Diesel',
          litros: 50,
          kmL: 5.5,
          hodometro: 45000,
          vl_unit: 5.80,
          vl_total: 290.00,
          filial: 'SP-01',
          uso: 'servico'
        },
        {
          data: '2026-06-19',
          placa: 'INVALIDO', // Inválido
          motorista: 'João Silva',
          uf: 'SP',
          produto: 'Diesel',
          litros: 50,
          kmL: 5.5,
          hodometro: 45000,
          vl_unit: 5.80,
          vl_total: 290.00,
          filial: 'SP-01',
          uso: 'servico'
        }
      ];

      const result = await saveCombustivelBatch(registros);

      expect(result.saved).toBe(1);
      expect(result.total).toBe(2);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBe(1);
    });
  });
});
