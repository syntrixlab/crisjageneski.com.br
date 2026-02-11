import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sanitizeContent } from '../utils/sanitize';
import { normalizePageLayout } from '../utils/pageLayout';

async function main() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: { password: passwordHash, name: 'Admin', role: 'admin' },
    create: { email: env.ADMIN_EMAIL, password: passwordHash, name: 'Admin', role: 'admin' }
  });

  await prisma.navItem.deleteMany();
  const navSeed = [
    {
      label: 'Home',
      type: 'INTERNAL_PAGE',
      pageKey: 'home',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 0,
      orderFooter: 0,
      isVisible: true
    },
    {
      label: 'Sobre',
      type: 'INTERNAL_PAGE',
      pageKey: 'sobre',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 1,
      orderFooter: 1,
      isVisible: true
    },
    {
      label: 'Blog',
      type: 'INTERNAL_PAGE',
      pageKey: 'blog',
      isParent: true,
      showInNavbar: true,
      showInFooter: false,
      orderNavbar: 2,
      orderFooter: null,
      isVisible: true
    },
    {
      label: 'Contato',
      type: 'INTERNAL_PAGE',
      pageKey: 'contato',
      isParent: true,
      showInNavbar: true,
      showInFooter: true,
      orderNavbar: 3,
      orderFooter: 3,
      isVisible: true
    }
  ];

  // Casting to any ensures compatibility if the generated Prisma client is outdated.
  await prisma.navItem.createMany({
    data: navSeed as any
  });

  await prisma.homeSection.deleteMany();
  await prisma.homeSection.createMany({
    data: [
      {
        type: 'hero',
        title: 'Bem-vinda',
        order: 0,
        data: {
          eyebrow: 'Psicologia clínica',
          heading: 'Cuidado emocional que respeita a sua história',
          subheading:
            'Cristiane Jageneski ajuda você a construir equilíbrio, autoconfiança e relações saudáveis.',
          ctaLabel: 'Agendar sessão',
          ctaHref: '/contato'
        }
      },
      {
        type: 'services',
        title: 'Como posso ajudar',
        order: 1,
        data: {
          items: [
            {
              title: 'Terapia individual',
              description: 'Apoio para ansiedade, autoestima, luto e transições de vida.'
            },
            {
              title: 'Terapia de casal',
              description: 'Comunicação saudável, reconstrução de confiança e limites claros.'
            },
            {
              title: 'Atendimento online',
              description: 'Sessões seguras e confortáveis, no seu ritmo e em qualquer lugar.'
            }
          ]
        }
      },
      {
        type: 'cta',
        title: 'Pronta para dar o próximo passo?',
        order: 2,
        data: {
          text: 'Agende uma conversa inicial e entenda como a terapia pode apoiar você agora.',
          ctaLabel: 'Falar com a Cris',
          ctaHref: '/contato'
        }
      }
    ]
  });

  await prisma.page.deleteMany();
  const aboutLayout = normalizePageLayout({
    version: 1,
    columns: 2,
    cols: [
      {
        blocks: [
          {
            type: 'text',
            data: {
              contentHtml: sanitizeContent(
                '<h2>Psicóloga clínica especializada em cuidado integral</h2><p>Atuo há mais de 10 anos apoiando mulheres a navegarem ansiedade, relações e carreira com mais clareza e acolhimento.</p>'
              ),
              width: 'wide'
            }
          },
          {
            type: 'button',
            data: {
              label: 'Agendar uma conversa',
              href: 'https://wa.me/5500000000000',
              newTab: true,
              variant: 'primary'
            }
          }
        ]
      },
      {
        blocks: [
          {
            type: 'image',
            data: {
              mediaId: null,
              src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
              alt: 'Retrato profissional da Cris',
              size: 100,
              align: 'center',
              caption: 'Foto institucional'
            }
          }
        ]
      }
    ]
  });

  const contactLayout = normalizePageLayout({
    version: 1,
    columns: 1,
    cols: [
      {
        blocks: [
          {
            type: 'text',
            data: {
              contentHtml: sanitizeContent(
                '<h2>Vamos conversar?</h2><p>Envie sua mensagem e retornarei em até 1 dia útil. Atendimento online para todo o Brasil.</p>'
              ),
              background: 'soft'
            }
          },
          {
            type: 'button',
            data: {
              label: 'Falar pelo WhatsApp',
              href: 'https://wa.me/5500000000000',
              newTab: true,
              variant: 'secondary'
            }
          }
        ]
      }
    ]
  });

  await prisma.page.createMany({
    data: [
      {
        slug: 'sobre',
        title: 'Sobre a Cris',
        description: 'Conheça a formação e a abordagem de cuidado',
        layout: aboutLayout as any,
        status: 'published',
        publishedAt: new Date()
      },
      {
        slug: 'contato',
        title: 'Contato',
        description: 'Canais para agendar uma sessão ou tirar dúvidas',
        layout: contactLayout as any,
        status: 'published',
        publishedAt: new Date()
      }
    ]
  });

  await prisma.post.deleteMany();
  await prisma.post.createMany({
    data: [
      {
        title: 'Como a terapia pode ajudar em momentos de mudança',
        slug: 'terapia-em-momentos-de-mudanca',
        excerpt:
          'Transições exigem energia emocional. Veja passos práticos para atravessar essas fases com apoio.',
        content: sanitizeContent(
          '<p>Mudanças trazem incertezas. A terapia oferece um espaço seguro para compreender emoções, reorganizar prioridades e fortalecer seus recursos internos.</p>'
        ),
        status: 'published',
        isFeatured: true,
        views: 124,
        tags: ['transicoes', 'terapia'],
        publishedAt: new Date()
      },
      {
        title: 'Ansiedade: sinais e como buscar apoio',
        slug: 'ansiedade-sinais-e-apoio',
        excerpt: 'Reconheça os sinais de ansiedade e caminhos possíveis para recuperar equilíbrio.',
        content: sanitizeContent(
          '<p>Ansiedade não precisa dominar sua rotina. Pequenos ajustes diários aliados ao suporte profissional podem transformar sua relação com o medo.</p>'
        ),
        status: 'published',
        isFeatured: true,
        views: 98,
        tags: ['ansiedade', 'bem-estar'],
        publishedAt: new Date()
      }
    ]
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
