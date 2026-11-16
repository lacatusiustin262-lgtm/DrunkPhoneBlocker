import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Linking,
  Platform,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useKeepAwake } from 'expo-keep-awake'
import { setBackgroundColorAsync } from 'expo-system-ui'
import { setStatusBarHidden } from 'expo-status-bar'
import * as ScreenCapture from 'expo-screen-capture'
import ExpoCamera from 'expo-camera/build/ExpoCamera'
import { useCameraPermissions } from 'expo-camera'
import { File } from 'expo-file-system'
import { Feather } from '@expo/vector-icons'
import {
  initDb,
  getSession,
  getActiveSession,
  getContacts,
  completeSession,
  addNote,
  addPhoto,
  getPhotos,
  deletePhoto,
} from '../lib/db'
import { COLORS, formatTimeLeft } from '../theme'

const { width } = Dimensions.get('window')

export default function Lock() {
  const { sessionId } = useLocalSearchParams()

  useKeepAwake('drunkphoneblocker')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatusBarHidden(true)
      await setBackgroundColorAsync(COLORS.background)
      await ScreenCapture.preventScreenCaptureAsync()
      return () => {
        if (mounted) {
          setStatusBarHidden(false)
          ScreenCapture.allowScreenCaptureAsync()
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const [session, setSession] = useState<{
    id: number
    endAt: number
    durationHours: number
    unlockCode: string | null
    status: string
  } | null>(null)
  const [contacts, setContactsState] = useState<{ id: number; name: string; phone: string }[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [expired, setExpired] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Note text
  const [noteText, setNoteText] = useState('')

  // Camera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back')
  const cameraRef = useRef<any>(null)
  const [photos, setPhotos] = useState<{ uri: string }[]>([])
const [cameraError, setCameraError] = useState<string | null>(null)

  const startTimer = useCallback((endAt: number) => {
    const tick = () => {
      const remaining = Math.floor((endAt - Date.now()) / 1000)
      setTimeLeft(remaining)
      if (remaining <= 0 && !expired) {
        setExpired(true)
        if (timerRef.current) clearInterval(timerRef.current)
        ;(async () => {
          if (session) {
            await completeSession(session.id)
            router.replace('/morning')
          }
        })()
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [expired, session])

  const refreshPhotos = useCallback(async () => {
    if (!session) return
    const all = await getPhotos(session.id)
    setPhotos(all.map((p) => ({ uri: p.uri })))
  }, [session])

  useEffect(() => {
    ;(async () => {
      await initDb()
      let s
      if (sessionId) {
        s = await getSession(Number(sessionId))
      } else {
        s = await getActiveSession()
      }
      if (!s) {
        router.replace('/setup')
        return
      }
      setSession(s)
      startTimer(s.endAt)
      ;(async () => {
        const allContacts = await getContacts()
        setContactsState(allContacts)
        await refreshPhotos()
      })()
    })()
    return () => {}
  }, [sessionId, startTimer, refreshPhotos])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Emergency call
  const callEmergency = async (phone: string) => {
    const url = `tel:${phone}`
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Nu se poate porni apelul')
    }
  }

  // Text note
  const saveTextNote = async () => {
    if (!session || !noteText.trim()) return
    await addNote(session.id, 'text', noteText.trim(), null)
    setNoteText('')
  }

  // Camera
  const openCamera = async () => {
    if (Platform.OS === 'web') return
    if (cameraPermission?.granted) {
      setCameraOpen(true)
    } else {
      const { status } = await requestCameraPermission()
      if (status === 'granted') {
        setCameraOpen(true)
      } else {
        Alert.alert('Camera este necesară pentru a face poze.')
      }
    }
  }

  const takePicture = async () => {
    if (!session) return
    if (!cameraRef.current) {
      setCameraError('Camera nu este initializată. Încearcă din nou.')
      return
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      })
      setCameraError(null)
      if (session) {
        await addPhoto(session.id, photo.uri)
        setPhotos([...photos, { uri: photo.uri }])
      }
      setCameraOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setCameraError(message)
      Alert.alert('Eroare la captură', message)
      console.error(error)
    }
  }

  const closeCamera = () => setCameraOpen(false)

  const deletePhotoItem = async (uri: string) => {
    try {
      const file = new File(uri)
      if (file.exists) {
        file.delete()
      }
    } catch {
      // ignore file errors
    }
    setPhotos(photos.filter((p) => p.uri !== uri))
    ;(async () => {
      const all = await getPhotos(session?.id ?? 0)
      const toDelete = all.find((p) => p.uri === uri)
      if (toDelete) await deletePhoto(toDelete.id)
    })()
  }

  const goUnlock = () => {
    if (!session) return
    router.push(`/unlock?sessionId=${session.id}`)
  }

  const { h, m, s, text } = formatTimeLeft(timeLeft)

  if (!session) {
    return null
  }

  if (expired) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Feather name="check-circle" color={COLORS.success} size={64} />
          <Text style={styles.bigText}>Telefonul s-a deblocat!</Text>
          <Text style={styles.subText}>Ai fost blocat {session.durationHours} ore.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/morning')}
          >
            <Text style={styles.buttonText}>Vezi pozele și notele de ieri noapte</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Telefonul este blocat</Text>
          <TouchableOpacity style={styles.closeLockButton} onPress={goUnlock}>
            <Feather name="lock" color={COLORS.textMuted} size={20} />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Rămâne până la deblocare</Text>
          <Text style={styles.timer}>{text}</Text>
          <View style={styles.timerUnits}>
            <View style={styles.unit}>
              <Text style={styles.unitValue}>{String(h).padStart(2, '0')}</Text>
              <Text style={styles.unitLabel}>ORE</Text>
            </View>
            <View style={styles.unit}>
              <Text style={styles.unitValue}>{String(m).padStart(2, '0')}</Text>
              <Text style={styles.unitLabel}>MIN</Text>
            </View>
            <View style={styles.unit}>
              <Text style={styles.unitValue}>{String(s).padStart(2, '0')}</Text>
              <Text style={styles.unitLabel}>SEC</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, 100 - (timeLeft / (session.durationHours * 3600)) * 100))}%` },
              ] as StyleProp<ViewStyle>}
            />
          </View>
        </View>

        {/* Emergency contacts */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Feather name="phone" color={COLORS.accent} size={18} />
            <Text style={styles.sectionTitle}>Apeluri de urgență</Text>
          </View>
          {contacts.length > 0 ? (
            <View style={styles.contactsRow}>
              {contacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.emergencyButton}
                  onPress={() => callEmergency(c.phone)}
                >
                  <Feather name="phone" color={COLORS.danger} size={20} />
                  <Text style={styles.emergencyButtonText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noContacts}>
              Nu au fost adăugați contacte de urgență în setup. Te rugăm să ai
              grijă de tine.
            </Text>
          )}
        </View>

        {/* Text note */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Notă pentru mâine</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholderTextColor={COLORS.textMuted}
            placeholder="Scrie ceva pentru că vei primi de citit mâine..."
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.saveNoteButton} onPress={saveTextNote}>
            <Text style={styles.saveNoteText}>Salvează nota</Text>
          </TouchableOpacity>
        </View>

        {/* Camera */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Feather name="image" color={COLORS.accent} size={18} />
            <Text style={styles.sectionTitle}>Foto pentru mâine</Text>
          </View>
          <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
            <View style={styles.cameraIcon}>
              <Feather name="camera" color={COLORS.text} size={32} />
            </View>
            <Text style={styles.cameraText}>Face o poze</Text>
          </TouchableOpacity>
          {cameraError && (
            <View style={styles.cameraErrorBox}>
              <Feather name="alert-circle" color={COLORS.danger} size={18} />
              <Text style={styles.cameraErrorText}>{cameraError}</Text>
            </View>
          )}
          {photos.length > 0 && (
            <View style={styles.photoPreviews}>
              {photos.map((p, i) => {
                const uri = p.uri.startsWith('file://') ? p.uri : `file://${p.uri}`
                return (
                  <View key={i} style={styles.photoItem}>
                    <Image source={{ uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.photoDelete}
                      onPress={() => deletePhotoItem(p.uri)}
                    >
                      <Feather name="trash-2" color={COLORS.danger} size={16} />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Camera modal */}
      {cameraOpen && cameraPermission?.granted && (
        <View style={styles.cameraModal}>
          <View style={styles.cameraView}>
            <ExpoCamera
              ref={cameraRef}
              style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}
              facing={cameraType}
            />
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.switchCameraButton}
                onPress={() =>
                  setCameraType(cameraType === 'back' ? 'front' : 'back')
                }
              >
                <Text style={styles.switchCameraText}>
                  {cameraType === 'back' ? 'Selfie' : 'Spate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture} />
              <TouchableOpacity style={styles.closeCameraButton} onPress={closeCamera}>
                <Text style={styles.closeCameraText}>Anulează</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeLockButton: {
    padding: 6,
  },
  timerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  timerLabel: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  timer: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  timerUnits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  unit: {
    alignItems: 'center',
  },
  unitValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  unitLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  section: {
    gap: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  contactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  noContacts: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 110,
  },
  saveNoteButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveNoteText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 16,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  recordText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 12,
  },
  voiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  voiceControls: {
    gap: 10,
  },
  voiceControlButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  voiceControlDelete: {
    width: 32,
    height: 32,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 16,
  },
  cameraErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244,114,114,0.15)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  cameraErrorText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  cameraIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  cameraText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  photoPreviews: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photoItem: {
    position: 'relative',
    width: (width - 48) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 100,
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchCameraButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  switchCameraText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.text,
    alignSelf: 'center',
  },
  closeCameraButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  closeCameraText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  bigText: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
})
