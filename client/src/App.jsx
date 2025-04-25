import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Header from "./pages/components/Header";
import Profile from "./pages/Profile";
import About from "./pages/About";
import PrivateRoute from "./pages/Routes/PrivateRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./pages/Routes/AdminRoute";
import UpdatePackage from "./pages/admin/UpdatePackage";
import Package from "./pages/Package";
import RatingsPage from "./pages/RatingsPage";
import Booking from "./pages/user/Booking";
import Search from "./pages/Search";
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

const App = () => {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/search" element={<Search />} />
        
        {/* User routes */}
        <Route path="/profile" element={<PrivateRoute />}>
          <Route index element={<Profile />} />
          <Route path="user" element={<Profile />} />
        </Route>
        
        {/* Admin routes */}
        <Route path="/admin-dashboard" element={<AdminRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="update-package/:id" element={<UpdatePackage />} />
        </Route>
        
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/package/:id" element={<Package />} />
        <Route path="/package/ratings/:id" element={<RatingsPage />} />
        
        {/* Booking route */}
        <Route path="/booking" element={<PrivateRoute />}>
          <Route path=":packageId" element={<Booking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
