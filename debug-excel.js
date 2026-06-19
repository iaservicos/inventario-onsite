#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Try to read with a simple approach
const excelFile = './Relatório_Analise de Consumo de Combustivel-09_06_2026_15_18_03.xlsx';

if (!fs.existsSync(excelFile)) {
  console.error('Arquivo não encontrado:', excelFile);
  process.exit(1);
}

// Para ler Excel precisamos de uma biblioteca
// Vamos usar a que pode estar instalada ou instalar
try {
  // Tentar com exceljs
  const ExcelJS = require('exceljs');

  (async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelFile);

      const worksheet = workbook.worksheets[0];

      console.log('=== ANÁLISE DO ARQUIVO EXCEL ===\n');
      console.log(`Sheet: ${worksheet.name}`);
      console.log(`Dimensões: ${worksheet.rowCount} linhas x ${worksheet.columnCount} colunas\n`);

      console.log('COLUNAS:');
      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers.push(cell.value);
        console.log(`  ${colNumber}. ${cell.value}`);
      });

      console.log('\nPRIMEIRAS 5 LINHAS DE DADOS:');
      for (let i = 2; i <= Math.min(6, worksheet.rowCount); i++) {
        console.log(`\nLinha ${i}:`);
        const row = worksheet.getRow(i);
        headers.forEach((header, idx) => {
          const cell = row.getCell(idx + 1);
          console.log(`  ${header}: ${cell.value}`);
        });
      }

      console.log(`\nTOTAL DE REGISTROS: ${worksheet.rowCount - 1}`);
    } catch (error) {
      console.error('Erro ao ler com ExcelJS:', error.message);
      process.exit(1);
    }
  })();
} catch (e) {
  console.error('ExcelJS não encontrado. Instale com: npm install exceljs');
  process.exit(1);
}
