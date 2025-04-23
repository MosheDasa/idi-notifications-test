import axios from "axios";

export type NotificationType =
  | "INFO"
  | "ERROR"
  | "COINS"
  | "FREE_HTML"
  | "URL_HTML";

export interface Notification {
  id?: string;
  type: NotificationType;
  message: string;
  userId?: string;
  sent?: boolean;
  createdAt?: string;
  htmlContent?: string;
  error?: string;
  isFavorite?: boolean;
}

const api = axios.create({
  baseURL: "http://localhost:3001",
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

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const { data } = await api.get("/notifications");
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
    await api.post(`/notifications/${id}/reset`);
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
    await api.post(`/notifications/${id}/edit`, notification);
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
