// ============================================
// 🟢 SERVER.JS INICIADO!
// ============================================
console.log('\n╔════════════════════════════════════════╗');
console.log('║  🟢 SERVER.JS EXECUTANDO!              ║');
console.log('╚════════════════════════════════════════╝');
console.log('⏰ Data/Hora:', new Date().toISOString());
console.log('📁 Working Directory:', process.cwd());
console.log('🔧 Node Version:', process.version);
console.log('📋 Argumentos:', process.argv.join(' '));
console.log('════════════════════════════════════════\n');

/**
 * PRODUCTION SERVER - Hostinger Node.js Addon (SEM TERMINAL SSH)
 *
 * Este arquivo e o entrypoint principal para producao.
 * Serve os arquivos estaticos do build do Vite (client/dist)
 * e redireciona as requisicoes /api para o servidor Express compilado.
 * 
 * IMPORTANTE: Este servidor se auto-configura na primeira execução!
 * Não é necessário acesso ao terminal SSH.
 */

// CRITICAL: Carregar variaveis de ambiente ANTES de importar qualquer outro modulo
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('========================================');
console.log('🚀 INICIANDO SERVIDOR - HOSTINGER');
console.log('========================================\n');

// Log para diagnóstico
console.log('=== ENVIRONMENT CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('PORT:', process.env.PORT || '(usando fallback 4000)');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ configurado' : '✗ FALTANDO');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ configurado' : '✗ FALTANDO');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ configurado' : '✗ FALTANDO');
console.log('========================\n');

// AUTO-CONFIGURAÇÃO: Executar migrations na primeira inicialização
const installedFlagPath = path.join(__dirname, '.installed');
const isFirstRun = !fs.existsSync(installedFlagPath);

