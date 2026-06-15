import { createContext, useContext } from 'react';

interface NavigationContextValue {
  navigateToHome: () => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  navigateToHome: () => {},
});

export const useNavigation = () => useContext(NavigationContext);
export default NavigationContext;
