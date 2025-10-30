import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Edit, Trash2, Save, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PricingManagement = () => {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    name_de: '',
    price: 0,
    currency: 'CHF',
    interval: 'month',
    features_fr: '',
    features_en: '',
    features_de: '',
    limits: {
      emails_per_month: 0,
      whatsapp_per_month: 0,
      contacts_max: 0,
      ai_enabled: false,
      whatsapp_enabled: false,
      multi_user: false
    },
    active: true,
    highlighted: false,
    order: 0
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/pricing-plans`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (plan) => {
    setCurrentPlan(plan);
    setFormData({
      name: plan.name,
      name_en: plan.name_en,
      name_de: plan.name_de,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features_fr: plan.features_fr.join('\\n'),
      features_en: plan.features_en.join('\\n'),
      features_de: plan.features_de.join('\\n'),
      limits: plan.limits,
      active: plan.active,
      highlighted: plan.highlighted,
      order: plan.order
    });
    setShowEditDialog(true);
  };

  const handleUpdatePlan = async () => {
    try {
      const payload = {
        ...formData,
        features_fr: formData.features_fr.split('\\n').filter(f => f.trim()),
        features_en: formData.features_en.split('\\n').filter(f => f.trim()),
        features_de: formData.features_de.split('\\n').filter(f => f.trim())
      };
      
      await axios.put(`${API}/pricing-plans/${currentPlan.id}`, payload);
      toast.success('Plan modifié avec succès');
      setShowEditDialog(false);
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-full\" data-testid=\"pricing-mgmt-loading\">
        <div className=\"text-2xl text-primary animate-pulse\">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\" data-testid=\"pricing-management-page\">
      <div>
        <h1 className=\"text-4xl font-bold mb-2\" data-testid=\"pricing-mgmt-title\">
          Gestion des Plans Tarifaires
        </h1>
        <p className=\"text-gray-400\">Modifiez les prix, features et limites de chaque plan</p>
      </div>

      <div className=\"grid gap-6 md:grid-cols-3\">
        {plans.map((plan, index) => (
          <Card key={plan.id} className=\"glass border-primary/20\" data-testid={`plan-card-${index}`}>
            <CardHeader>
              <div className=\"flex items-start justify-between\">
                <div>
                  <CardTitle className=\"text-2xl mb-2\">{plan.name}</CardTitle>
                  {plan.highlighted && (
                    <Badge className=\"bg-primary\">Recommandé</Badge>
                  )}
                </div>
                <div className=\"flex gap-2\">
                  <Button
                    size=\"sm\"
                    variant=\"ghost\"
                    onClick={() => openEditDialog(plan)}
                    data-testid={`edit-plan-${index}`}
                  >
                    <Edit className=\"h-4 w-4\" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                <div>
                  <p className=\"text-4xl font-bold text-gradient\">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price} ${plan.currency}`}
                  </p>
                  <p className=\"text-sm text-gray-400\">par {plan.interval === 'month' ? 'mois' : 'an'}</p>
                </div>

                <div>
                  <p className=\"text-sm font-semibold text-gray-300 mb-2\">Limites:</p>
                  <div className=\"space-y-1 text-sm text-gray-400\">
                    <p>• Emails: {plan.limits.emails_per_month === -1 ? 'Illimité' : plan.limits.emails_per_month}</p>
                    <p>• WhatsApp: {plan.limits.whatsapp_per_month === -1 ? 'Illimité' : plan.limits.whatsapp_per_month}</p>
                    <p>• Contacts: {plan.limits.contacts_max === -1 ? 'Illimité' : plan.limits.contacts_max}</p>
                  </div>
                </div>

                <div>
                  <p className=\"text-sm font-semibold text-gray-300 mb-2\">Features (FR):</p>
                  <ul className=\"space-y-1 text-sm text-gray-400\">
                    {plan.features_fr.slice(0, 3).map((feature, i) => (
                      <li key={i}>• {feature}</li>
                    ))}
                    {plan.features_fr.length > 3 && (
                      <li className=\"text-primary\">+ {plan.features_fr.length - 3} autres...</li>
                    )}
                  </ul>
                </div>

                <div className=\"flex items-center justify-between pt-2 border-t border-primary/20\">
                  <span className=\"text-sm text-gray-400\">Statut:</span>
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className=\"glass max-w-4xl max-h-[90vh] overflow-y-auto\" data-testid=\"edit-plan-dialog\">
          <DialogHeader>
            <DialogTitle className=\"flex items-center gap-2\">
              <DollarSign className=\"h-5 w-5 text-primary\" />
              Modifier le Plan: {currentPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className=\"space-y-6 py-4\">
            {/* Basic Info */}
            <div className=\"grid gap-4 md:grid-cols-3\">
              <div>
                <Label>Nom (FR)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid=\"name-fr-input\"
                />
              </div>
              <div>
                <Label>Nom (EN)</Label>
                <Input
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  data-testid=\"name-en-input\"
                />
              </div>
              <div>
                <Label>Nom (DE)</Label>
                <Input
                  value={formData.name_de}
                  onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                  data-testid=\"name-de-input\"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className=\"grid gap-4 md:grid-cols-3\">
              <div>
                <Label>Prix</Label>
                <Input
                  type=\"number\"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  data-testid=\"price-input\"
                />
              </div>
              <div>
                <Label>Devise</Label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  data-testid=\"currency-input\"
                />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type=\"number\"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  data-testid=\"order-input\"
                />
              </div>
            </div>

            {/* Limits */}
            <div>
              <Label className=\"text-lg font-semibold mb-3 block\">Limites (-1 = illimité)</Label>
              <div className=\"grid gap-4 md:grid-cols-3\">
                <div>
                  <Label>Emails/mois</Label>
                  <Input
                    type=\"number\"
                    value={formData.limits.emails_per_month}
                    onChange={(e) => setFormData({
                      ...formData,
                      limits: { ...formData.limits, emails_per_month: parseInt(e.target.value) }
                    })}
                    data-testid=\"emails-limit-input\"
                  />
                </div>
                <div>
                  <Label>WhatsApp/mois</Label>
                  <Input
                    type=\"number\"
                    value={formData.limits.whatsapp_per_month}
                    onChange={(e) => setFormData({
                      ...formData,
                      limits: { ...formData.limits, whatsapp_per_month: parseInt(e.target.value) }
                    })}
                    data-testid=\"whatsapp-limit-input\"
                  />
                </div>
                <div>
                  <Label>Contacts max</Label>
                  <Input
                    type=\"number\"
                    value={formData.limits.contacts_max}
                    onChange={(e) => setFormData({
                      ...formData,
                      limits: { ...formData.limits, contacts_max: parseInt(e.target.value) }
                    })}
                    data-testid=\"contacts-limit-input\"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className=\"text-lg font-semibold mb-3 block\">Features (une par ligne)</Label>
              <div className=\"grid gap-4 md:grid-cols-3\">
                <div>
                  <Label>Français</Label>
                  <Textarea
                    value={formData.features_fr}
                    onChange={(e) => setFormData({ ...formData, features_fr: e.target.value })}
                    rows={6}
                    data-testid=\"features-fr-input\"
                  />
                </div>
                <div>
                  <Label>English</Label>
                  <Textarea
                    value={formData.features_en}
                    onChange={(e) => setFormData({ ...formData, features_en: e.target.value })}
                    rows={6}
                    data-testid=\"features-en-input\"
                  />
                </div>
                <div>
                  <Label>Deutsch</Label>
                  <Textarea
                    value={formData.features_de}
                    onChange={(e) => setFormData({ ...formData, features_de: e.target.value })}
                    rows={6}
                    data-testid=\"features-de-input\"
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className=\"grid gap-4 md:grid-cols-3\">
              <div className=\"flex items-center space-x-2\">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  data-testid=\"active-switch\"
                />
                <Label>Plan actif</Label>
              </div>
              <div className=\"flex items-center space-x-2\">
                <Switch
                  checked={formData.highlighted}
                  onCheckedChange={(checked) => setFormData({ ...formData, highlighted: checked })}
                  data-testid=\"highlighted-switch\"
                />
                <Label>Recommandé</Label>
              </div>
              <div className=\"flex items-center space-x-2\">
                <Switch
                  checked={formData.limits.ai_enabled}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    limits: { ...formData.limits, ai_enabled: checked }
                  })}
                  data-testid=\"ai-switch\"
                />
                <Label>IA activée</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant=\"outline\" onClick={() => setShowEditDialog(false)}>
              <X className=\"mr-2 h-4 w-4\" />
              Annuler
            </Button>
            <Button
              onClick={handleUpdatePlan}
              className=\"bg-primary hover:bg-primary/90\"
              data-testid=\"save-plan-button\"
            >
              <Save className=\"mr-2 h-4 w-4\" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingManagement;
