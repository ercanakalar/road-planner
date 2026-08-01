import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  PlacePrediction,
  createSessionToken,
  fetchPlaceDetails,
  fetchPlacePredictions,
} from 'services/googleMapsService';
import useDebouncedValue from 'hooks/useDebouncedValue';
import { colors, radius, shadows, spacing, typography } from 'theme';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;
const MAX_VISIBLE_RESULTS = 5;
const ROW_HEIGHT = 48;

type Props = {
  onPlaceSelected: (
    location: { lat: number; lng: number },
    address: string,
  ) => void;
};

const PredictionRow = memo(
  ({
    prediction,
    onSelect,
  }: {
    prediction: PlacePrediction;
    onSelect: (prediction: PlacePrediction) => void;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
      onPress={() => onSelect(prediction)}
      accessibilityRole='button'
    >
      <Ionicons name='location-outline' size={16} color={colors.textMuted} />
      <Text style={styles.resultText} numberOfLines={1}>
        {prediction.description}
      </Text>
    </Pressable>
  ),
);

PredictionRow.displayName = 'PredictionRow';

const PlacesSearchBar = ({ onPlaceSelected }: Props) => {
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  /*
   * Google bills autocomplete keystrokes and the follow-up details lookup as a
   * single session when they share a token, so the token is minted per search
   * and rotated once a place has been picked.
   */
  const sessionTokenRef = useRef(createSessionToken());

  const query = useDebouncedValue(input.trim(), DEBOUNCE_MS);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsSearching(true);
    fetchPlacePredictions(query, sessionTokenRef.current, controller.signal)
      .then((results) => {
        if (!cancelled) setPredictions(results);
      })
      .catch(() => {
        if (!cancelled) setPredictions([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query]);

  const handleSelect = useCallback(
    async (prediction: PlacePrediction) => {
      setPredictions([]);
      setInput(prediction.description);
      inputRef.current?.blur();

      const details = await fetchPlaceDetails(
        prediction.placeId,
        sessionTokenRef.current,
      ).catch(() => null);

      sessionTokenRef.current = createSessionToken();
      if (!details) return;

      onPlaceSelected(
        { lat: details.latitude, lng: details.longitude },
        details.address,
      );
    },
    [onPlaceSelected],
  );

  const clearInput = useCallback(() => {
    setInput('');
    setPredictions([]);
    inputRef.current?.focus();
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PlacePrediction>) => (
      <PredictionRow prediction={item} onSelect={handleSelect} />
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback(
    (item: PlacePrediction) => item.placeId,
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name='search' size={18} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          placeholder='Search for a place'
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholderTextColor={colors.textSubtle}
          returnKeyType='search'
          autoCorrect={false}
        />
        {isSearching ? (
          <ActivityIndicator size='small' color={colors.textMuted} />
        ) : null}
        {input.length > 0 && !isSearching ? (
          <Pressable
            onPress={clearInput}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel='Clear search'
          >
            <Ionicons
              name='close-circle'
              size={18}
              color={colors.textSubtle}
            />
          </Pressable>
        ) : null}
      </View>

      {predictions.length > 0 ? (
        <FlatList
          data={predictions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.results}
          keyboardShouldPersistTaps='handled'
          getItemLayout={(_data, index) => ({
            length: ROW_HEIGHT,
            offset: ROW_HEIGHT * index,
            index,
          })}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
    ...shadows.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  results: {
    maxHeight: ROW_HEIGHT * MAX_VISIBLE_RESULTS,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  resultPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  resultText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    fontSize: 14,
  },
});

export default memo(PlacesSearchBar);
