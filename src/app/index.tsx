import { useEffect } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { initDb, getActiveSession } from '../lib/db'
import { COLORS } from '../theme'

export default function Index() {
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await initDb()
        const session = await getActiveSession()
        if (mounted) {
          router.replace(session ? '/lock' : '/setup')
        }
      } catch (error) {
        console.error(error)
        if (mounted) router.replace('/setup')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
