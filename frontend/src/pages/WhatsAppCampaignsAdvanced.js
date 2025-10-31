import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageCircle, Plus, Send, Sparkles, Edit, Trash2, 
  Calendar, Target, BarChart3, Image, Link as LinkIcon,
  Smile, Bold, Italic, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from 'emoji-picker-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppCampaignsAdvanced = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  // Form states
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    message_content: '',
    language: 'fr',
    buttons: [],
    list_sections: [],
    media_url: '',
    media_type: null,
    target_contacts: [],
    target_tags: [],
    target_status: null,
    use_personalization: false,
    scheduled_at: '',
    payment_links: []
  });
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'marketing',
    content: '',
    variables: [],
    language: 'fr',
    buttons: [],
    media_url: '',
    media_type: null
  });
  
  // Editor states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  
  // Button builder state
  const [currentButton, setCurrentButton] = useState({
    type: 'reply',
    text: '',
    id: '',
    url: '',
    phone_number: ''
  });

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    fetchContacts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setCampaignForm(prev => ({
      ...prev,
      message_content: prev.message_content + emojiObject.emoji
    }));
    setShowEmojiPicker(false);
  };

  const addButton = () => {
    if (!currentButton.text) {
      toast({
        title: "Erreur",
        description: "Le texte du bouton est requis",
        variant: "destructive"
      });
      return;
    }

    const newButton = { ...currentButton };
    if (currentButton.type === 'reply') {
      newButton.id = currentButton.text.toLowerCase().replace(/\s+/g, '_');
    }

    setCampaignForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, newButton]
    }));

    setCurrentButton({
      type: 'reply',
      text: '',
      id: '',
      url: '',
      phone_number: ''
    });

    toast({
      title: "✅ Bouton ajouté",
      description: "Le bouton a été ajouté à votre campagne"
    });
  };

  const removeButton = (index) => {
    setCampaignForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const createCampaign = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(campaignForm)
      });

      if (response.ok) {
        toast({
          title: "✅ Campagne créée",
          description: "Votre campagne a été créée avec succès"
        });
        setShowCreateDialog(false);
        fetchCampaigns();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne",
        variant: "destructive"
      });
    }
  };

  const sendCampaign = async (campaignId) => {
    try {
      const response = await fetch(`${API}/whatsapp/advanced-campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Campagne envoyée",
          description: `${data.contacts_targeted} contacts ciblés (MODE SIMULATION)`
        });
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la campagne",
        variant: "destructive"
      });
    }
  };

  const fetchAnalytics = async (campaignId) => {
    try {
      const response = await fetch(`${API}/whatsapp/campaigns/${campaignId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAnalytics(data);
      setShowAnalyticsDialog(true);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les analytics",
        variant: "destructive"
      });
    }
  };

  const createTemplate = async () => {
    try {
      const response = await fetch(`${API}/whatsapp/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(templateForm)
      });

      if (response.ok) {
        toast({
          title: "✅ Template créé",
          description: "Votre template a été sauvegardé"
        });
        setShowTemplateDialog(false);
        fetchTemplates();
        setTemplateForm({
          name: '',
          category: 'marketing',
          content: '',
          variables: [],
          language: 'fr',
          buttons: [],
          media_url: '',
          media_type: null
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le template",
        variant: "destructive"
      });
    }
  };

  const loadTemplate = (template) => {
    setCampaignForm(prev => ({
      ...prev,
      message_content: template.content,
      buttons: template.buttons,
      media_url: template.media_url,
      media_type: template.media_type
    }));
    toast({
      title: "✅ Template chargé",
      description: `Template "${template.name}" appliqué`
    });
  };

  const resetForm = () => {
    setCampaignForm({
      title: '',
      message_content: '',
      language: 'fr',
      buttons: [],
      list_sections: [],
      media_url: '',
      media_type: null,
      target_contacts: [],
      target_tags: [],
      target_status: null,
      use_personalization: false,
      scheduled_at: '',
      payment_links: []
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { color: 'bg-gray-500', label: 'Brouillon' },
      scheduled: { color: 'bg-blue-500', label: 'Programmé' },
      sending: { color: 'bg-yellow-500', label: 'Envoi...' },
      sent: { color: 'bg-green-500', label: 'Envoyé' },
      failed: { color: 'bg-red-500', label: 'Échoué' }
    };
    const { color, label } = config[status] || config.draft;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">💬 Campagnes WhatsApp Avancées</h1>
          <p className="text-gray-400">Créez des campagnes interactives avec boutons, médias et paiements</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowTemplateDialog(true)}
            variant="outline"
            className="border-primary/50"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-pink-500 to-purple-600">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Campagne
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Total Campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{campaigns.length}</div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {campaigns.filter(c => c.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Programmées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{templates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Aucune campagne WhatsApp. Créez-en une pour commencer !</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="glass border-primary/20 hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-gray-400 mb-4 line-clamp-2">{campaign.message_content}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {campaign.buttons && campaign.buttons.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {campaign.buttons.length} bouton(s)
                        </span>
                      )}
                      {campaign.media_url && (
                        <span className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          Média
                        </span>
                      )}
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateTime(campaign.scheduled_at)}
                        </span>
                      )}
                    </div>

                    {campaign.stats && campaign.status === 'sent' && (
                      <div className="mt-4 flex gap-6 text-sm">
                        <span className="text-green-500">✓ {campaign.stats.sent} envoyés</span>
                        <span className="text-blue-500">✓ {campaign.stats.delivered} livrés</span>
                        <span className="text-purple-500">✓ {campaign.stats.read} lus</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <Button
                        onClick={() => sendCampaign(campaign.id)}
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-purple-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === 'sent' && (
                      <Button
                        onClick={() => fetchAnalytics(campaign.id)}
                        size="sm"
                        variant="outline"
                        className="border-primary/50"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📱 Nouvelle Campagne WhatsApp</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Titre de la campagne *</Label>
                <Input
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({...campaignForm, title: e.target.value})}
                  placeholder="Ex: Promotion Printemps 2025"
                />
              </div>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <Label>Charger un template</Label>
                  <Select onValueChange={(value) => {
                    const template = templates.find(t => t.id === value);
                    if (template) loadTemplate(template);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Message Editor */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Message *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Preview
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={campaignForm.message_content}
                  onChange={(e) => setCampaignForm({...campaignForm, message_content: e.target.value})}
                  placeholder="Bonjour {{nom}}, nous avons une offre spéciale pour vous..."
                  rows={6}
                  className="font-mono"
                />

                {showEmojiPicker && (
                  <div className="mt-2">
                    <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" />
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  💡 Utilisez {'{{nom}}'}, {'{{prenom}}'} pour personnaliser vos messages
                </p>
              </div>

              {/* WhatsApp Preview */}
              {showPreview && campaignForm.message_content && (
                <div className="p-4 bg-gradient-to-br from-teal-900/20 to-green-900/20 rounded-lg border border-green-500/30">
                  <Label className="text-xs text-gray-400 mb-2 block">📱 Aperçu WhatsApp</Label>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                    <div className="text-sm whitespace-pre-wrap">{campaignForm.message_content}</div>
                    {campaignForm.buttons.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {campaignForm.buttons.map((btn, idx) => (
                          <div key={idx} className="bg-white/5 rounded px-3 py-2 text-center text-sm border border-white/20">
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Elements */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Éléments interactifs
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de bouton</Label>
                  <Select
                    value={currentButton.type}
                    onValueChange={(value) => setCurrentButton({...currentButton, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reply">Réponse rapide</SelectItem>
                      <SelectItem value="url">Lien URL</SelectItem>
                      <SelectItem value="call">Appel téléphonique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Texte du bouton</Label>
                  <Input
                    value={currentButton.text}
                    onChange={(e) => setCurrentButton({...currentButton, text: e.target.value})}
                    placeholder="Ex: En savoir plus"
                  />
                </div>

                {currentButton.type === 'url' && (
                  <div className="col-span-2">
                    <Label>URL</Label>
                    <Input
                      value={currentButton.url}
                      onChange={(e) => setCurrentButton({...currentButton, url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {currentButton.type === 'call' && (
                  <div className="col-span-2">
                    <Label>Numéro de téléphone</Label>
                    <Input
                      value={currentButton.phone_number}
                      onChange={(e) => setCurrentButton({...currentButton, phone_number: e.target.value})}
                      placeholder="+41 XX XXX XX XX"
                    />
                  </div>
                )}
              </div>

              <Button type="button" onClick={addButton} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter le bouton
              </Button>

              {campaignForm.buttons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Boutons ajoutés :</Label>
                  {campaignForm.buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">{btn.text} ({btn.type})</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeButton(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Targeting */}
            <div className="space-y-4 p-4 rounded-lg bg-background/50 border border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Ciblage
              </h3>

              <div>
                <Label>Statut des contacts</Label>
                <Select
                  value={campaignForm.target_status || ''}
                  onValueChange={(value) => setCampaignForm({...campaignForm, target_status: value || null})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contacts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Programmation (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm({...campaignForm, scheduled_at: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={createCampaign} className="bg-gradient-to-r from-pink-500 to-purple-600">
              Créer la campagne
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>✨ Gérer les Templates</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nom du template</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                placeholder="Ex: Bienvenue nouveau membre"
              />
            </div>

            <div>
              <Label>Catégorie</Label>
              <Select
                value={templateForm.category}
                onValueChange={(value) => setTemplateForm({...templateForm, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utility">Utilitaire</SelectItem>
                  <SelectItem value="transactional">Transactionnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contenu</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                placeholder="Bonjour {{nom}}, bienvenue chez Afroboost!"
                rows={5}
              />
            </div>

            <Button onClick={createTemplate} className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
              <Plus className="mr-2 h-4 w-4" />
              Sauvegarder le template
            </Button>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">Templates existants :</Label>
                {templates.map(template => (
                  <Card key={template.id} className="glass border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-gray-400 line-clamp-2">{template.content}</p>
                        </div>
                        <Badge className="bg-purple-500">{template.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      {analytics && (
        <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
          <DialogContent className="glass max-w-3xl">
            <DialogHeader>
              <DialogTitle>📊 Analytics de la Campagne</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{analytics.summary.sent}</div>
                    <div className="text-sm text-gray-400">Envoyés</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-500">{analytics.summary.delivered}</div>
                    <div className="text-sm text-gray-400">Livrés</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-purple-500">{analytics.summary.read}</div>
                    <div className="text-sm text-gray-400">Lus</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-yellow-500">{analytics.summary.replied}</div>
                    <div className="text-sm text-gray-400">Réponses</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-pink-500">{analytics.summary.clicked}</div>
                    <div className="text-sm text-gray-400">Clics</div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-500">{analytics.summary.payment_completed}</div>
                    <div className="text-sm text-gray-400">Paiements</div>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Rate */}
              <Card className="glass border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Taux d'engagement</span>
                    <span className="text-lg font-bold text-primary">
                      {analytics.summary.sent > 0
                        ? ((analytics.summary.read / analytics.summary.sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${analytics.summary.sent > 0
                          ? (analytics.summary.read / analytics.summary.sent) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WhatsAppCampaignsAdvanced;
