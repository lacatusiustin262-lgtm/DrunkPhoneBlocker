import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { getSession, unlockSessionEarly } from '../lib/db'
import { COLORS } from '../theme'
import { PinInput } from '../components/PinInput'

export default function Unlock() {
  const { sessionId } = useLocalSearchParams()
  const [session, setSession] = useState<{
    id: number
    unlockCode: string | null
    endAt: number
  } | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!sessionId) {
        if (mounted) router.replace('/setup')
        return
      }
      const s = await getSession(Number(sessionId))
      if (mounted) {
        setSession(s)
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [sessionId])

  const handleComplete = async (pin: string) => {
    if (!session) return
    if (!session.unlockCode) {
      Alert.alert(
        'Nu este setat niciun cod',
        'Acest telefon nu are un cod de deblocare configurat. Te rugăm să aștepți expirarea timpului de blocare.'
      )
      return
    }
    try {
      if (pin === session.unlockCode) {
        await unlockSessionEarly(session.id)
        router.replace('/morning')
      } else {
        setCode('')
        Alert.alert('Cod greșit', 'Codul de deblocare nu este corect.')
      }
    } catch (error) {
      console.error(error)
      Alert.alert('Eroare', 'Nu s-a putut debloca. Încearcă din nou.')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    )
  }

  if (!session) {
    return null
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Feather name="lock" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Deblocare anticipată</Text>
          <Text style={styles.subtitle}>
            Introdu codul pe care l-ai dat persoanei de încredere.
          </Text>
        </View>

        <PinInput
          value={code}
          onChange={setCode}
          onComplete={handleComplete}
          label="Cod de deblocare"
        />

        {session.unlockCode ? (
          <View style={styles.hintBox}>
            <Feather name="info" size={18} color={COLORS.warning} />
            <Text style={styles.hintText}>
              Codul este cunoscut doar de tine și de persoana de încredere
              care ține de el. Dacă nu ți-ai amintit codul, așteaptă
              expirarea timpului stabilit.
            </Text>
          </View>
        ) : (
          <View style={styles.hintBoxDanger}>
            <Feather name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.hintTextDanger}>
              Nu este configurat niciun cod de deblocare pentru această
              sesiune. Telefonul se deblochează automat după expirarea timpului.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/lock')}
        >
          <Feather name="arrow-left" size={18} color={COLORS.textMuted} />
          <Text style={styles.backText}>Înapoi la ecranul de blocare</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {session.unlockCode ? (
          <View style={styles.autoUnlockBox}>
            <Feather name="check-circle" size={18} color={COLORS.success} />
            <Text style={styles.autoUnlockText}>
              Dacă nu ai cod, telefonul se deblochează singur la expirarea
              timpului.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    gap: 4,
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 14,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    flex: 1,
  },
  hintBoxDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  hintTextDanger: {
    fontSize: 14,
    color: COLORS.danger,
    lineHeight: 20,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },
  backText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
  },
  autoUnlockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
  },
  autoUnlockText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    flex: 1,
  },
})
