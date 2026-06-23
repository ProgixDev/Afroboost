import React, { useState, useRef } from 'react';
import { View, Dimensions, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
  type SharedValue,
} from 'react-native-reanimated';
import { Text, Button } from '@/components/ui';
import { KenteTexture } from '@/components/brand/KenteTexture';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/lib/theme';

const { width } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

type SlideTone = 'emerald' | 'gold' | 'mixed';
type SlideData = {
  title: string;
  sub: string;
  gradient: [string, string];
  tone: SlideTone;
  media: { kind: 'gif'; source: any };
};

function SlideItem({
  item,
  index,
  scrollX,
}: {
  item: SlideData;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const imageStyle = useAnimatedStyle(() => {
    const translateX = interpolate(scrollX.value, inputRange, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.75, 1, 0.75], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.2, 1, 0.2], Extrapolation.CLAMP);
    return { transform: [{ translateX }, { scale }], opacity };
  });

  const overlineStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const titleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  const subStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollX.value, inputRange, [60, 0, 60], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  return (
    <View style={{ width, flex: 1, paddingHorizontal: 32, paddingBottom: 40 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AnimatedImage
          source={item.media.source}
          style={[{ width: width * 0.6, height: width * 0.6 }, imageStyle]}
          contentFit="contain"
        />
      </View>
      <Animated.View style={overlineStyle}>
        <Text variant="overline" color="mutedFg" style={{ marginBottom: 12 }}>
          AfroBoost — pour les entrepreneurs.es
        </Text>
      </Animated.View>
      <Animated.View style={titleStyle}>
        <Text variant="displayLg" style={{ fontSize: 52, lineHeight: 56 }}>{item.title}</Text>
      </Animated.View>
      <Animated.View style={subStyle}>
        <Text variant="serifItalic" color="muted" style={{ marginTop: 16, fontSize: 18, lineHeight: 26 }}>
          {item.sub}
        </Text>
      </Animated.View>
    </View>
  );
}

function ProgressDot({
  index,
  scrollX,
  activeColor,
  inactiveColor,
}: {
  index: number;
  scrollX: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const style = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(scrollX.value, inputRange, [inactiveColor, activeColor, inactiveColor]);
    const height = interpolate(scrollX.value, inputRange, [2, 4, 2], Extrapolation.CLAMP);
    return { backgroundColor, height };
  });

  return <Animated.View style={[{ flex: 1, borderRadius: 2 }, style]} />;
}

function GradientLayer({
  index,
  scrollX,
  colors,
  tone,
}: {
  index: number;
  scrollX: SharedValue<number>;
  colors: [string, string];
  tone: SlideTone;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const style = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <KenteTexture tone={tone} opacity={0.08} />
    </Animated.View>
  );
}

export default function Welcome() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const ref = useRef<Animated.FlatList<SlideData>>(null);
  const scrollX = useSharedValue(0);

  const slides: SlideData[] = [
    {
      title: t('auth.welcome.slide1Title'),
      sub: t('auth.welcome.slide1Sub'),
      gradient: [c.primary + 'DD', c.background],
      tone: 'emerald',
      media: { kind: 'gif', source: require('../../assets/1.gif') },
    },
    {
      title: t('auth.welcome.slide2Title'),
      sub: t('auth.welcome.slide2Sub'),
      gradient: [c.accent + 'BB', c.background],
      tone: 'gold',
      media: { kind: 'gif', source: require('../../assets/2.gif') },
    },
    {
      title: t('auth.welcome.slide3Title'),
      sub: t('auth.welcome.slide3Sub'),
      gradient: [c.deep + 'DD', c.background],
      tone: 'mixed',
      media: { kind: 'gif', source: require('../../assets/3.gif') },
    },
  ];

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const p = Math.round(e.contentOffset.x / width);
      runOnJS(setPage)(p);
    },
  });

  const next = () => {
    if (page < slides.length - 1) {
      ref.current?.scrollToOffset({ offset: (page + 1) * width, animated: true });
    } else {
      router.push('/(auth)/auth-choice');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {slides.map((s, i) => (
          <GradientLayer key={`bg-${i}`} index={i} scrollX={scrollX} colors={s.gradient} tone={s.tone} />
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(auth)/auth-choice')}
        hitSlop={10}
        style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10, padding: 6 }}
      >
        <Text variant="caption" style={{ color: c.muted, fontFamily: 'Inter_600SemiBold' }}>
          {t('common.skip')}
        </Text>
      </Pressable>

      <Animated.View
        entering={FadeInDown.duration(500)}
        style={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          paddingTop: insets.top + 8,
        }}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient
            colors={[c.accent + '33', 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: 320,
              height: 140,
              borderRadius: 999,
              opacity: 0.9,
            }}
          />
          <Logo width={300} />
        </View>
      </Animated.View>

      <Animated.FlatList
        ref={ref}
        data={slides}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        renderItem={({ item, index }) => <SlideItem item={item} index={index} scrollX={scrollX} />}
      />

      <Animated.View
        entering={FadeInUp.duration(500).delay(150)}
        style={{ paddingHorizontal: 32, paddingBottom: insets.bottom + 24, gap: 14 }}
      >
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
          {slides.map((_, i) => (
            <ProgressDot
              key={i}
              index={i}
              scrollX={scrollX}
              activeColor={c.accent}
              inactiveColor={c.borderStrong}
            />
          ))}
        </View>
        <Animated.View entering={FadeIn.duration(400).delay(300)}>
          <Button
            title={page === slides.length - 1 ? t('auth.welcome.start') : t('common.next')}
            onPress={next}
            fullWidth
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
