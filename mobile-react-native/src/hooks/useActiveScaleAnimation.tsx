import { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';

export const useActiveScaleAnimation = (isActive: boolean) => {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withSpring(isActive ? 1.05 : 1) }],
        };
    }, [isActive]);

    return animatedStyle;
};
