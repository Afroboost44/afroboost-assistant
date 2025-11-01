import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Contacts from '@/pages/Contacts';
import Campaigns from '@/pages/Campaigns';
import WhatsAppCampaigns from '@/pages/WhatsAppCampaignsAdvanced';
import Analytics from '@/pages/Analytics';
import Calendar from '@/pages/Calendar';
import Admin from '@/pages/Admin';
import Pricing from '@/pages/Pricing';
import Profile from '@/pages/Profile';
import PricingManagement from '@/pages/PricingManagement';
import Catalog from '@/pages/Catalog';
import Reservations from '@/pages/Reservations';
import Reminders from '@/pages/Reminders';
import GiftCards from '@/pages/GiftCards';
import Discounts from '@/pages/Discounts';
import Referrals from '@/pages/Referrals';
import AdChat from '@/pages/AdChat';
import ProductPage from '@/pages/ProductPage';
import PublicCatalog from '@/pages/PublicCatalog';
import CheckoutPage from '@/pages/CheckoutPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/contacts" element={
              <ProtectedRoute>
                <Layout><Contacts /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <Layout><Campaigns /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/whatsapp" element={
              <ProtectedRoute>
                <Layout><WhatsAppCampaigns /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Layout><Analytics /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Layout><Calendar /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/catalog" element={
              <ProtectedRoute>
                <Layout><Catalog /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/reservations" element={
              <ProtectedRoute>
                <Layout><Reservations /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/reminders" element={
              <ProtectedRoute>
                <Layout><Reminders /></Layout>
              </ProtectedRoute>
            } />

            {/* New Phase 2 routes */}
            <Route path="/gift-cards" element={
              <ProtectedRoute>
                <Layout><GiftCards /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/discounts" element={
              <ProtectedRoute>
                <Layout><Discounts /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/referrals" element={
              <ProtectedRoute>
                <Layout><Referrals /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/ad-chat" element={
              <ProtectedRoute>
                <Layout><AdChat /></Layout>
              </ProtectedRoute>
            } />

            {/* Admin-only routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout><Admin /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing-plans" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout><PricingManagement /></Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
