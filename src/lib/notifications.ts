import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleUnlockNotification(endAt: number, sessionId: number) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DrunkPhone Blocker',
      body: 'Telefonul s-a deblocat. Poți accesa din nou tot ce trebuie.',
      data: { sessionId, type: 'unlock' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endAt,
    },
  })
  return id
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
