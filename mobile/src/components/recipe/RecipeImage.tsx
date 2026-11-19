import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { API_URL, authHeaders } from '@/api/client';
import type { Recipe } from '@/api/types';
import { CookingPot } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Foto da receita (servida por rota autenticada) ou um marcador neutro quando não há foto. */
export function RecipeImage({ recipe, style, iconSize = 28 }: { recipe: Pick<Recipe, 'id' | 'has_photo' | 'photo_version'>; style?: StyleProp<ViewStyle>; iconSize?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      {recipe.has_photo ? (
        <Image
          source={{ uri: `${API_URL}/recipes/${recipe.id}/photo?v=${recipe.photo_version}`, headers: authHeaders() }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <CookingPot size={iconSize} color={colors.textSubtle} strokeWidth={1.5} />
      )}
    </View>
  );
}
