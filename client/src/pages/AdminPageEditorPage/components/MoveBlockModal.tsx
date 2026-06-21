import { useEffect, useState } from 'react';
import { Modal } from '@/components/AdminUI';
import type { PageSection } from '@/types';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import type { MoveModalState } from '../hooks/useBlockManager';

export function MoveBlockModal(_props: {
  state: MoveModalState | null;
  section?: PageSection;
  onClose: () => void;
  onConfirm: (targetColumn: number) => void;
}) {
  const { state, section, onClose, onConfirm } = _props;
  const [target, setTarget] = useState(0);

  useEffect(() => {
    if (state) setTarget(state.columnIndex);
  }, [state?.columnIndex]);

  const colCount = section ? getSectionColumnCount(section) : 1;

  return (
    <Modal isOpen={!!state?.open} onClose={onClose} title="Mover bloco para coluna" description="Selecione a coluna de destino.">
      <div className="page-columns-toggle">
        {Array.from({ length: colCount }).map((_, idx) => (
          <button key={idx} type="button" className={target === idx ? 'active' : ''} onClick={() => setTarget(idx)}>
            Coluna {idx + 1}
          </button>
        ))}
      </div>
      <div className="admin-modal-footer">
        <button className="btn btn-outline" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" type="button" onClick={() => onConfirm(target)}>
          Mover
        </button>
      </div>
    </Modal>
  );
}
