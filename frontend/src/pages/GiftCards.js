import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Gift, Plus, Calendar, User, Mail, CreditCard, Check, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const GiftCards = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'CHF',
    recipient_name: '',
    recipient_email: '',
    personal_message: '',
    sender_name: user?.name || '',
    sender_email: user?.email || '',
    expires_at: '',
    design_template: 'default',
    design_color: '#8B5CF6'
  });

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gift-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftCards(response.data);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de charger les cartes cadeaux',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Set expiration date (default 1 year from now if not set)
      const expiresAt = formData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      
      await axios.post(
        `${API_URL}/api/gift-cards`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
          expires_at: expiresAt
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: '✅ Carte cadeau créée',
        description: 'La carte cadeau a été créée avec succès'
      });
      
      setShowCreateForm(false);
      setFormData({
        amount: '',
        currency: 'CHF',
        recipient_name: '',
        recipient_email: '',
        personal_message: '',
        sender_name: user?.name || '',
        sender_email: user?.email || '',
        expires_at: '',
        design_template: 'default',
        design_color: '#8B5CF6'
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Impossible de créer la carte cadeau',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
      used: { label: 'Utilisée', className: 'bg-gray-500/20 text-gray-400' },
      expired: { label: 'Expirée', className: 'bg-red-500/20 text-red-400' },
      cancelled: { label: 'Annulée', className: 'bg-orange-500/20 text-orange-400' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            Cartes Cadeaux
          </h1>
          <p className="text-gray-400 mt-1">
            Créez et gérez vos cartes cadeaux personnalisées
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Carte Cadeau
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle>Créer une Carte Cadeau</CardTitle>
            <CardDescription>
              Offrez des services ou produits à vos clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <Label>Montant *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="100.00"
                      required
                    />
                    <Input
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-24"
                      required
                    />
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <Label>Date d'expiration</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-gray-400 mt-1">Par défaut: 1 an</p>
                </div>

                {/* Recipient Name */}
                <div>
                  <Label>Nom du destinataire *</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="Marie Dupont"
                    required
                  />
                </div>

                {/* Recipient Email */}
                <div>
                  <Label>Email du destinataire *</Label>
                  <Input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    placeholder="marie@example.com"
                    required
                  />
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <Label>Message personnel</Label>
                <Textarea
                  value={formData.personal_message}
                  onChange={(e) => setFormData({ ...formData, personal_message: e.target.value })}
                  placeholder="Joyeux anniversaire ! Profite de cette carte cadeau..."
                  rows={3}
                />
              </div>

              {/* Design Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Template</Label>
                  <select
                    value={formData.design_template}
                    onChange={(e) => setFormData({ ...formData, design_template: e.target.value })}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="default">Défaut</option>
                    <option value="birthday">Anniversaire</option>
                    <option value="christmas">Noël</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>

                <div>
                  <Label>Couleur</Label>
                  <Input
                    type="color"
                    value={formData.design_color}
                    onChange={(e) => setFormData({ ...formData, design_color: e.target.value })}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Gift className="mr-2 h-4 w-4" />
                  {loading ? 'Création...' : 'Créer la Carte Cadeau'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gift Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {giftCards.length === 0 ? (
          <Card className="glass border-primary/20 col-span-full">
            <CardContent className="py-12 text-center">
              <Gift className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucune carte cadeau pour le moment</p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer votre première carte
              </Button>
            </CardContent>
          </Card>
        ) : (
          giftCards.map((card) => (
            <Card
              key={card.id}
              className="glass border-primary/20 hover:border-primary/40 transition-colors"
              style={{ borderColor: card.design_color + '40' }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="h-5 w-5" style={{ color: card.design_color }} />
                      {card.amount} {card.currency}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Code: <span className="font-mono text-primary">{card.code}</span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(card.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{card.recipient_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{card.recipient_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Expire: {new Date(card.expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {card.remaining_balance !== null && card.remaining_balance !== card.amount && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span>Solde: {card.remaining_balance} {card.currency}</span>
                    </div>
                  )}
                </div>

                {card.personal_message && (
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 italic">
                      "{card.personal_message}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default GiftCards;
