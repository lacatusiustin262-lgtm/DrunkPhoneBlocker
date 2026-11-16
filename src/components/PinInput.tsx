import { useState, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { COLORS } from '../theme'

const CODE_LENGTH = 4

interface Props {
  value: string
  onChange: (value: string) => void
  onComplete?: (code: string) => void
  label?: string
  secure?: boolean
}

export function PinInput({ value, onChange, onComplete, label, secure = true }: Props) {
  const [focusIndex, setFocusIndex] = useState(0)

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      const key = e.nativeEvent.key
      if (key === 'Backspace') {
        if (value.length > 0) {
          onChange(value.slice(0, -1))
          setFocusIndex(Math.max(0, value.length - 2))
        }
      }
    },
    [value, onChange]
  )

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH)
      onChange(digits)
      setFocusIndex(digits.length)
      if (digits.length === CODE_LENGTH && onComplete) {
        onComplete(digits)
      }
    },
    [onChange, onComplete]
  )

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
          const filled = i < value.length
          return (
            <Pressable
              key={i}
              style={[
                styles.box,
                filled ? styles.boxFilled : styles.boxEmpty,
                focusIndex === i && styles.boxFocused,
              ]}
            >
              <Text style={[styles.digit, filled && styles.digitFilled]}>
                {secure && filled ? '•' : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        keyboardType="numeric"
        maxLength={CODE_LENGTH}
        autoFocus
        secureTextEntry={secure}
        selectionColor="transparent"
        caretHidden
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginHorizontal: 4,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  box: {
    width: 56,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  boxEmpty: {
    borderColor: COLORS.textMuted,
    backgroundColor: COLORS.surface,
  },
  boxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  boxFocused: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  digit: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
  },
  digitFilled: {
    color: COLORS.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
})
