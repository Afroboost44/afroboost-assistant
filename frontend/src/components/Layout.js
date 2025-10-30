import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Mail, BarChart3, Calendar, Settings, CreditCard, Globe, Menu, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Layout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.contacts'), href: '/contacts', icon: Users },
    { name: t('nav.campaigns'), href: '/campaigns', icon: Mail },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
    { name: t('nav.analytics'), href: '/analytics', icon: BarChart3 },
    { name: t('nav.calendar'), href: '/calendar', icon: Calendar },
    { name: t('nav.admin'), href: '/admin', icon: Settings },
    { name: t('nav.pricing'), href: '/pricing', icon: CreditCard },
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto glass border-r border-primary/20">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <h1 className="text-2xl font-bold text-gradient" data-testid="app-logo">
                Afroboost Mailer
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-1" data-testid="sidebar-nav">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
                    className={
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? 'bg-primary text-white glow'
                          : 'text-gray-300 hover:bg-primary/20 hover:text-primary'
                      }`
                    }
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Language Selector */}
            <div className="px-4 mt-4">
              <Select value={i18n.language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-full" data-testid="language-selector">
                  <Globe className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr" data-testid="lang-fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en" data-testid="lang-en">🇬🇧 English</SelectItem>
                  <SelectItem value="de" data-testid="lang-de">🇩🇪 Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          variant="outline"
          size="icon"
          className="glass glow"
          data-testid="mobile-menu-button"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex" data-testid="mobile-sidebar">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full glass">
            <div className="flex flex-col flex-grow pt-20 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <h1 className="text-2xl font-bold text-gradient">
                  Afroboost Mailer
                </h1>
              </div>
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          isActive
                            ? 'bg-primary text-white glow'
                            : 'text-gray-300 hover:bg-primary/20 hover:text-primary'
                        }`
                      }
                    >
                      <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-4 mt-4">
                <Select value={i18n.language} onValueChange={changeLanguage}>
                  <SelectTrigger className="w-full">
                    <Globe className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
