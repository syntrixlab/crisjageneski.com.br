import { useEffect, useReducer, useRef } from 'react';
import type { PageLayoutV2 } from '@/types';

const COALESCE_MS = 450;
const MAX_HISTORY = 50;

/**
 * Histórico de undo/redo do layout da página.
 *
 * Observa `layout` (referência imutável criada pelos helpers) e mantém pilhas
 * de passado/futuro. Mudanças rápidas em sequência (ex.: digitação no inspector)
 * são agrupadas numa única entrada (coalescing por tempo).
 *
 * `pageId` é usado para resetar o histórico quando outra página é carregada.
 */
export function usePageHistory(_props: {
  layout: PageLayoutV2;
  pageId: string | undefined;
  applyLayout: (layout: PageLayoutV2) => void;
}) {
  const { layout, pageId, applyLayout } = _props;

  const knownRef = useRef<PageLayoutV2>(layout);
  const pastRef = useRef<PageLayoutV2[]>([]);
  const futureRef = useRef<PageLayoutV2[]>([]);
  const lastChangeRef = useRef<number>(0);
  const travelingRef = useRef<boolean>(false);
  const pageIdRef = useRef<string | undefined>(pageId);

  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    // Nova página carregada → baseline limpo
    if (pageIdRef.current !== pageId) {
      pageIdRef.current = pageId;
      pastRef.current = [];
      futureRef.current = [];
      knownRef.current = layout;
      travelingRef.current = false;
      lastChangeRef.current = 0;
      force();
      return;
    }

    // Mudança causada por undo/redo: apenas sincroniza o conhecido
    if (travelingRef.current) {
      travelingRef.current = false;
      knownRef.current = layout;
      return;
    }

    // Sem mudança real de referência
    if (layout === knownRef.current) return;

    const now = Date.now();
    if (now - lastChangeRef.current > COALESCE_MS) {
      pastRef.current.push(knownRef.current);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
    }
    lastChangeRef.current = now;
    knownRef.current = layout;
    force();
  }, [layout, pageId]);

  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop()!;
    futureRef.current.push(knownRef.current);
    travelingRef.current = true;
    knownRef.current = prev;
    lastChangeRef.current = 0;
    applyLayout(prev);
    force();
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(knownRef.current);
    travelingRef.current = true;
    knownRef.current = next;
    lastChangeRef.current = 0;
    applyLayout(next);
    force();
  };

  return {
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0
  };
}
