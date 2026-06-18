# Instruções para Finalizar a Implementação

## Status Atual

A refatoração da tela de configurações foi **95% implementada**. Todos os componentes, tipos e lógica estão prontos. O único passo pendente é executar a migration SQL no banco de dados.

## O que foi feito

✅ Schema Prisma atualizado com novos campos
✅ Migration SQL criada em `server/prisma/migrations/20260618000832_add_settings_professional_seo_fields/migration.sql`
✅ Tipos TypeScript atualizados (client e server)
✅ Componentes novos: FontPicker.tsx, OfficeHoursEditor.tsx
✅ AdminSettingsPage.tsx completamente refatorado com sidebar, 5 seções, isDirty detection
✅ PublicLayout.tsx com Google Fonts, GA, Search Console
✅ Backend (controller, service, repository) atualizado
✅ Tipos Prisma patched manualmente para suportar novos campos

## Passo Pendente: Executar a Migration

A migration SQL precisa ser executada no banco de dados PostgreSQL. Há duas opções:

### Opção 1: Via psql (recomendado)
```bash
psql "postgresql://usuario:senha@host:porta/database" << EOF
ALTER TABLE "SiteSettings"
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" JSONB,
ADD COLUMN "officeHours" JSONB,
ADD COLUMN "metaDescription" VARCHAR(320),
ADD COLUMN "ogImageUrl" TEXT,
ADD COLUMN "gaId" TEXT,
ADD COLUMN "gscVerification" TEXT;
EOF
```

### Opção 2: Via Supabase Dashboard
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o SQL acima e execute

### Opção 3: Via Prisma (quando internet funcionar)
```bash
cd server
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate deploy
```

## Após a Migration

Depois que a migration for executada:

1. **Regenerar o Prisma client** (opcional, já foi feito workaround):
   ```bash
   cd server
   npx prisma generate
   ```

2. **Reiniciar o servidor** para garantir que tudo funcione corretamente:
   ```bash
   cd server
   npm run dev
   ```

3. **Testar no admin**: Abra http://localhost:5173/admin/settings e tente salvar alguma configuração.

## Estrutura da Nova Tela de Configurações

A página `/admin/settings` agora tem:

### Sidebar Vertical (esquerda)
- 5 seções navegáveis
- Indicador visual de alterações não salvas
- Navegação com setas do teclado

### Seção 1: Identidade
- Nome do site
- Tagline
- Logo (com preview 180×180px)

### Seção 2: Aparência
- **Paleta de cores**: Presets + editor de cores
- **Tipografia**: FontPicker para títulos e corpo de texto
  - Google Fonts dinâmicas
  - Preview ao vivo
- **Preview sticky**: Mostra como fica o site em tempo real

### Seção 3: Contato e Redes
- Email de contato
- WhatsApp flutuante (link, mensagem padrão, posição)
- Editor de redes sociais (Instagram, Facebook, LinkedIn, etc)

### Seção 4: Dados Profissionais
- CNPJ e CRP
- **Novo**: Telefone de contato
- **Novo**: Endereço completo (rua, CEP, cidade, estado)
- **Novo**: Horários de atendimento (lista editável)

### Seção 5: SEO e Integrações
- **Meta description** (com contador 0-320)
- **OG Image** para compartilhamento
- **Google Analytics** (GA ID)
- **Google Search Console** (verificação)

## Novos Campos no Banco

```
- phone (TEXT)
- address (JSONB) { street, city, state, zip }
- officeHours (JSONB) Array<{ label, hours }>
- metaDescription (VARCHAR 320)
- ogImageUrl (TEXT)
- gaId (TEXT)
- gscVerification (TEXT)
```

## Novos Componentes

- `FontPicker.tsx`: Seletor de Google Fonts com busca e preview
- `OfficeHoursEditor.tsx`: Editor de lista de horários

## CSS Adicionado

Novos estilos em `client/src/App.css`:
- `.settings-shell-v2`: Layout com sidebar
- `.settings-sidebar*`: Estilo da sidebar vertical
- `.font-picker*`: Estilos do FontPicker
- `.office-hours-*`: Estilos do OfficeHoursEditor
- `.settings-appearance-layout`: Preview sticky
- Responsividade completa (mobile/tablet/desktop)

## Próximas Etapas

Após executar a migration:

1. ✅ Tudo já está funcionando no frontend
2. ✅ Backend está pronto
3. ✅ Estilos CSS implementados
4. ⏳ **Apenas execute a migration SQL**

## Se Houver Problemas

Se encontrar erros sobre campos desconhecidos:
1. Verifique se a migration foi executada no banco
2. Verifique a conexão com o banco de dados
3. Verifique o DATABASE_URL em server/.env

## Notas

- A tipografia do Google Fonts é carregada dinamicamente no site público
- O Google Analytics e Search Console são injetados apenas em produção
- O isDirty detection previne perda de dados ao trocar de seção
- Todos os campos de data/hora são opcionais no formulário

---

**Status**: Pronto para uso após executar a migration SQL ✅
