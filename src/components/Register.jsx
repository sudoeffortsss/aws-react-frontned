
import React, { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const { Title } = Typography;

const Register = ({ setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("/api/register", {
        email: values.email,
        password: values.password,
      });
      // Assuming your API returns a token on successful registration
      localStorage.setItem("authToken", response.data.token);
      setIsAuthenticated(true);
      navigate("/");
    } catch (error) {
      message.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "20px", border: "1px solid #e8e8e8", borderRadius: 4 }}>
      <Title level={2} style={{ textAlign: "center" }}>Register</Title>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item 
          name="email" 
          label="Email" 
          rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}
        >
          <Input placeholder="Enter your email" />
        </Form.Item>
        <Form.Item 
          name="password" 
          label="Password" 
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password placeholder="Enter your password" />
        </Form.Item>
        <Form.Item 
          name="confirmPassword" 
          label="Confirm Password" 
          rules={[{ required: true, message: "Please confirm your password" }]}
        >
          <Input.Password placeholder="Confirm your password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form.Item>
        <Form.Item>
          <span>
            Already have an account? <Link to="/login">Login here</Link>
          </span>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Register;
