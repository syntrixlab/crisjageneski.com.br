import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminSiteSettings, updateSiteSettings } from '@/api/queries';
import type { SiteSettings } from '@/types';

export function useAdminSiteSettings() {
  return useQuery<SiteSettings>({ queryKey: ['admin', 'site-settings'], queryFn: fetchAdminSiteSettings });
}

export function useUpdateSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SiteSettings) => updateSiteSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    }
  });
}
