// src/App.js
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Auth from "./pages/LoginPage";
import Layout from "./components/Layout";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import React from "react";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<Auth />} />
          <Route path="register" element={<RegisterPage />} />
          
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage /> 
              </ProtectedRoute>
            }
          />
          
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
