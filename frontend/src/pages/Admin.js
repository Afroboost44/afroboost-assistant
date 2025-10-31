import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Settings, Key, Save, MessageCircle, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    openai_api_key: '',
    resend_api_key: '',
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: '',
    stripe_publishable_key: '',
    stripe_secret_key: '',
    bank_iban: '',
    bank_name: '',
    bank_currency: 'CHF',
    company_name: 'BoostTribe',
    sender_email: 'contact@boosttribe.com',
    sender_name: 'Coach Bassi'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setFormData({
        openai_api_key: response.data.openai_api_key || '',
        resend_api_key: response.data.resend_api_key || '',
        whatsapp_access_token: response.data.whatsapp_access_token || '',
        whatsapp_phone_number_id: response.data.whatsapp_phone_number_id || '',
        whatsapp_verify_token: response.data.whatsapp_verify_token || '',
        stripe_publishable_key: response.data.stripe_publishable_key || '',
        stripe_secret_key: response.data.stripe_secret_key || '',
        bank_iban: response.data.bank_iban || '',
        bank_name: response.data.bank_name || '',
        bank_currency: response.data.bank_currency || 'CHF',
        company_name: response.data.company_name || 'Afroboost',
        sender_email: response.data.sender_email || 'contact@afroboost.com',
        sender_name: response.data.sender_name || 'Coach Bassi'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success(t('admin.saved'));
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="admin-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="admin-title">{t('admin.title')}</h1>
          <p className="text-gray-400">Configuration complète de la plateforme</p>
        </div>
        <Button
          onClick={() => window.location.href = '/admin/pricing-plans'}
          className="bg-primary hover:bg-primary/90"
          data-testid="manage-pricing-button"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Gérer les plans tarifaires
        </Button>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="glass border border-primary/20" data-testid="admin-tabs">
          <TabsTrigger value="api" className="data-[state=active]:bg-primary" data-testid="tab-api">
            <Key className="mr-2 h-4 w-4" />
            Clés IA
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary" data-testid="tab-whatsapp">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="stripe" className="data-[state=active]:bg-primary" data-testid="tab-stripe">
            <CreditCard className="mr-2 h-4 w-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-primary" data-testid="tab-company">
            <Building2 className="mr-2 h-4 w-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary" data-testid="tab-settings">
            <Settings className="mr-2 h-4 w-4" />
            Général
          </TabsTrigger>
        </TabsList>

        {/* AI Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>Clés API Intelligence Artificielle</CardTitle>
              <CardDescription>
                Configuration des services IA pour la génération de contenu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="openai-key">Clé API OpenAI (GPT-4-Turbo)</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={formData.openai_api_key}
                  onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                  placeholder="sk-proj-..."
                  className="font-mono"
                  data-testid="openai-key-input"
                />
                <p className="text-sm text-gray-400">
                  Génération de contenu email et WhatsApp en FR/EN/DE
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend-key">Clé API Resend</Label>
                <Input
                  id="resend-key"
                  type="password"
                  value={formData.resend_api_key}
                  onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                  placeholder="re_..."
                  className="font-mono"
                  data-testid="resend-key-input"
                />
                <p className="text-sm text-gray-400">
                  Service d'envoi d'emails transactionnels
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">OpenAI</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      IA conversationnelle avec mémoire contextuelle
                    </p>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Obtenir une clé →
                    </a>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-primary/10">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2 text-white">Resend</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Emails HTML professionnels avec tracking
                    </p>
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Obtenir une clé →
                    </a>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                WhatsApp Business API
              </CardTitle>
              <CardDescription>
                Configuration officielle Meta pour campagnes WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">Access Token WhatsApp</Label>
                <Input
                  id="whatsapp-token"
                  type="password"
                  value={formData.whatsapp_access_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                  placeholder="EAAG..."
                  className="font-mono"
                  data-testid="whatsapp-token-input"
                />
                <p className="text-sm text-gray-400">
                  Token d'accès depuis Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone">Phone Number ID</Label>
                <Input
                  id="whatsapp-phone"
                  type="text"
                  value={formData.whatsapp_phone_number_id}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                  placeholder="123456789012345"
                  className="font-mono"
                  data-testid="whatsapp-phone-input"
                />
                <p className="text-sm text-gray-400">
                  ID du numéro de téléphone WhatsApp Business
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-verify">Verify Token (Webhook)</Label>
                <Input
                  id="whatsapp-verify"
                  type="text"
                  value={formData.whatsapp_verify_token}
                  onChange={(e) => setFormData({ ...formData, whatsapp_verify_token: e.target.value })}
                  placeholder="afroboost_verify_token"
                  className="font-mono"
                  data-testid="whatsapp-verify-input"
                />
                <p className="text-sm text-gray-400">
                  Token de vérification pour le webhook
                </p>
              </div>

              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 text-white">Configuration WhatsApp Business API</h3>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Créer un compte <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta Business</a></li>
                    <li>Ajouter une app WhatsApp Business</li>
                    <li>Obtenir l'Access Token depuis "Paramètres de l'app"</li>
                    <li>Copier le Phone Number ID</li>
                    <li>Configurer le webhook: <code className="text-xs bg-black/30 px-2 py-1 rounded">{BACKEND_URL}/api/whatsapp/webhook</code></li>
                    <li>Définir un verify token personnalisé</li>
                  </ol>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Paiements Stripe
              </CardTitle>
              <CardDescription>
                Configuration des abonnements et paiements sécurisés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="stripe-public">Publishable Key</Label>
                <Input
                  id="stripe-public"
                  type="text"
                  value={formData.stripe_publishable_key}
                  onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                  placeholder="pk_live_..."
                  className="font-mono"
                  data-testid="stripe-public-input"
                />
                <p className="text-sm text-gray-400">
                  Clé publique pour le frontend
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-secret">Secret Key</Label>
                <Input
                  id="stripe-secret"
                  type="password"
                  value={formData.stripe_secret_key}
                  onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                  placeholder="sk_live_..."
                  className="font-mono"
                  data-testid="stripe-secret-input"
                />
                <p className="text-sm text-gray-400">
                  Clé secrète pour le backend (ne jamais exposer)
                </p>
              </div>

              <Card className="bg-muted/30 border-primary/10">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 text-white">Stripe</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Plateforme de paiement sécurisée pour abonnements
                  </p>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Obtenir les clés API →
                  </a>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company/Bank Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Informations bancaires
              </CardTitle>
              <CardDescription>
                Coordonnées pour les virements et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bank-iban">IBAN</Label>
                <Input
                  id="bank-iban"
                  type="text"
                  value={formData.bank_iban}
                  onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                  className="font-mono"
                  data-testid="bank-iban-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Nom de la banque</Label>
                  <Input
                    id="bank-name"
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="UBS Switzerland AG"
                    data-testid="bank-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-currency">Devise</Label>
                  <Input
                    id="bank-currency"
                    type="text"
                    value={formData.bank_currency}
                    onChange={(e) => setFormData({ ...formData, bank_currency: e.target.value })}
                    placeholder="CHF"
                    data-testid="bank-currency-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Informations d'entreprise et expéditeur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nom de l'entreprise</Label>
                <Input
                  id="company-name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  data-testid="company-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-name">Nom expéditeur</Label>
                <Input
                  id="sender-name"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Coach Bassi"
                  data-testid="sender-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-email">Email expéditeur</Label>
                <Input
                  id="sender-email"
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  placeholder="contact@afroboost.com"
                  data-testid="sender-email-input"
                />
                <p className="text-sm text-gray-400">
                  Doit être vérifié dans Resend
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 glow"
          size="lg"
          data-testid="save-settings-button"
        >
          {saving ? (
            <span>Enregistrement...</span>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Enregistrer tous les paramètres
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Admin;
