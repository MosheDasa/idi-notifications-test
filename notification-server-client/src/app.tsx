import React from "react";
import { Layout } from "antd";
import NotificationTable from "./NotificationTable";

const { Header, Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ color: "white", fontSize: "20px" }}>
        Notification System
      </Header>
      <Content style={{ padding: "24px" }}>
        <NotificationTable />
      </Content>
    </Layout>
  );
};

export default App;
