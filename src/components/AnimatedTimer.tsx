import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { COLORS } from '../theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle as any)

interface AnimatedTimerProps {
  totalDurationSeconds: number
  secondsLeft: number
  formattedTime: string
  targetTimeLabel?: string
}

export const AnimatedTimer: React.FC<AnimatedTimerProps> = ({
  totalDurationSeconds,
  secondsLeft,
  formattedTime,
  targetTimeLabel = '07:00 Dimineața',
}) => {
  const SIZE = 240
  const STROKE_WIDTH = 8
  const RADIUS = (SIZE - STROKE_WIDTH) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  const progress = useSharedValue(
    totalDurationSeconds > 0 ? secondsLeft / totalDurationSeconds : 1
  )
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.2)

  useEffect(() => {
    const currentProgress =
      totalDurationSeconds > 0
        ? Math.max(0, Math.min(1, secondsLeft / totalDurationSeconds))
        : 0
    progress.value = withTiming(currentProgress, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    })
  }, [secondsLeft, totalDurationSeconds, progress])

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1.0, {
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    )

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2200 }),
        withTiming(0.15, { duration: 2200 })
      ),
      -1,
      true
    )
  }, [pulseScale, pulseOpacity])

  const animatedCircleStyle = useAnimatedStyle(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress.value)
    return {
      strokeDashoffset,
    } as any
  })

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }))

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pulseAura,
          {
            width: SIZE + 20,
            height: SIZE + 20,
            borderRadius: (SIZE + 20) / 2,
          },
          animatedPulseStyle,
        ]}
      />

      <Svg width={SIZE} height={SIZE} style={styles.svgContainer}>
        <Defs>
          <LinearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.primary} />
            <Stop offset="100%" stopColor="#ff8555" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={COLORS.surfaceBright}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />

        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="url(#timerGradient)"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          style={animatedCircleStyle as any}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      <View style={styles.innerContent}>
        <View style={styles.labelRow}>
          <Feather name="lock" size={13} color={COLORS.textMuted} />
          <Text style={styles.headerLabel}>PÂNĂ LA DEBLOCARE</Text>
        </View>

        <Text style={styles.timerText}>{formattedTime}</Text>

        <View style={styles.targetPill}>
          <Feather name="sun" size={12} color={COLORS.emerald} />
          <Text style={styles.targetText}>{targetTimeLabel}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pulseAura: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
  },
  svgContainer: {
    position: 'absolute',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  timerText: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceBright,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  targetText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
})
