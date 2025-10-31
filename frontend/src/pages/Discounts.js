import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Percent, Plus, Calendar, Tag, TrendingDown, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Discounts = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    currency: 'CHF',
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    usage_limit: '',
    per_user_limit: 1,
    minimum_purchase: '',
    applicable_to: [],
    target_contacts: [],
    target_tags: []
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/discounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiscounts(response.data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de charger les réductions',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: parseInt(formData.per_user_limit),
        minimum_purchase: formData.minimum_purchase ? parseFloat(formData.minimum_purchase) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (editingDiscount) {
        await axios.patch(
          `${API_URL}/api/discounts/${editingDiscount.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({
          title: '✅ Réduction mise à jour',
          description: 'La réduction a été mise à jour avec succès'
        });
      } else {
        await axios.post(
          `${API_URL}/api/discounts`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({
          title: '✅ Réduction créée',
          description: 'La réduction a été créée avec succès'
        });
      }
      
      setShowCreateForm(false);
      setEditingDiscount(null);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Impossible de sauvegarder la réduction',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      currency: discount.currency,
      name: discount.name,
      description: discount.description || '',
      start_date: new Date(discount.start_date).toISOString().split('T')[0],
      end_date: new Date(discount.end_date).toISOString().split('T')[0],
      usage_limit: discount.usage_limit?.toString() || '',
      per_user_limit: discount.per_user_limit,
      minimum_purchase: discount.minimum_purchase?.toString() || '',
      applicable_to: discount.applicable_to || [],
      target_contacts: discount.target_contacts || [],
      target_tags: discount.target_tags || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (discountId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réduction ?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/discounts/${discountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: '✅ Réduction supprimée',
        description: 'La réduction a été supprimée avec succès'
      });
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de supprimer la réduction',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      currency: 'CHF',
      name: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      usage_limit: '',
      per_user_limit: 1,
      minimum_purchase: '',
      applicable_to: [],
      target_contacts: [],
      target_tags: []
    });
  };

  const getStatusBadge = (discount) => {
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    
    if (!discount.is_active) {
      return <Badge className="bg-gray-500/20 text-gray-400">Désactivée</Badge>;
    }
    if (now < startDate) {
      return <Badge className="bg-blue-500/20 text-blue-400">À venir</Badge>;
    }
    if (now > endDate) {
      return <Badge className="bg-red-500/20 text-red-400">Expirée</Badge>;
    }
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return <Badge className="bg-orange-500/20 text-orange-400">Limite atteinte</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-8 w-8 text-primary" />
            Réductions Clients
          </h1>
          <p className="text-gray-400 mt-1">
            Gérez vos codes promo et réductions
          </p>
        </div>
        <Button onClick={() => { setShowCreateForm(!showCreateForm); setEditingDiscount(null); resetForm(); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Réduction
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle>{editingDiscount ? 'Modifier' : 'Créer'} une Réduction</CardTitle>
            <CardDescription>
              Configurez une réduction ou code promo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <Label>Code Promo * <span className="text-xs text-gray-400">(majuscules recommandées)</span></Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2024"
                    required
                  />
                </div>

                {/* Name */}
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Promotion d'été"
                    required
                  />
                </div>

                {/* Discount Type */}
                <div>
                  <Label>Type de réduction *</Label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                    required
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed_amount">Montant fixe</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <Label>Valeur *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '50.00'}
                      required
                    />
                    <div className="flex items-center justify-center bg-background border border-gray-700 rounded-md px-3 w-16">
                      {formData.discount_type === 'percentage' ? '%' : formData.currency}
                    </div>
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <Label>Date de début *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label>Date de fin *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                    required
                  />
                </div>

                {/* Usage Limit */}
                <div>
                  <Label>Limite d'utilisation totale</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>

                {/* Per User Limit */}
                <div>
                  <Label>Limite par utilisateur *</Label>
                  <Input
                    type="number"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                    min="1"
                    required
                  />
                </div>

                {/* Minimum Purchase */}
                <div className="md:col-span-2">
                  <Label>Montant minimum d'achat</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minimum_purchase}
                      onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                      placeholder="0.00"
                    />
                    <div className="flex items-center justify-center bg-background border border-gray-700 rounded-md px-3 min-w-16">
                      {formData.currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la promotion..."
                  rows={2}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  {loading ? 'Sauvegarde...' : (editingDiscount ? 'Mettre à jour' : 'Créer la Réduction')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreateForm(false); setEditingDiscount(null); resetForm(); }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Discounts List */}
      <div className="grid grid-cols-1 gap-4">
        {discounts.length === 0 ? (
          <Card className="glass border-primary/20">
            <CardContent className="py-12 text-center">
              <TrendingDown className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucune réduction pour le moment</p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer votre première réduction
              </Button>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => (
            <Card key={discount.id} className="glass border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{discount.name}</CardTitle>
                      {getStatusBadge(discount)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <code className="text-lg font-mono text-primary">{discount.code}</code>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(discount)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(discount.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Réduction</p>
                    <p className="text-lg font-semibold text-primary">
                      {discount.discount_type === 'percentage' 
                        ? `${discount.discount_value}%` 
                        : `${discount.discount_value} ${discount.currency}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Utilisations</p>
                    <p className="text-lg font-semibold">
                      {discount.usage_count} / {discount.usage_limit || '∞'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Début</p>
                    <p className="text-sm">{new Date(discount.start_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Fin</p>
                    <p className="text-sm">{new Date(discount.end_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                {discount.description && (
                  <p className="text-sm text-gray-300 mt-2">{discount.description}</p>
                )}
                {discount.minimum_purchase && (
                  <p className="text-xs text-gray-400 mt-2">
                    Achat minimum: {discount.minimum_purchase} {discount.currency}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Discounts;
