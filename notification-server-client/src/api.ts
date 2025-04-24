import axios from "axios";

const API_URL = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";
const RECONNECT_DELAY = 5000; // 5 seconds

export type NotificationType =
  | "INFO"
  | "ERROR"
  | "COINS"
  | "FREE_HTML"
  | "URL_HTML";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  userId: string;
  isPermanent: boolean;
  displayTime: number | null;
  sent: boolean;
  createdAt: string;
  isFavorite?: boolean;
  htmlContent?: string;
  error?: string;
}

export type NotificationCallback = (notification: Notification) => void;
export type ConnectionStatusCallback = (isConnected: boolean) => void;

let ws: WebSocket | null = null;
let notificationCallback: NotificationCallback | null = null;
let connectionStatusCallback: ConnectionStatusCallback | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

const connect = (userId: string) => {
  if (isConnecting) return;
  isConnecting = true;

  if (ws) {
    ws.close();
  }

  ws = new WebSocket(`${WS_URL}?userId=${userId}`);

  ws.onopen = () => {
    isConnecting = false;
    if (connectionStatusCallback) {
      connectionStatusCallback(true);
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  ws.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    if (notificationCallback) {
      notificationCallback(notification);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    isConnecting = false;
  };

  ws.onclose = () => {
    isConnecting = false;
    if (connectionStatusCallback) {
      connectionStatusCallback(false);
    }
    // Attempt to reconnect after delay
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect(userId);
      }, RECONNECT_DELAY);
    }
  };
};

export const connectWebSocket = (
  userId: string,
  onNotification: NotificationCallback,
  onConnectionStatus?: ConnectionStatusCallback
) => {
  notificationCallback = onNotification;
  connectionStatusCallback = onConnectionStatus || null;
  connect(userId);
};

export const disconnectWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  notificationCallback = null;
  connectionStatusCallback = null;
  isConnecting = false;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Error handling wrapper
const handleApiError = (error: any) => {
  if (error.response) {
    throw new Error(error.response.data.error || "שגיאת שרת");
  } else if (error.request) {
    throw new Error("לא ניתן להתחבר לשרת");
  } else {
    throw new Error("שגיאה בהתחברות לשרת");
  }
};

export const getNotifications = async (
  userId: string = "97254"
): Promise<Notification[]> => {
  try {
    const { data } = await api.get("/notifications", {
      params: { userId },
    });
    return data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
};

export const addNotification = async (
  notification: Omit<Notification, "id" | "sent" | "createdAt">
): Promise<Notification> => {
  try {
    const { data } = await api.post("/notifications", {
      ...notification,
      userId: notification.userId || "97254",
    });
    return data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const deleteNotification = async (id: string): Promise<void> => {
  try {
    await api.post(`/notifications/${id}/delete`);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const resetNotification = async (id: string): Promise<void> => {
  try {
    const response = await api.post(`/notifications/${id}/reset`);
    if (response.data.success) {
      return;
    }
    throw new Error(response.data.error || "שגיאה בשליחה מחדש");
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const editNotification = async (
  id: string,
  notification: Omit<Notification, "id" | "sent" | "createdAt">
): Promise<void> => {
  try {
    const response = await api.post(`/notifications/${id}/edit`, notification);
    if (response.data.success) {
      return;
    }
    throw new Error(response.data.error || "שגיאה בעדכון ההתראה");
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const checkNotifications = async (
  userId: string = "97254"
): Promise<{
  hasNotification: boolean;
  notification?: Notification;
}> => {
  try {
    const { data } = await api.get("/notifications/check", {
      params: { userId },
    });
    return data;
  } catch (error) {
    handleApiError(error);
    return { hasNotification: false };
  }
};

export const favoriteNotification = async (id: string): Promise<void> => {
  try {
    await api.post(`/notifications/${id}/favorite`);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const unfavoriteNotification = async (id: string): Promise<void> => {
  try {
    await api.post(`/notifications/${id}/unfavorite`);
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const resetAllNotifications = async (): Promise<void> => {
  try {
    await api.post("/notifications/reset-all");
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
