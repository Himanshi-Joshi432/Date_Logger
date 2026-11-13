import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const ENABLED_KEY = 'date_logger_reminders_enabled';
const CHANNEL_ID = 'reminders';
const MAX_ANNIVERSARIES = 50; // iOS allows 64 scheduled notifications in total
const REMINDER_HOUR = 9;

// Reminders are scheduled entirely on the device; nothing is sent to a push service.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function areRemindersEnabled() {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
  } catch (e) {
    return false;
  }
}

/** Asks for notification permission and turns reminders on. Returns false if the user declined. */
export async function enableReminders() {
  let settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    settings = await Notifications.requestPermissionsAsync();
  }
  if (!settings.granted) return false;
  await AsyncStorage.setItem(ENABLED_KEY, 'true');
  return true;
}

export async function disableReminders() {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
}

/**
 * Rebuilds the reminder schedule from the current posts:
 *  - a yearly "On this day" reminder on the anniversary of each memory
 *  - a Friday-evening nudge to plan a date from the bucket list
 * Safe to call often; it replaces whatever was scheduled before.
 */
export async function syncReminders(posts = []) {
  try {
    if (!(await areRemindersEnabled())) return;
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Memories & reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    // One reminder per calendar day, newest memory first.
    const byDay = new Map();
    for (const post of posts) {
      if (!post?.date) continue;
      const d = new Date(post.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getMonth()}-${d.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, { post, month: d.getMonth(), day: d.getDate(), count: 1 });
      else byDay.get(key).count += 1;
    }

    const anniversaries = [...byDay.values()].slice(0, MAX_ANNIVERSARIES);
    for (const { post, month, day, count } of anniversaries) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'On this day ♡',
          body:
            count > 1
              ? `${post.venue || 'A date'} and ${count - 1} more ${count - 1 === 1 ? 'memory' : 'memories'} from this day. Tap to relive them.`
              : `${post.venue || 'A date to remember'}. Tap to relive this memory.`,
          data: { postId: post._id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.YEARLY,
          month, // 0-11, same as a JavaScript Date
          day,
          hour: REMINDER_HOUR,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Date night this weekend?',
        body: 'Pick something from your bucket list and make a new memory.',
        data: { screen: 'ideas' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 6, // 1 = Sunday, so 6 = Friday
        hour: 18,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  } catch (err) {
    console.warn('Could not schedule reminders', err);
  }
}

/** Calls `onOpen(data)` when the user taps a reminder. Returns an unsubscribe function. */
export function onReminderOpened(onOpen) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    if (data) onOpen(data);
  });
  return () => sub.remove();
}
