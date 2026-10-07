import { createContext } from 'react';

// Screens keep their previous content until their portrait assets can paint together.
export const PortraitReadinessContext = createContext(false);
