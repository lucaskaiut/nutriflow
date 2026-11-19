import {
  Apple, Bean, Candy, Carrot, CookingPot, CupSoda, Droplet, Drumstick, Egg, Fish, Milk, Nut, Package, Soup, Utensils, Wheat, type LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Ícone de linha por categoria da TACO (apenas apoio visual à leitura da lista). */
const ICONS: Record<string, LucideIcon> = {
  cereais: Wheat, verduras: Carrot, frutas: Apple, gorduras: Droplet, pescados: Fish, carnes: Drumstick, leite: Milk, bebidas: CupSoda,
  ovos: Egg, acucarados: Candy, miscelaneas: Utensils, industrializados: Package, preparados: Soup, leguminosas: Bean, nozes: Nut, outros: Utensils,
};

export function CategoryIcon({ slug, recipe, size = 18, color }: { slug?: string | null; recipe?: boolean; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Icon = recipe ? CookingPot : (slug && ICONS[slug]) || Utensils;
  return <Icon size={size} color={color ?? colors.textMuted} strokeWidth={1.75} />;
}
