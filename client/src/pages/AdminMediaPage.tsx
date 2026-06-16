import { useState } from 'react';
import { ConfirmModal, MediaGallery, Modal } from '../components/AdminUI';
import { useDeleteMedia, useMedia, useUpdateMedia, useUploadMedia } from '../hooks/queries/useMedia';
import { SeoHead } from '../components/SeoHead';
import type { Media } from '../types';

export function AdminMediaPage() {
  const { data: media } = useMedia();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);

  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();

  return (
    <div className="admin-page">
      <SeoHead title="Imagens" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Biblioteca de imagens</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Envie capas e imagens inline.</p>
      </div>
      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={() => setShowUpload(true)}>
          Enviar imagem
        </button>
      </div>

      <MediaGallery
        items={media ?? []}
        onEdit={(item) => setEditing(item)}
        onDelete={(item) => setDeleteTarget(item)}
      />

      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Adicionar imagem"
        description="Envie uma nova midia e defina o texto alternativo."
      >
        <div className="admin-grid">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input placeholder="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div className="admin-modal-footer">
          <button className="btn btn-outline" type="button" onClick={() => setShowUpload(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!file || uploadMutation.isPending}
            onClick={() =>
              file &&
              uploadMutation.mutate(
                { file, alt },
                {
                  onSuccess: () => {
                    setFile(null);
                    setAlt('');
                    setShowUpload(false);
                  }
                }
              )
            }
          >
            {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => {
          setEditing(null);
          setEditFile(null);
        }}
        title="Editar imagem"
        description="Atualize o alt text ou substitua o arquivo."
      >
        {editing && (
          <>
            <div className="admin-grid">
              <img src={editing.url} alt={editing.alt ?? ''} style={{ width: '100%', borderRadius: '12px' }} />
              <input
                placeholder="Alt text"
                value={editing.alt ?? ''}
                onChange={(e) => setEditing({ ...editing, alt: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  updateMutation.mutate(
                    {
                      id: editing.id,
                      payload: { alt: editing.alt ?? '', file: editFile }
                    },
                    {
                      onSuccess: () => {
                        setEditing(null);
                        setEditFile(null);
                      }
                    }
                  )
                }
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover imagem"
        description={`Deseja remover "${deleteTarget?.alt ?? "sem nome"}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
