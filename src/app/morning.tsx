import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  getLatestSession,
  getNotes,
  getPhotos,
  deleteNote,
  deletePhoto,
} from '../lib/db'
import { File } from 'expo-file-system'
import { COLORS, formatTimeLeft } from '../theme'

export default function Morning() {
  const [session, setSession] = useState<{
    id: number
    endAt: number
    startAt: number
    durationHours: number
  } | null>(null)
  const [notes, setNotes] = useState<{
    id: number
    type: string
    content: string | null
    audioUri: string | null
    createdAt: number
  }[]>([])
  const [photos, setPhotos] = useState<{ id: number; uri: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const s = await getLatestSession()
      setSession(s)
      if (s) {
        const [notesList, photosList] = await Promise.all([
          getNotes(s.id),
          getPhotos(s.id),
        ])
        setNotes(notesList)
        setPhotos(photosList)
      }
      setLoading(false)
    })()
  }, [])

  const deleteNoteItem = async (id: number) => {
    await deleteNote(id)
    setNotes(notes.filter((n) => n.id !== id))
  }

  const deletePhotoItem = async (id: number, uri: string) => {
    try {
      const file = new File(uri)
      if (file.exists) {
        file.delete()
      }
    } catch {
      // ignore file errors
    }
    await deletePhoto(id)
    setPhotos(photos.filter((p) => p.id !== id))
  }

  const uriFor = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://')
      ? uri
      : `file://${uri}`

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.screen}>
        <View style={styles.empty}>
          <Feather name="check-circle" color={COLORS.textMuted} size={48} />
          <Text style={styles.emptyTitle}>Nu există sesiune recentă</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/setup')}>
            <Text style={styles.buttonText}>Pornește o nouă blocare</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const { text } = formatTimeLeft(
    Math.floor((session.endAt - session.startAt) / 1000)
  )

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Feather name="sunrise" color={COLORS.success} size={40} />
        <Text style={styles.title}>Bună dimineața! 🌅</Text>
        <Text style={styles.subtitle}>
          Te ai trezit. Iată ce ai lătat de la noaptea trecută.
        </Text>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sessionLabel}>Durata blocării</Text>
        <Text style={styles.sessionValue}>{text}</Text>
        <Text style={styles.sessionNote}>
          Telefonul este acum deblocat și poți folosi aplicațiile în altfel.
        </Text>
      </View>

      {photos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Feather name="image" color={COLORS.accent} size={20} />
            <Text style={styles.sectionTitle}>Foto din noaptea trecută</Text>
          </View>
          <View style={styles.photoGrid}>
            {photos.map((p) => (
              <View key={p.id} style={styles.photoItem}>
                <Image source={{ uri: uriFor(p.uri) }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoDelete}
                  onPress={() => deletePhotoItem(p.id, p.uri)}
                >
                  <Feather name="trash-2" color={COLORS.danger} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {notes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Feather name="mic" color={COLORS.accent} size={20} />
            <Text style={styles.sectionTitle}>Note salvate</Text>
          </View>
          <View style={styles.notesList}>
            {notes.map((n) => (
              <View key={n.id} style={styles.noteItem}>
                <View style={styles.noteBody}>
                  {n.type === 'voice' ? (
                    <>
                      <Feather name="mic" color={COLORS.accent} size={16} style={styles.noteIconMini} />
                      <Text style={styles.noteText}>
                        Notă vocală salvată
                        {n.audioUri ? ' (apasă pe ștergere pentru a o elimina)' : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noteText}>{n.content}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.noteDelete}
                  onPress={() => deleteNoteItem(n.id)}
                >
                  <Feather name="trash-2" color={COLORS.danger} size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {photos.length === 0 && notes.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="clock" color={COLORS.textMuted} size={40} />
          <Text style={styles.emptyTitle}>Nu ai lătat nicio amintire de la noaptea trecută.</Text>
          <Text style={styles.emptySubtitle}>
            Face poze, scrie note sau înregistrează vocea următoarea dată când
            te băți.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/setup')}>
        <Feather name="arrow-right" color={COLORS.background} size={20} style={styles.arrow} />
        <Text style={styles.buttonText}>Pornește o nouă blocare</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sessionValue: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sessionNote: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    position: 'relative',
    width: (100 - 30) / 3,
    aspectRatio: 1,
    borderRadius: 14,
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
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    gap: 10,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 12,
  },
  noteIconMini: {
    marginRight: 6,
  },
  noteBody: {
    flex: 1,
  },
  noteText: {
    fontSize: 15,
    color: COLORS.text,
  },
  noteDelete: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
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
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.background,
  },
  arrow: {
    marginLeft: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
})
