const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const port = 3001;
const notificationsFile = path.join(__dirname, "notifications.json");
const favoritesFile = path.join(__dirname, "favorites.json");

// Valid notification types
const VALID_TYPES = ["INFO", "ERROR", "COINS", "FREE_HTML", "URL_HTML"];

app.use(cors());
app.use(bodyParser.json());

function readNotifications() {
  if (!fs.existsSync(notificationsFile)) {
    fs.writeFileSync(notificationsFile, "[]");
  }
  return JSON.parse(fs.readFileSync(notificationsFile));
}

function writeNotifications(data) {
  fs.writeFileSync(notificationsFile, JSON.stringify(data, null, 2));
}

function readFavorites() {
  if (!fs.existsSync(favoritesFile)) {
    fs.writeFileSync(favoritesFile, "[]");
  }
  return JSON.parse(fs.readFileSync(favoritesFile));
}

function writeFavorites(data) {
  fs.writeFileSync(favoritesFile, JSON.stringify(data, null, 2));
}

// Validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Validate notification data
function validateNotification(data) {
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`);
  }
  if (!data.message || typeof data.message !== "string") {
    throw new Error("Message is required and must be a string");
  }
  if (data.type === "URL_HTML" && !isValidUrl(data.message)) {
    throw new Error("Invalid URL format for URL_HTML type");
  }
  return true;
}

// Fetch HTML content from URL
async function fetchHtmlContent(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch HTML content: ${error.message}`);
  }
}

// ✅ שליפת כל ההתראות
app.get("/notifications", async (req, res) => {
  try {
    const notifications = readNotifications();
    const favorites = readFavorites();

    // Add isFavorite flag to notifications
    const processedNotifications = notifications.map((notification) => ({
      ...notification,
      isFavorite: favorites.includes(notification.id),
    }));

    // Fetch HTML content for URL_HTML type notifications
    const finalNotifications = await Promise.all(
      processedNotifications.map(async (notification) => {
        if (notification.type === "URL_HTML") {
          try {
            const htmlContent = await fetchHtmlContent(notification.message);
            return { ...notification, htmlContent };
          } catch (error) {
            return { ...notification, htmlContent: null, error: error.message };
          }
        }
        return notification;
      })
    );

    res.json(finalNotifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ הוספת התראה חדשה
app.post("/notifications", (req, res) => {
  try {
    validateNotification(req.body);
    const notifications = readNotifications();
    const newNotification = {
      id: Date.now().toString(),
      type: req.body.type,
      message: req.body.message,
      userId: req.body.userId || "97254", // Default userId if not provided
      sent: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(newNotification);
    writeNotifications(notifications);
    res.json(newNotification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ מחיקת התראה
app.post("/notifications/:id/delete", (req, res) => {
  let notifications = readNotifications();
  notifications = notifications.filter((n) => n.id !== req.params.id);
  writeNotifications(notifications);
  res.sendStatus(200);
});

// ✅ איפוס סטטוס 'נשלח'
app.post("/notifications/:id/reset", (req, res) => {
  const notifications = readNotifications();
  const notification = notifications.find((n) => n.id === req.params.id);
  if (notification) notification.sent = false;
  writeNotifications(notifications);
  res.sendStatus(200);
});

// ✅ עריכת התראה קיימת
app.post("/notifications/:id/edit", (req, res) => {
  try {
    validateNotification(req.body);
    const notifications = readNotifications();
    const notification = notifications.find((n) => n.id === req.params.id);
    if (notification) {
      notification.type = req.body.type;
      notification.message = req.body.message;
    }
    writeNotifications(notifications);
    res.sendStatus(200);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 🟢 ✅ בדיקת התראות חדשות
app.get("/notifications/check", async (req, res) => {
  try {
    const userId = req.query.userId || "97254"; // Default userId if not provided
    const queue = readNotifications();
    const nextNotification = queue.find((n) => !n.sent && n.userId === userId);

    if (nextNotification) {
      nextNotification.sent = true;
      writeNotifications(queue);

      // If it's a URL_HTML notification, fetch the content
      if (nextNotification.type === "URL_HTML") {
        try {
          const htmlContent = await fetchHtmlContent(nextNotification.message);
          return res.json({
            hasNotification: true,
            notification: { ...nextNotification, htmlContent },
          });
        } catch (error) {
          return res.json({
            hasNotification: true,
            notification: {
              ...nextNotification,
              htmlContent: null,
              error: error.message,
            },
          });
        }
      }

      return res.json({
        hasNotification: true,
        notification: nextNotification,
      });
    }

    res.json({
      hasNotification: false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ הוספת התראה למועדפים
app.post("/notifications/:id/favorite", (req, res) => {
  try {
    const favorites = readFavorites();
    const notificationId = req.params.id;

    if (!favorites.includes(notificationId)) {
      favorites.push(notificationId);
      writeFavorites(favorites);
    }

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ הסרת התראה מהמועדפים
app.post("/notifications/:id/unfavorite", (req, res) => {
  try {
    const favorites = readFavorites();
    const notificationId = req.params.id;

    const updatedFavorites = favorites.filter((id) => id !== notificationId);
    writeFavorites(updatedFavorites);

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ איפוס כל ההתראות
app.post("/notifications/reset-all", (req, res) => {
  const notifications = readNotifications();
  notifications.forEach((notification) => {
    notification.sent = false;
  });
  writeNotifications(notifications);
  res.sendStatus(200);
});

app.listen(port, () =>
  console.log(`🚀 Notification server running at http://localhost:${port}`)
);
