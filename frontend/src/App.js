import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import Layout from '@/components/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Contacts from '@/pages/Contacts';
import Campaigns from '@/pages/Campaigns';
import WhatsAppCampaigns from '@/pages/WhatsAppCampaigns';
import Analytics from '@/pages/Analytics';
import Calendar from '@/pages/Calendar';
import Admin from '@/pages/Admin';
import Pricing from '@/pages/Pricing';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/whatsapp" element={<WhatsAppCampaigns />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;
