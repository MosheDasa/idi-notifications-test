import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Tooltip,
  message as AntMessage,
  Card,
  Switch,
  Typography,
  Divider,
  Tabs,
  InputNumber,
  Radio,
  Badge,
  Alert,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  BellOutlined,
  CodeOutlined,
  LinkOutlined,
  StarOutlined,
  StarFilled,
  WifiOutlined,
} from "@ant-design/icons";
import {
  getNotifications,
  addNotification,
  deleteNotification,
  editNotification,
  resetNotification,
  favoriteNotification,
  unfavoriteNotification,
  resetAllNotifications,
  connectWebSocket,
  disconnectWebSocket,
  Notification as ApiNotification,
} from "./api";

const { Title } = Typography;
const { TabPane } = Tabs;

type Notification = ApiNotification & {
  id: string;
};

function NotificationTable() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] =
    useState<Notification | null>(null);
  const [showSentNotifications, setShowSentNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [form] = Form.useForm();
  const [userId, setUserId] = useState("97254");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAlert, setConnectionAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadNotifications();
    connectWebSocket(userId, handleNewNotification, handleConnectionStatus);
    return () => {
      disconnectWebSocket();
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(userId);
      setNotifications(
        data.map((notification) => ({
          ...notification,
          id: notification.id || Date.now().toString(),
        }))
      );
    } catch (error) {
      AntMessage.error("שגיאה בטעינת ההתראות");
    }
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications((prevNotifications) => {
      const existingIndex = prevNotifications.findIndex(
        (n) => n.id === notification.id
      );
      if (existingIndex >= 0) {
        const newNotifications = [...prevNotifications];
        newNotifications[existingIndex] = notification;
        return newNotifications;
      }
      return [notification, ...prevNotifications];
    });
  };

  const handleConnectionStatus = (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      setConnectionAlert({
        type: "success",
        message: "החיבור לשרת שוחזר בהצלחה",
      });
      setTimeout(() => setConnectionAlert(null), 3000);
    } else {
      setConnectionAlert({
        type: "error",
        message: "החיבור לשרת נותק. מנסה להתחבר מחדש...",
      });
    }
  };

  const openAddModal = () => {
    setEditingNotification(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const openEditModal = (notification: Notification) => {
    setEditingNotification(notification);
    form.setFieldsValue({
      type: notification.type,
      message: notification.message,
      userId: notification.userId,
      isPermanent: notification.isPermanent,
      displayTime: notification.isPermanent ? 5000 : notification.displayTime,
      amount: notification.amount,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      AntMessage.success("התראה נמחקה בהצלחה");
      loadNotifications();
    } catch (error: any) {
      let errorMessage = "שגיאה במחיקת ההתראה";

      if (error.response) {
        const serverError = error.response.data?.error;
        if (serverError) {
          errorMessage = serverError;
        } else if (error.response.status === 404) {
          errorMessage = "ההתראה לא נמצאה";
        }
      }

      AntMessage.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "50vh" },
      });
    }
  };

  const handleReset = async (id: string) => {
    try {
      await resetNotification(id);
      AntMessage.success("התראה נשלחה מחדש בהצלחה");
      loadNotifications();
    } catch (error: any) {
      let errorMessage = "שגיאה בשליחה מחדש";

      if (error.response) {
        const serverError = error.response.data?.error;
        if (serverError) {
          errorMessage = serverError;
        } else if (error.response.status === 404) {
          errorMessage = "ההתראה לא נמצאה";
        }
      }

      AntMessage.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "50vh" },
      });
    }
  };

  const handleResetAll = async () => {
    try {
      await resetAllNotifications();
      AntMessage.success("כל ההתראות אופסו בהצלחה");
      loadNotifications();
    } catch (error) {
      AntMessage.error("שגיאה באיפוס ההתראות");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const notificationData = {
        ...values,
        isPermanent: values.isPermanent || false,
        displayTime: values.isPermanent ? null : values.displayTime || 5000,
        amount: values.type === "COINS" ? values.amount : undefined,
      };

      if (editingNotification) {
        await editNotification(editingNotification.id, notificationData);
        AntMessage.success("התראה עודכנה ונשלחה מחדש בהצלחה");
      } else {
        await addNotification(notificationData);
        AntMessage.success("התראה נוספה ונשלחה בהצלחה");
      }
      setIsModalVisible(false);
      loadNotifications();
    } catch (error: any) {
      let errorMessage = "שגיאה בשמירת ההתראה";

      if (error.response) {
        const serverError = error.response.data?.error;
        if (serverError) {
          errorMessage = serverError;
        } else if (error.response.status === 400) {
          errorMessage = "הנתונים שהוזנו אינם תקינים";
        } else if (error.response.status === 404) {
          errorMessage = "ההתראה לא נמצאה";
        } else if (error.response.status === 500) {
          errorMessage = "שגיאת שרת פנימית";
        }
      } else if (error.request) {
        errorMessage = "לא ניתן להתחבר לשרת. אנא בדוק את החיבור שלך";
      } else if (error.message) {
        errorMessage = error.message;
      }

      AntMessage.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "50vh" },
      });
    }
  };

  const handleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await unfavoriteNotification(id);
        AntMessage.success("התראה הוסרה מהמועדפים");
      } else {
        await favoriteNotification(id);
        AntMessage.success("התראה נוספה למועדפים");
      }
      loadNotifications();
    } catch (error: any) {
      let errorMessage = "שגיאה בעדכון המועדפים";

      if (error.response) {
        const serverError = error.response.data?.error;
        if (serverError) {
          errorMessage = serverError;
        } else if (error.response.status === 404) {
          errorMessage = "ההתראה לא נמצאה";
        }
      }

      AntMessage.error({
        content: errorMessage,
        duration: 5,
        style: { marginTop: "50vh" },
      });
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "favorites") {
      return notification.isFavorite;
    }
    return showSentNotifications || !notification.sent;
  });

  const columns = [
    {
      title: "מועדפים",
      key: "favorite",
      width: 80,
      render: (_: any, record: Notification) => (
        <Tooltip title={record.isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}>
          <Button
            type="text"
            icon={
              record.isFavorite ? (
                <StarFilled style={{ color: "#ffd700" }} />
              ) : (
                <StarOutlined />
              )
            }
            onClick={() => handleFavorite(record.id!, !record.isFavorite)}
          />
        </Tooltip>
      ),
    },
    {
      title: "סוג",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type: string) => {
        const color =
          type === "ERROR"
            ? "red"
            : type === "COINS"
            ? "gold"
            : type === "FREE_HTML"
            ? "purple"
            : type === "URL_HTML"
            ? "cyan"
            : "blue";
        return (
          <Tag color={color} style={{ padding: "4px 8px", fontSize: "14px" }}>
            {type === "FREE_HTML" ? "HTML" : type === "URL_HTML" ? "URL" : type}
          </Tag>
        );
      },
    },
    {
      title: "תוכן ההתראה",
      dataIndex: "message",
      key: "message",
      render: (text: string, record: Notification) => {
        if (record.type === "FREE_HTML") {
          return (
            <div
              style={{
                fontSize: "16px",
                lineHeight: "1.5",
                maxHeight: "200px",
                overflow: "auto",
              }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
          );
        }
        if (record.type === "URL_HTML") {
          return (
            <div style={{ fontSize: "16px", lineHeight: "1.5" }}>
              <div style={{ marginBottom: 8 }}>
                <a href={text} target="_blank" rel="noopener noreferrer">
                  {text}
                </a>
              </div>
              {record.htmlContent ? (
                <div
                  style={{
                    maxHeight: "200px",
                    overflow: "auto",
                    border: "1px solid #f0f0f0",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                  dangerouslySetInnerHTML={{ __html: record.htmlContent }}
                />
              ) : record.error ? (
                <div style={{ color: "red" }}>
                  שגיאה בטעינת התוכן: {record.error}
                </div>
              ) : (
                <div style={{ color: "#666" }}>טוען תוכן...</div>
              )}
            </div>
          );
        }
        if (record.type === "COINS") {
          return (
            <div style={{ fontSize: "16px", lineHeight: "1.5" }}>
              <div>{text}</div>
              {record.amount !== undefined && (
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#002e6d",
                    marginTop: "8px",
                  }}
                >
                  סכום: ₪{record.amount.toLocaleString()}
                </div>
              )}
            </div>
          );
        }
        return (
          <div style={{ fontSize: "16px", lineHeight: "1.5" }}>{text}</div>
        );
      },
    },
    {
      title: "תאריך ושעה",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => {
        try {
          const formattedDate = new Date(date).toLocaleString("he-IL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return <div style={{ color: "#666" }}>{formattedDate}</div>;
        } catch (error) {
          return <div style={{ color: "#666" }}>{date}</div>;
        }
      },
    },
    {
      title: "סטטוס שליחה",
      dataIndex: "sent",
      key: "sent",
      width: 120,
      render: (sent: boolean) => (
        <Tag color={sent ? "green" : "volcano"} style={{ padding: "4px 8px" }}>
          {sent ? "נשלח" : "לא נשלח"}
        </Tag>
      ),
    },
    {
      title: "פעולות",
      key: "actions",
      width: 150,
      render: (_: any, record: Notification) => (
        <Space>
          <Tooltip title="ערוך">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="מחק">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
          <Tooltip title="שלח מחדש">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleReset(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // URL validation function
  const validateUrl = (_: any, value: string) => {
    try {
      new URL(value);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject("הכנס כתובת URL תקינה");
    }
  };

  const items = [
    {
      key: "all",
      label: "כל ההתראות",
    },
    {
      key: "favorites",
      label: "מועדפים",
    },
  ];

  return (
    <Card
      style={{
        width: "100%",
        margin: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
      styles={{
        body: { padding: "24px" },
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          <BellOutlined style={{ marginLeft: 8 }} />
          ניהול התראות
          <Badge
            status={isConnected ? "success" : "error"}
            style={{ marginLeft: 8 }}
            text={
              <span
                style={{
                  fontSize: "14px",
                  color: isConnected ? "#52c41a" : "#ff4d4f",
                }}
              >
                {isConnected ? "מחובר" : "מנותק"}
              </span>
            }
          />
        </Title>
        <Space>
          <Input
            placeholder="מזהה משתמש"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 150 }}
          />
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={handleResetAll}
            danger
          >
            איפוס כל ההתראות
          </Button>
          <Switch
            checked={showSentNotifications}
            onChange={setShowSentNotifications}
            checkedChildren="הצג נשלחו"
            unCheckedChildren="הסתר נשלחו"
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            הוסף התראה חדשה
          </Button>
        </Space>
      </div>

      {connectionAlert && (
        <Alert
          type={connectionAlert.type}
          message={connectionAlert.message}
          showIcon
          closable
          onClose={() => setConnectionAlert(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />

      <Table
        columns={columns}
        dataSource={filteredNotifications}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        style={{ marginTop: 16 }}
      />

      <Modal
        title={editingNotification ? "עריכת התראה" : "הוספת התראה"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="שמור"
        cancelText="בטל"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isPermanent: false,
            displayTime: 5000,
          }}
        >
          <Form.Item
            name="userId"
            label="מזהה משתמש"
            initialValue="97254"
            rules={[{ required: true, message: "הכנס מזהה משתמש" }]}
          >
            <Input placeholder="הכנס מזהה משתמש" />
          </Form.Item>
          <Form.Item
            name="type"
            label="סוג"
            rules={[{ required: true, message: "בחר סוג" }]}
          >
            <Select
              options={[
                { value: "INFO", label: "מידע (INFO)" },
                { value: "ERROR", label: "שגיאה (ERROR)" },
                { value: "COINS", label: "מטבעות (COINS)" },
                { value: "FREE_HTML", label: "HTML מותאם" },
                { value: "URL_HTML", label: "HTML מ-URL" },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.type !== currentValues.type
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("type") === "COINS" ? (
                <Form.Item
                  name="amount"
                  label="סכום"
                  rules={[{ required: true, message: "הכנס סכום" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="הכנס סכום"
                    min={0}
                    step={1}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="isPermanent" label="התראה קבועה">
            <Radio.Group>
              <Radio value={true}>כן</Radio>
              <Radio value={false}>לא</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.isPermanent !== currentValues.isPermanent
            }
          >
            {({ getFieldValue }) =>
              !getFieldValue("isPermanent") && (
                <Form.Item
                  name="displayTime"
                  label="זמן תצוגה (מילישניות)"
                  rules={[{ required: true, message: "הכנס זמן תצוגה" }]}
                >
                  <InputNumber
                    min={1000}
                    max={30000}
                    step={1000}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item
            name="message"
            label="תוכן ההתראה"
            rules={[
              { required: true, message: "הכנס תוכן" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue("type") !== "URL_HTML" || !value) {
                    return Promise.resolve();
                  }
                  return validateUrl(_, value);
                },
              }),
            ]}
          >
            {form.getFieldValue("type") === "URL_HTML" ? (
              <Input
                prefix={<LinkOutlined />}
                placeholder="הכנס URL של דף HTML..."
                addonBefore="https://"
              />
            ) : (
              <Input.TextArea
                rows={8}
                placeholder={
                  form.getFieldValue("type") === "FREE_HTML"
                    ? "הכנס קוד HTML כאן..."
                    : "הכנס הודעה כאן..."
                }
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default NotificationTable;