if (isFirstRun) {
  console.log('🔧 PRIMEIRA EXECUÇÃO DETECTADA!');
  console.log('Executando configuração inicial...\n');
  
  try {
    // Definir caminho absoluto do schema
    const schemaPath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
    console.log('📄 Schema Prisma:', schemaPath);
    
    // Verificar se Prisma Client foi gerado (deve ter sido pelo npm install)
    console.log('\n1/2 Verificando Prisma Client...');
    const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
      console.log('   ⚠️  Prisma Client não encontrado, gerando...');
      execSync(`npx prisma generate --schema "${schemaPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      console.log('   ✓ Prisma Client gerado com sucesso!');
    } else {
      console.log('   ✓ Prisma Client já existe');
    }

    // Executar migrations do banco de dados (ASYNC para não travar)
    console.log('\n2/2 Executando migrations do banco de dados...');
    console.log('   (Isso pode demorar alguns segundos...)');
    
    try {
      execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname,
        timeout: 30000 // 30 segundos timeout
      });
      console.log('   ✓ Migrations aplicadas com sucesso!');
      
      // Criar arquivo de flag apenas se migrations funcionaram
      fs.writeFileSync(installedFlagPath, new Date().toISOString());
      console.log('\n✅ CONFIGURAÇÃO INICIAL CONCLUÍDA!\n');
    } catch (migrationError) {
      console.error('   ⚠️  Erro ao executar migrations:');
      console.error('   ', migrationError.message);
      console.error('\n   ⚠️  O servidor continuará, mas o banco pode não estar configurado.');
      console.error('   Verifique DATABASE_URL e tente reiniciar a aplicação.\n');
      // Não criar .installed se migrations falharam (tentará novamente no próximo restart)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO na configuração inicial:');
    console.error(error.message);
    console.error('\n⚠️  A aplicação continuará, mas pode não funcionar corretamente.');
    console.error('Verifique as variáveis de ambiente e a conexão com o banco de dados.\n');
    // Não fazer exit para tentar continuar mesmo com erro
  }
} else {
  console.log('✓ Aplicação já configurada (arquivo .installed encontrado)\n');
}

console.log('📦 Carregando módulos do servidor...\n');

// Verificar integridade das dependências antes de carregar
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ ERRO: node_modules não encontrado!');
  console.error('Execute npm install primeiro.');
  process.exit(1);
}

// Verificar se express está instalado corretamente
const expressPath = path.join(nodeModulesPath, 'express');
if (!fs.existsSync(expressPath)) {
  console.error('❌ ERRO: Express não encontrado em node_modules!');
  console.error('Reinstalando dependências...');
  try {
    execSync('npm install --prefer-offline', { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.error('❌ Falha ao reinstalar. Verifique package.json e package-lock.json');
    process.exit(1);
  }
}

let express, compression;
try {
  express = require('express');
  compression = require('compression');
} catch (error) {
  console.error('❌ ERRO ao carregar módulos:', error.message);
  console.error('📍 Stack:', error.stack);
  console.error('\n⚠️  Detectado problema de dependências.');
  console.error('🔧 Tentando reinstalar...\n');
  
  try {
    execSync('npm install --prefer-offline --force', { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Reinstalação concluída. Tentando carregar novamente...\n');
    express = require('express');
    compression = require('compression');
  } catch (reinstallError) {
    console.error('❌ FALHA CRÍTICA: Não foi possível resolver dependências.');
    console.error('Por favor, verifique os logs acima e contate o suporte.');
    process.exit(1);
  }
}

// Verificar se os arquivos compilados existem
console.log('🔍 Verificando arquivos necessários...');
console.log('📁 __dirname:', __dirname);

const serverDistPath = path.join(__dirname, 'server', 'dist', 'app.js');
const clientDistPath = path.join(__dirname, 'client', 'dist', 'index.html');

console.log('🔎 Procurando server/dist/app.js em:', serverDistPath);
console.log('🔎 Procurando client/dist/index.html em:', clientDistPath);

// Listar conteúdo do diretório server
const serverDir = path.join(__dirname, 'server');
console.log('\n📂 Conteúdo de server/:');
if (fs.existsSync(serverDir)) {
  const serverContents = fs.readdirSync(serverDir);
  console.log('   ', serverContents.join(', '));
  
  // Se dist existe, listar seu conteúdo
  const distDir = path.join(serverDir, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('\n📂 Conteúdo de server/dist/:');
    const distContents = fs.readdirSync(distDir);
    console.log('   ', distContents.slice(0, 10).join(', '));
  } else {
    console.log('   ⚠️ server/dist/ NÃO EXISTE!');
  }
} else {
  console.log('   ⚠️ server/ NÃO EXISTE!');
}

if (!fs.existsSync(serverDistPath)) {
  console.error('\n❌ ERRO: server/dist/app.js não encontrado!');
  console.error('O build do servidor não foi feito ou o ZIP foi extraído incorretamente.');
  console.error('Caminho esperado:', serverDistPath);
  process.exit(1);
}

if (!fs.existsSync(clientDistPath)) {
  console.error('❌ ERRO: client/dist/index.html não encontrado!');
  console.error('O build do frontend não foi feito ou o ZIP foi extraído incorretamente.');
  console.error('Caminho esperado:', clientDistPath);
  process.exit(1);
}

console.log('✓ server/dist/app.js encontrado');
console.log('✓ client/dist/index.html encontrado\n');

// Importar o servidor Express compilado
console.log('📥 Importando módulo da API...');
let apiApp;
try {
  const appModule = require('./server/dist/app');
  apiApp = appModule.app;
  console.log('✅ API module loaded successfully\n');
} catch (error) {
  console.error('❌ ERRO ao carregar módulo da API:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  console.error('\n🔍 Verifique se:');
  console.error('1. O build foi feito corretamente (build-production.bat)');
  console.error('2. Todas as variáveis de ambiente estão configuradas');
  console.error('3. O DATABASE_URL está correto\n');
  process.exit(1);
}

const app = express();

// Usar compressao para otimizar performance
app.use(compression());

// IMPORTANTE: A porta DEVE vir do process.env.PORT (Hostinger define isso)
const PORT = process.env.PORT || 4000;
const distPath = path.join(__dirname, 'client', 'dist');

// 1. Servir assets com hash e cache longo
app.use(
  '/assets',
  express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    etag: true,
    immutable: true
  })
);

// 2. Servir demais arquivos estaticos sem cache longo (especialmente index.html)
app.use(
  express.static(distPath, {
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  })
);

// 3. Montar as rotas da API (vindas do servidor Express)
app.use(apiApp);

// 4. Fallback SPA - Qualquer rota nao reconhecida volta para o index.html (React Router)
// Isso DEVE vir DEPOIS das rotas da API para nao interferir
app.use((req, res) => {
  // Se parece arquivo estatico e nao foi encontrado, responder 404 em vez de HTML
  if (path.extname(req.path)) {
    res.status(404).end();
    return;
  }

  // Evitar cache no index.html (sempre buscar versao mais recente)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.sendFile(path.join(distPath, 'index.html'));
});

// Iniciar servidor
console.log('🚀 Iniciando servidor HTTP...\n');

app.listen(PORT, () => {
  console.log('========================================');
  console.log('✅ SERVIDOR INICIADO COM SUCESSO!');
  console.log('========================================');
  console.log(`🌐 Porta: ${PORT}`);
  console.log(`📁 Arquivos estáticos: ${distPath}`);
  console.log(`🔌 API: ./server/dist/app.js`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log('========================================\n');
  console.log('✅ Aplicação pronta para receber requisições!');
  console.log(`📍 Teste: http://localhost:${PORT}/api/health\n`);
});

// Tratamento de erros nao capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
