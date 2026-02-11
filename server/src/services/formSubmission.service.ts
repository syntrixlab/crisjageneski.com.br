import * as formSubmissionRepo from '../repositories/formSubmission.repository';
import { PageRepository } from '../repositories/page.repository';
import { HttpError } from '../utils/errors';
import { normalizePageLayout, PageLayoutV2, FormField } from '../utils/pageLayout';

const pageRepo = new PageRepository();

export const submitForm = async (data: {
  pageSlug: string;
  formBlockId: string;
  formData: Record<string, any>;
  userAgent?: string;
  ip?: string;
}) => {
  // Find the page by slug
  const page = await pageRepo.findPublishedBySlug(data.pageSlug);
  if (!page) {
    throw new HttpError(404, 'Página não encontrada.');
  }

  // Validate that the form block exists in the page
  const layout = page.layout as any;
  let formBlock: any = null;

  if (layout.version === 2) {
    // V2 layout: search in sections
    for (const section of layout.sections || []) {
      for (const col of section.cols || []) {
        const block = col.blocks?.find((b: any) => b.id === data.formBlockId && b.type === 'form');
        if (block) {
          formBlock = block;
          break;
        }
      }
      if (formBlock) break;
    }
  } else {
    // V1 layout: search in cols
    for (const col of layout.cols || []) {
      const block = col.blocks?.find((b: any) => b.id === data.formBlockId && b.type === 'form');
      if (block) {
        formBlock = block;
        break;
      }
    }
  }

  if (!formBlock) {
    throw new HttpError(404, 'Formulário não encontrado nesta página.');
  }

  // Validate required fields
  const fields = formBlock.data?.fields || [];
  for (const field of fields) {
    if (field.required && !data.formData[field.id]) {
      throw new HttpError(400, `Campo "${field.label}" é obrigatório.`);
    }
  }

  // Build summary from storeSummaryKeys
  const storeSummaryKeys = formBlock.data?.storeSummaryKeys || [];
  const summary: Record<string, any> = {};
  for (const key of storeSummaryKeys) {
    if (data.formData[key]) {
      summary[key] = data.formData[key];
    }
  }

  // Create submission
  const submission = await formSubmissionRepo.createSubmission({
    pageId: page.id,
    formBlockId: data.formBlockId,
    data: data.formData,
    summary: Object.keys(summary).length > 0 ? summary : undefined,
    userAgent: data.userAgent,
    ip: data.ip
  });

  return submission;
};

export const listSubmissions = async (filters?: {
  pageId?: string;
  formBlockId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) => {
  const result = await formSubmissionRepo.findSubmissions(filters);

  // Enriquecer cada submissÃ£o com dados resolvidos (nome, mensagem, telefone)
  const cache: Record<string, { layout: PageLayoutV2; formFieldsByBlock: Record<string, FormField[]> }> = {};

  const normalizeLabel = (value?: string | null) =>
    (value ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();

  const labelMatches = (label: string | undefined | null, terms: string[]) => {
    const norm = normalizeLabel(label);
    return terms.some((t) => norm.includes(t));
  };

  const normalizePhone = (value?: string | null) => {
    const digits = (value ?? '').toString().replace(/\D/g, '');
    if (!digits) return null;
    const withDd = digits.startsWith('55') ? digits : `55${digits}`;
    return withDd.length >= 12 ? withDd : null;
  };

  const findFormFields = (pageId: string, blockId: string, layoutJson: any): FormField[] => {
    if (!pageId || !blockId || !layoutJson) return [];
    if (!cache[pageId]) {
      try {
        const layout = normalizePageLayout(layoutJson);
        const formFieldsByBlock: Record<string, FormField[]> = {};
        layout.sections.forEach((section) => {
          section.cols.forEach((col) => {
            col.blocks.forEach((block) => {
              if (block.type === 'form') {
                const fields = ((block as any).data?.fields ?? []) as FormField[];
                formFieldsByBlock[block.id] = fields;
              }
            });
          });
        });
        cache[pageId] = { layout, formFieldsByBlock };
      } catch (_err) {
        cache[pageId] = { layout: { version: 2, sections: [] }, formFieldsByBlock: {} };
      }
    }
    return cache[pageId].formFieldsByBlock[blockId] ?? [];
  };

  const enriched = result.submissions.map((submission) => {
    const dataObj = (submission as any).data ?? {};
    const formFields = findFormFields(submission.pageId, submission.formBlockId, (submission as any).page?.layout);

    const resolvedFields = Object.entries(dataObj).map(([id, value]) => {
      const meta = formFields.find((f) => f.id === id);
      return {
        id,
        label: meta?.label ?? '',
        type: meta?.type ?? undefined,
        value
      };
    });

    const nameField = resolvedFields.find((f) => labelMatches(f.label, ['nome', 'name']));
    const messageField = resolvedFields.find((f) =>
      labelMatches(f.label, ['mensagem', 'message', 'coment', 'observa', 'descricao', 'descri'])
    );
    const phoneField = resolvedFields.find((f) =>
      labelMatches(f.label, ['telefone', 'whatsapp', 'celular', 'fone', 'phone'])
    );
    const emailField = resolvedFields.find((f) => labelMatches(f.label, ['email']));

    const leadName = (() => {
      if (nameField?.value) return nameField.value.toString().trim();
      if (emailField?.value) return emailField.value.toString().trim();
      return null;
    })();

    const leadMessage = (() => {
      if (typeof messageField?.value === 'string' && messageField.value.trim()) return messageField.value.trim();
      const longestText = resolvedFields
        .map((f) => (typeof f.value === 'string' ? f.value.trim() : ''))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0];
      return longestText || null;
    })();

    const leadPhone = phoneField?.value ? phoneField.value.toString() : null;
    const leadPhoneNormalized = normalizePhone(leadPhone);

    return {
      ...submission,
      leadName,
      leadMessage,
      leadPhone,
      leadPhoneNormalized,
      resolvedFields
    };
  });

  return { ...result, submissions: enriched };
};

export const getSubmission = async (id: string) => {
  const submission = await formSubmissionRepo.findSubmissionById(id);
  if (!submission) {
    throw new HttpError(404, 'Resposta não encontrada.');
  }
  return submission;
};

export const removeSubmission = async (id: string) => {
  const submission = await formSubmissionRepo.findSubmissionById(id);
  if (!submission) {
    throw new HttpError(404, 'Resposta não encontrada.');
  }
  return formSubmissionRepo.deleteSubmission(id);
};
