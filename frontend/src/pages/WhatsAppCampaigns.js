import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Send, Calendar, Sparkles, Trash2, Edit, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppCampaigns = () => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message_content: '',
    language: 'fr',
    scheduled_at: '',
    target_groups: [],
    target_tags: []
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/whatsapp/campaigns`);
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching WhatsApp campaigns:', error);
      toast.error('Erreur lors du chargement des campagnes WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        scheduled_at: formData.scheduled_at || null
      };
      await axios.post(`${API}/whatsapp/campaigns`, payload);
      toast.success('Campagne WhatsApp créée avec succès');
      setShowCreateDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating WhatsApp campaign:', error);
      toast.error('Erreur lors de la création de la campagne');
    }
  };

  const handleEditCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        scheduled_at: formData.scheduled_at || null
      };
      await axios.put(`${API}/whatsapp/campaigns/${currentCampaign.id}`, payload);
      toast.success('Campagne WhatsApp mise à jour avec succès');
      setShowEditDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating WhatsApp campaign:', error);
      toast.error('Erreur lors de la mise à jour de la campagne');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette campagne WhatsApp ?')) return;
    
    try {
      await axios.delete(`${API}/whatsapp/campaigns/${campaignId}`);
      toast.success('Campagne WhatsApp supprimée avec succès');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting WhatsApp campaign:', error);
      toast.error('Erreur lors de la suppression de la campagne');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Voulez-vous vraiment envoyer cette campagne WhatsApp maintenant ?')) return;
    
    try {
      await axios.post(`${API}/whatsapp/campaigns/${campaignId}/send`);
      toast.success('Campagne WhatsApp en cours d\'envoi');
      fetchCampaigns();
    } catch (error) {
      console.error('Error sending WhatsApp campaign:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de la campagne');
    }
  };

  const handleAIGenerate = async () => {
    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/ai/generate`, {
        prompt: aiPrompt,
        language: formData.language,
        tone: 'professional',
        type: 'whatsapp'
      });
      
      setFormData({ ...formData, message_content: response.data.content });
      toast.success('Message généré avec succès par l\'IA');
      setShowAIDialog(false);
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération');
    } finally {
      setAiLoading(false);
    }
  };

  const openEditDialog = (campaign) => {
    setCurrentCampaign(campaign);
    setFormData({
      title: campaign.title,
      message_content: campaign.message_content,
      language: campaign.language,
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
      target_groups: campaign.target_groups || [],
      target_tags: campaign.target_tags || []
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message_content: '',
      language: 'fr',
      scheduled_at: '',
      target_groups: [],
      target_tags: []
    });
    setCurrentCampaign(null);
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sending: 'default',
      sent: 'outline',
      failed: 'destructive'
    };
    const statusLabels = {
      draft: 'Brouillon',
      scheduled: 'Programmé',
      sending: 'En cours',
      sent: 'Envoyé',
      failed: 'Échec'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-full\" data-testid=\"whatsapp-campaigns-loading\">
        <div className=\"text-2xl text-primary animate-pulse\">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\" data-testid=\"whatsapp-campaigns-page\">
      {/* Header */}
      <div className=\"flex flex-col md:flex-row md:items-center md:justify-between gap-4\">
        <div>
          <h1 className=\"text-4xl font-bold mb-2 flex items-center gap-3\" data-testid=\"whatsapp-campaigns-title\">
            <MessageCircle className=\"h-10 w-10 text-primary\" />
            Campagnes WhatsApp
          </h1>
          <p className=\"text-gray-400\">{campaigns.length} campagnes WhatsApp</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className=\"bg-primary hover:bg-primary/90 glow\"
          data-testid=\"create-whatsapp-campaign-button\"
        >
          <Plus className=\"mr-2 h-4 w-4\" />
          Créer une campagne WhatsApp
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">
        {campaigns.map((campaign, index) => (
          <Card key={campaign.id} className=\"glass border-primary/20 hover:glow transition-all duration-300\" data-testid={`whatsapp-campaign-card-${index}`}>
            <CardContent className=\"pt-6\">
              <div className=\"space-y-4\">
                <div className=\"flex items-start justify-between\">
                  <div className=\"flex-1\">
                    <h3 className=\"font-bold text-lg text-white mb-1\">{campaign.title}</h3>
                    <p className=\"text-sm text-gray-400 line-clamp-2\">{campaign.message_content}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
                
                <div className=\"space-y-2 text-sm\">
                  <div className=\"flex justify-between text-gray-400\">
                    <span>Langue:</span>
                    <span className=\"text-white\">{campaign.language.toUpperCase()}</span>
                  </div>
                  {campaign.stats && (
                    <div className=\"flex justify-between text-gray-400\">
                      <span>Envoyés:</span>
                      <span className=\"text-primary font-medium\">{campaign.stats.sent || 0}</span>
                    </div>
                  )}
                  {campaign.stats && campaign.stats.sent > 0 && (
                    <>
                      <div className=\"flex justify-between text-gray-400\">
                        <span>Livrés:</span>
                        <span className=\"text-green-500 font-medium\">{campaign.stats.delivered || 0}</span>
                      </div>
                      <div className=\"flex justify-between text-gray-400\">
                        <span>Lus:</span>
                        <span className=\"text-blue-500 font-medium\">{campaign.stats.read || 0}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className=\"flex gap-2 pt-2\">
                  {campaign.status === 'draft' && (
                    <>
                      <Button
                        size=\"sm\"
                        onClick={() => openEditDialog(campaign)}
                        variant=\"outline\"
                        className=\"flex-1\"
                        data-testid={`edit-whatsapp-campaign-${index}`}
                      >
                        <Edit className=\"mr-1 h-3 w-3\" />
                        Modifier
                      </Button>
                      <Button
                        size=\"sm\"
                        onClick={() => handleSendCampaign(campaign.id)}
                        className=\"flex-1 bg-primary hover:bg-primary/90\"
                        data-testid={`send-whatsapp-campaign-${index}`}
                      >
                        <Send className=\"mr-1 h-3 w-3\" />
                        Envoyer
                      </Button>
                    </>
                  )}
                  {campaign.status !== 'sent' && campaign.status !== 'sending' && (
                    <Button
                      size=\"sm\"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      variant=\"ghost\"
                      className=\"text-red-500 hover:text-red-400\"
                      data-testid={`delete-whatsapp-campaign-${index}`}
                    >
                      <Trash2 className=\"h-4 w-4\" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card className=\"glass border-primary/20\">
          <CardContent className=\"py-12 text-center text-gray-400\" data-testid=\"no-whatsapp-campaigns-message\">
            Aucune campagne WhatsApp créée. Cliquez sur \"Créer une campagne WhatsApp\" pour commencer.
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className=\"glass max-w-2xl\" data-testid=\"create-whatsapp-campaign-dialog\">
          <DialogHeader>
            <DialogTitle className=\"flex items-center justify-between\">
              <span className=\"flex items-center gap-2\">
                <MessageCircle className=\"h-5 w-5 text-primary\" />
                Créer une campagne WhatsApp
              </span>
              <Button
                type=\"button\"
                variant=\"outline\"
                size=\"sm\"
                onClick={() => setShowAIDialog(true)}
                className=\"ml-auto\"
                data-testid=\"open-ai-dialog-whatsapp-button\"
              >
                <Sparkles className=\"mr-2 h-4 w-4\" />
                Utiliser l'IA
              </Button>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign}>
            <div className=\"space-y-4 py-4\">
              <div className=\"grid grid-cols-2 gap-4\">
                <div>
                  <Label htmlFor=\"title\">Titre de la campagne</Label>
                  <Input
                    id=\"title\"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid=\"create-whatsapp-title-input\"
                  />
                </div>
                <div>
                  <Label htmlFor=\"language\">Langue</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger data-testid=\"create-whatsapp-language-select\">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"fr\">Français</SelectItem>
                      <SelectItem value=\"en\">English</SelectItem>
                      <SelectItem value=\"de\">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor=\"message\">Message WhatsApp</Label>
                <Textarea
                  id=\"message\"
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  placeholder=\"Bonjour ! Découvrez nos nouveaux cours d'Afrobeat à Neuchâtel...\"
                  rows={6}
                  required
                  data-testid=\"create-whatsapp-message-input\"
                />
                <p className=\"text-xs text-gray-400 mt-1\">
                  Maximum 4096 caractères pour WhatsApp
                </p>
              </div>
              <div>
                <Label htmlFor=\"scheduled\">Programmer l'envoi (optionnel)</Label>
                <Input
                  id=\"scheduled\"
                  type=\"datetime-local\"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  data-testid=\"create-whatsapp-schedule-input\"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button type=\"submit\" className=\"bg-primary hover:bg-primary/90\" data-testid=\"submit-create-whatsapp-campaign\">
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog - Similar structure */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className=\"glass max-w-2xl\" data-testid=\"edit-whatsapp-campaign-dialog\">
          <DialogHeader>
            <DialogTitle className=\"flex items-center gap-2\">
              <MessageCircle className=\"h-5 w-5 text-primary\" />
              Modifier la campagne WhatsApp
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCampaign}>
            <div className=\"space-y-4 py-4\">
              <div className=\"grid grid-cols-2 gap-4\">
                <div>
                  <Label htmlFor=\"edit-title\">Titre</Label>
                  <Input
                    id=\"edit-title\"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid=\"edit-whatsapp-title-input\"
                  />
                </div>
                <div>
                  <Label htmlFor=\"edit-language\">Langue</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger data-testid=\"edit-whatsapp-language-select\">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"fr\">Français</SelectItem>
                      <SelectItem value=\"en\">English</SelectItem>
                      <SelectItem value=\"de\">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor=\"edit-message\">Message</Label>
                <Textarea
                  id=\"edit-message\"
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  rows={6}
                  required
                  data-testid=\"edit-whatsapp-message-input\"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type=\"button\" variant=\"outline\" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button type=\"submit\" className=\"bg-primary hover:bg-primary/90\" data-testid=\"submit-edit-whatsapp-campaign\">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className=\"glass\" data-testid=\"ai-generate-whatsapp-dialog\">
          <DialogHeader>
            <DialogTitle className=\"flex items-center\">
              <Sparkles className=\"mr-2 h-5 w-5 text-primary\" />
              Générer avec l'IA
            </DialogTitle>
          </DialogHeader>
          <div className=\"space-y-4 py-4\">
            <div>
              <Label htmlFor=\"ai-prompt\">Description du message</Label>
              <Textarea
                id=\"ai-prompt\"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder=\"Ex: Message WhatsApp pour promouvoir nos cours d'Afrobeat, ton énergique et invitant\"
                rows={4}
                data-testid=\"ai-whatsapp-prompt-input\"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type=\"button\" variant=\"outline\" onClick={() => setShowAIDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiPrompt || aiLoading}
              className=\"bg-primary hover:bg-primary/90\"
              data-testid=\"submit-ai-generate-whatsapp\"
            >
              {aiLoading ? (
                <span>Génération...</span>
              ) : (
                <>
                  <Sparkles className=\"mr-2 h-4 w-4\" />
                  Générer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppCampaigns;
