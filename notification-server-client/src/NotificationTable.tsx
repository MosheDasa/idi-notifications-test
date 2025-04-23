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
} from "./api";

const { Title } = Typography;
const { TabPane } = Tabs;

interface Notification {
  id: string;
  type: "INFO" | "ERROR" | "COINS" | "FREE_HTML" | "URL_HTML";
  message: string;
  sent: boolean;
  createdAt: string;
  htmlContent?: string;
  error?: string;
  isFavorite: boolean;
}

function NotificationTable() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] =
    useState<Notification | null>(null);
  const [showSentNotifications, setShowSentNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [form] = Form.useForm();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data as Notification[]);
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
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    AntMessage.success("התראה נמחקה בהצלחה");
    loadNotifications();
  };

  const handleReset = async (id: string) => {
    await resetNotification(id);
    AntMessage.success("סטטוס ההתראה אופס בהצלחה");
    loadNotifications();
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
    const values = await form.validateFields();
    if (editingNotification) {
      await editNotification(editingNotification.id, values);
      AntMessage.success("התראה עודכנה בהצלחה");
    } else {
      await addNotification(values);
      AntMessage.success("התראה נוספה בהצלחה");
    }
    setIsModalVisible(false);
    loadNotifications();
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
    } catch (error) {
      AntMessage.error("שגיאה בעדכון המועדפים");
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

  return (
    <Card
      style={{
        width: "100%",
        margin: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
      bodyStyle={{ padding: "24px" }}
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
        </Title>
        <Space>
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

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="כל ההתראות" key="all" />
        <TabPane tab="מועדפים" key="favorites" />
      </Tabs>

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
        <Form form={form} layout="vertical">
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
            name="message"
            label="תוכן ההתראה"
            rules={[
              { required: true, message: "הכנס הודעה" },
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
