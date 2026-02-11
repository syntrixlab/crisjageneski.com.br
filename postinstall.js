#!/usr/bin/env node
/**
 * SCRIPT DE POS-INSTALACAO
 * Executa apos npm install para preparar dependencias de runtime.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('\n========================================');
console.log('POSTINSTALL INICIADO');
console.log('========================================\n');

try {
  console.log('Gerando Prisma Client...');
  const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');

  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    stdio: 'inherit',
    cwd: __dirname,
  });

  if (process.env.NODE_ENV === 'production') {
    console.log('\nAmbiente de producao detectado.');
    console.log('O servidor sera iniciado apenas pelo comando npm start da plataforma.');
  } else {
    console.log('\nAmbiente de desenvolvimento detectado.');
  }

  console.log('Postinstall concluido com sucesso.\n');
} catch (error) {
  console.error('Erro no postinstall:', error.message);
  console.log('Continuando instalacao apesar do erro.\n');
}