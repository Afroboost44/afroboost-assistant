import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Key, Save, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PaymentSettings = () => {
  const { toast } = useToast();
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState({
    stripe_secret: false,
    stripe_public: false,
    paypal: false
  });
  
  const [paymentConfig, setPaymentConfig] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: '',
    paypal_client_id: '',
    paypal_secret: ''
  });

  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/payment-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setPaymentConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/user/payment-config`,
        paymentConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: '✅ Configuration enregistrée',
        description: 'Vos clés API ont été sauvegardées en toute sécurité'
      });
    } catch (error) {
      console.error('Error saving payment config:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 7) + '•••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configuration des Paiements</h1>
          <p className="text-gray-400">Configurez vos clés API pour recevoir les paiements</p>
        </div>
      </div>

      {/* Stripe Configuration */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Stripe
          </CardTitle>
          <CardDescription>
            Configurez vos clés Stripe pour accepter les paiements par carte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="stripe_secret">Clé secrète Stripe (sk_...)</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_secret"
                type={showKeys.stripe_secret ? 'text' : 'password'}
                value={paymentConfig.stripe_secret_key}
                onChange={(e) => setPaymentConfig({...paymentConfig, stripe_secret_key: e.target.value})}
                placeholder="sk_live_..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, stripe_secret: !showKeys.stripe_secret})}
              >
                {showKeys.stripe_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Trouvez cette clé sur votre tableau de bord Stripe → Développeurs → Clés API
            </p>
          </div>

          <div>
            <Label htmlFor="stripe_public">Clé publique Stripe (pk_...)</Label>
            <div className="flex gap-2">
              <Input
                id="stripe_public"
                type={showKeys.stripe_public ? 'text' : 'password'}
                value={paymentConfig.stripe_publishable_key}
                onChange={(e) => setPaymentConfig({...paymentConfig, stripe_publishable_key: e.target.value})}
                placeholder="pk_live_..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, stripe_public: !showKeys.stripe_public})}
              >
                {showKeys.stripe_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              💡 <strong>Comment obtenir vos clés Stripe :</strong>
              <br />1. Connectez-vous sur <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="underline">dashboard.stripe.com</a>
              <br />2. Allez dans Développeurs → Clés API
              <br />3. Copiez vos clés (utilisez les clés de test pour commencer)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PayPal Configuration */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            PayPal (Optionnel)
          </CardTitle>
          <CardDescription>
            Configurez PayPal pour accepter les paiements PayPal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paypal_client">Client ID PayPal</Label>
            <Input
              id="paypal_client"
              type="text"
              value={paymentConfig.paypal_client_id}
              onChange={(e) => setPaymentConfig({...paymentConfig, paypal_client_id: e.target.value})}
              placeholder="AXXXxxxx..."
            />
          </div>

          <div>
            <Label htmlFor="paypal_secret">Secret PayPal</Label>
            <div className="flex gap-2">
              <Input
                id="paypal_secret"
                type={showKeys.paypal ? 'text' : 'password'}
                value={paymentConfig.paypal_secret}
                onChange={(e) => setPaymentConfig({...paymentConfig, paypal_secret: e.target.value})}
                placeholder="EXXXxxxx..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys({...showKeys, paypal: !showKeys.paypal})}
              >
                {showKeys.paypal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              ⚠️ <strong>PayPal est optionnel.</strong> Stripe suffit pour la plupart des utilisateurs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          size="lg"
        >
          {loading ? 'Enregistrement...' : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Enregistrer la configuration
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">🔒 Sécurité</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>✓ Vos clés API sont chiffrées et stockées en toute sécurité</li>
          <li>✓ Seul vous avez accès à vos clés</li>
          <li>✓ Elles ne sont jamais partagées avec d'autres utilisateurs</li>
          <li>✓ Utilisez les clés de test Stripe pour commencer (mode sandbox)</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentSettings;
