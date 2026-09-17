import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import useAppLanguage from 'hooks/common/useAppLanguage';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { AppLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from 'types/i18n';

const LanguageOption = memo(
  ({
    language,
    isSelected,
    onSelect,
  }: {
    language: AppLanguage;
    isSelected: boolean;
    onSelect: (language: AppLanguage) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handlePress = useCallback(
      () => onSelect(language),
      [language, onSelect],
    );

    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole='radio'
        accessibilityState={{ selected: isSelected }}
        // Named in its own language, so this row is readable to the person
        // looking for it even from a language they cannot read.
        accessibilityLabel={LANGUAGE_NAMES[language]}
        style={({ pressed }) => [
          styles.option,
          isSelected && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}
      >
        <Text
          style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
        >
          {LANGUAGE_NAMES[language]}
        </Text>

        {isSelected ? (
          <Ionicons name='checkmark' size={16} color={colors.primary} />
        ) : null}
      </Pressable>
    );
  },
);

LanguageOption.displayName = 'LanguageOption';

/** The language list, named in each language rather than in the current one. */
const LanguageSelector = () => {
  const styles = useThemedStyles(createStyles);
  const { language, setLanguage } = useAppLanguage();

  return (
    <View style={styles.row} accessibilityRole='radiogroup'>
      {SUPPORTED_LANGUAGES.map((option) => (
        <LanguageOption
          key={option}
          language={option}
          isSelected={language === option}
          onSelect={setLanguage}
        />
      ))}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    option: {
      flexGrow: 1,
      flexBasis: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 44,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionPressed: { opacity: 0.85 },
    optionLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    optionLabelSelected: { color: colors.primary },
  });

export default memo(LanguageSelector);
