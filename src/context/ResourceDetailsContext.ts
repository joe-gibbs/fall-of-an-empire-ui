import { createContext, useContext } from 'react';

export interface ResourceDetailsActions {
  openResource: (resourceId: string) => void;
  closeResource: () => void;
}

export const ResourceDetailsContext = createContext<ResourceDetailsActions | null>(null);

export function useOptionalResourceDetails(): ResourceDetailsActions | null {
  return useContext(ResourceDetailsContext);
}

export function useResourceDetails(): ResourceDetailsActions {
  const context = useOptionalResourceDetails();
  if (!context) {
    throw new Error('useResourceDetails must be used within ResourceDetailsProvider');
  }
  return context;
}
