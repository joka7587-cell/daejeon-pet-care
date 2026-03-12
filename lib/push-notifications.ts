import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// 알림 핸들러 설정 - 앱이 포그라운드에 있을 때도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (_) {
    return false;
  }
}

/**
 * 로컬 푸시 알림 전송
 */
export async function sendLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data || {},
        sound: true,
      },
      trigger: null, // 즉시 전송
    });
  } catch (_) {
    // 알림 전송 실패 시 무시
  }
}

/**
 * 알림 배지 초기화
 */
export async function clearBadge(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (_) {}
}

/**
 * 알림 배지 업데이트
 */
export async function updateBadge(count: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (_) {}
}
