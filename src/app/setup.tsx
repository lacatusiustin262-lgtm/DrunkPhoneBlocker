import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  initDb,
  createSession,
  addContact as addDbContact,
  getContacts,
  clearContacts,
} from '../lib/db'
import { requestNotificationPermissions, scheduleUnlockNotification } from '../lib/notifications'
import { COLORS, DURATIONS } from '../theme'

export default function Setup() {
  const [duration, setDuration] = useState(6)
  const [customHours, setCustomHours] = useState('')
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([])
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [unlockCode, setUnlockCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      await initDb()
      const saved = await getContacts()
      setContacts(saved.map((c) => ({ name: c.name, phone: c.phone })))
      setLoading(false)
    })()
  }, [])

  const effectiveDuration = customHours ? parseFloat(customHours) : duration

  const selectDuration = (hours: number) => {
    setDuration(hours)
    setCustomHours('')
  }

  const addContact = () => {
    const name = newContactName.trim()
    const phone = newContactPhone.trim()
    if (!name || !phone) {
      Alert.alert('Completează ambele câmpuri', 'Introdu numele și numărul de telefon.')
      return
    }
    setContacts([...contacts, { name, phone }])
    setNewContactName('')
    setNewContactPhone('')
  }

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const startLock = async () => {
    const hours = effectiveDuration
    if (!hours || hours <= 0 || hours > 48) {
      Alert.alert('Durata invalidă', 'Alege o durată între 1 și 48 de ore.')
      return
    }

    setLoading(true)
    try {
      const code = unlockCode.replace(/\D/g, '') || null
      const sessionId = await createSession(hours, code)

      // Resetează contactele de urgență pentru sesiunea curentă (fără dubluri)
      await clearContacts()
      for (const c of contacts) {
        await addDbContact(c.name, c.phone)
      }

      await requestNotificationPermissions()
      const endAt = Date.now() + hours * 3600 * 1000
      await scheduleUnlockNotification(endAt, sessionId)

      router.replace('/lock')
    } catch (error) {
      console.error(error)
      Alert.alert('Eroare', 'Nu s-a putut porni blocarea. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Pregătesc blocarea...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Feather name="clock" size={34} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>DrunkPhone Blocker</Text>
        <Text style={styles.subtitle}>
          Pune telefonul în blocă înainte să ești prea batterit. Accesează doar
          apelurile de urgență, notele, vocea și fotoaparatul.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>1. Câte ore să rămâi blocat?</Text>
        <View style={styles.chips}>
          {DURATIONS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, duration === h && styles.chipActive]}
              onPress={() => selectDuration(h)}
            >
              <Text style={[styles.chipText, duration === h && styles.chipTextActive]}>
                {h} ore
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, customHours ? styles.chipActive : styles.chipCustom]}
            onPress={() => {
              setCustomHours('')
              setDuration(0)
            }}
          >
            <TextInput
              style={styles.customInput}
              value={customHours}
              onChangeText={setCustomHours}
              placeholder="ore"
              keyboardType="numeric"
              maxLength={3}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Telefonul se va debloca automat după expirarea timpului.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <View style={styles.iconBox}>
            <Feather name="user-plus" size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.sectionLabel}>
            2. Contacte de urgență (apel rapid)
          </Text>
        </View>
        <Text style={styles.hint}>
          Numerele pe care le vei putea apela chiar și în timpul blocării.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nume"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefon"
            value={newContactPhone}
            onChangeText={setNewContactPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.addButton} onPress={addContact}>
            <Feather name="plus" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.contactsList}>
          {contacts.length === 0 ? (
            <Text style={styles.emptyList}>Nu ai adăugat niciun contact de urgență.</Text>
          ) : (
            contacts.map((c, i) => (
              <View key={i} style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeContact(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <View style={styles.iconBox}>
            <Feather name="key" size={20} color={COLORS.warning} />
          </View>
          <Text style={styles.sectionLabel}>
            3. Cod de deblocare (persoana de încredere)
          </Text>
        </View>
        <Text style={styles.hint}>
          Dată codului unei persoane de încredere. Dacă vrei să îți deblocezi
          telefonul înainte de timp, ea trebuie să-ți spună codul.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Cod de 4 cifre"
          value={unlockCode}
          onChangeText={setUnlockCode}
          keyboardType="numeric"
          maxLength={6}
        />
        {unlockCode ? (
          <Text style={styles.successHint}>Codul este salvat în aplicație.</Text>
        ) : (
          <Text style={styles.warningHint}>
            Fără cod, telefonul se deblochează doar după expirarea timpului.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={startLock} disabled={loading}>
          <View style={styles.buttonContent}>
            {loading ? (
              <ActivityIndicator color={COLORS.text} size={20} />
            ) : (
              <Feather name="lock" size={22} color={COLORS.text} />
            )}
            <Text style={styles.buttonText}>
              {loading ? 'Pornire...' : 'Blochează telefonul'}
            </Text>
            <Feather name="arrow-right" size={20} color={COLORS.text} style={styles.arrow} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 15,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  hint: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    minWidth: 78,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  chipCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.background,
  },
  customInput: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    width: 44,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  contactsList: {
    gap: 8,
  },
  emptyList: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  contactPhone: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  removeButton: {
    padding: 4,
  },
  successHint: {
    fontSize: 13,
    color: COLORS.success,
    marginTop: 6,
    fontWeight: '600',
  },
  warningHint: {
    fontSize: 13,
    color: COLORS.warning,
    marginTop: 6,
    fontWeight: '600',
  },
  footer: {
    marginTop: 8,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.background,
  },
  arrow: {
    marginLeft: 2,
  },
})
