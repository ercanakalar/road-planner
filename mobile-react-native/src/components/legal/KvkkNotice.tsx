import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  KVKK_CONSENT_VERSION,
  KVKK_COPY,
  KVKK_LANGUAGES,
} from 'constants/kvkk';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { KvkkCopy, KvkkLanguage, KvkkSectionId } from 'types/kvkk';

const SECTION_ICONS: Record<KvkkSectionId, keyof typeof Ionicons.glyphMap> = {
  controller: 'business-outline',
  data: 'document-text-outline',
  purpose: 'compass-outline',
  legalBasis: 'library-outline',
  sharing: 'share-social-outline',
  retention: 'time-outline',
  rights: 'hand-left-outline',
  withdrawal: 'arrow-undo-outline',
};

interface Props {
  copy: KvkkCopy;
  language: KvkkLanguage;
  onLanguageChange: (language: KvkkLanguage) => void;
}

const LanguageOption = memo(
  ({
    language,
    isSelected,
    onSelect,
  }: {
    language: KvkkLanguage;
    isSelected: boolean;
    onSelect: (language: KvkkLanguage) => void;
  }) => {
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
        accessibilityLabel={KVKK_COPY[language].languageLabel}
        style={({ pressed }) => [
          styles.languageOption,
          isSelected && styles.languageOptionSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.languageLabel,
            isSelected && styles.languageLabelSelected,
          ]}
        >
          {KVKK_COPY[language].languageLabel}
        </Text>
      </Pressable>
    );
  },
);

LanguageOption.displayName = 'LanguageOption';

const KvkkNotice = ({ copy, language, onLanguageChange }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.languageRow} accessibilityRole='radiogroup'>
        {KVKK_LANGUAGES.map((option) => (
          <LanguageOption
            key={option}
            language={option}
            isSelected={option === language}
            onSelect={onLanguageChange}
          />
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Text style={styles.updated}>
          {copy.updatedLabel}: {KVKK_CONSENT_VERSION}
        </Text>
      </View>

      {copy.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={SECTION_ICONS[section.id]}
                size={16}
                color={colors.primary}
              />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}

      <Text style={styles.bindingNote}>{copy.bindingNote}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { gap: spacing.lg },
    languageRow: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      padding: spacing.xxs,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    languageOption: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
    },
    languageOptionSelected: { backgroundColor: colors.surface },
    pressed: { opacity: 0.7 },
    languageLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    languageLabelSelected: { color: colors.primary },
    header: { gap: spacing.xs },
    title: {
      ...typography.title,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
    updated: {
      ...typography.caption,
      color: colors.textSubtle,
    },
    section: { gap: spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconCircle: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      ...typography.heading,
      flex: 1,
      color: colors.text,
    },
    sectionBody: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
    },
    bindingNote: {
      ...typography.caption,
      color: colors.textSubtle,
      fontStyle: 'italic',
    },
  });

export default memo(KvkkNotice);
