import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Project } from '@glaszetter/shared';
import { projectDirectory } from '../api/dashboard';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { loadJobLocation, type MapLocation } from '../utils/googleMaps';

function useLocationData<T>(key: string, load: (() => Promise<T>) | null) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  const [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setState({ key });
      if (!load) return;
      load()
        .then((data) => {
          if (active) setState({ key, data });
        })
        .catch(() => {
          if (active) setState({ key, error: 'Adres laden is mislukt.' });
        });
      return () => {
        active = false;
      };
    }, [key, load, reload])
  );
  const current = state.key === key ? state : undefined;
  return {
    data: current?.data,
    loading: !!load && !current?.data && !current?.error,
    error: current?.error,
    retry: () => setReload((value) => value + 1),
  };
}
export function useProjectLocations(enabled = true) {
  const { token } = useAuth();
  const load = useCallback(() => projectDirectory(token!), [token]);
  const state = useLocationData<Project[]>(token ?? '', token && enabled ? load : null);
  return {
    ...state,
    projects: new Map((state.data ?? []).map((project) => [project.id, project])),
  };
}
export function useJobLocation(jobId: string, enabled = true) {
  const { token } = useAuth();
  const load = useCallback(
    () => loadJobLocation(jobId, <T>(path: string) => apiRequest<T>(path, { token })),
    [jobId, token]
  );
  return useLocationData<MapLocation>(`${token ?? ''}:${jobId}`, token && enabled ? load : null);
}
