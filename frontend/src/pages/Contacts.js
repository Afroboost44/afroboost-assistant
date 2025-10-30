import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Upload, Download, Search, Edit, Trash2, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contacts = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // Nouveau filtre
  const [selectedContacts, setSelectedContacts] = useState([]); // Sélection multiple
  const [showBulkMessageDialog, setShowBulkMessageDialog] = useState(false); // Dialog message groupé
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkChannel, setBulkChannel] = useState('email');
  const [contactsStats, setContactsStats] = useState(null); // Stats des contacts
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '', // Nouveau champ
    group: 'general',
    tags: '',
    active: true,
    subscription_status: 'non-subscriber', // Nouveau champ
    membership_type: '', // Nouveau champ
    notes: '' // Nouveau champ
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    fetchContactsStats();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery, selectedGroup, selectedStatus]);

  const fetchContactsStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contacts/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContactsStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(contact => contact.group === selectedGroup);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(contact => contact.subscription_status === selectedStatus);
    }

    setFilteredContacts(filtered);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };
      await axios.post(`${API}/contacts`, payload);
      toast.success('Contact ajouté avec succès');
      setShowAddDialog(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout du contact');
    }
  };

  const handleEditContact = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };
      await axios.put(`${API}/contacts/${currentContact.id}`, payload);
      toast.success('Contact mis à jour avec succès');
      setShowEditDialog(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Erreur lors de la mise à jour du contact');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce contact ?')) return;
    
    try {
      await axios.delete(`${API}/contacts/${contactId}`);
      toast.success('Contact supprimé avec succès');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Erreur lors de la suppression du contact');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/contacts/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${response.data.imported} contacts importés, ${response.data.duplicates} dupliqués ignorés`);
      fetchContacts();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast.error('Erreur lors de l\'importation');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/contacts/export/csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Contacts exportés avec succès');
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error('Erreur lors de l\'exportation');
    }
  };

  const openEditDialog = (contact) => {
    setCurrentContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      group: contact.group,
      tags: contact.tags.join(', '),
      active: contact.active
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      group: 'general',
      tags: '',
      active: true,
      subscription_status: 'non-subscriber',
      membership_type: '',
      notes: ''
    });
    setCurrentContact(null);
  };

  // Nouvelles fonctions pour la gestion avancée
  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleSendBulkMessage = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Aucun contact sélectionné');
      return;
    }

    if (!bulkMessage.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/contacts/bulk-message`,
        {
          contact_ids: selectedContacts,
          message: bulkMessage,
          channel: bulkChannel
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Message envoyé à ${selectedContacts.length} contact(s)`);
      setShowBulkMessageDialog(false);
      setBulkMessage('');
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error sending bulk message:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi des messages');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: 'Abonné', color: 'bg-green-500' },
      'non-subscriber': { label: 'Non abonné', color: 'bg-gray-500' },
      'trial': { label: 'Essai', color: 'bg-blue-500' },
      'expired': { label: 'Expiré', color: 'bg-red-500' }
    };
    const badge = badges[status] || badges['non-subscriber'];
    return (
      <Badge className={`${badge.color} text-white`}>
        {badge.label}
      </Badge>
    );
  };

  const groups = ['all', ...new Set(contacts.map(c => c.group))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="contacts-loading">
        <div className="text-2xl text-primary animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="contacts-title">{t('contacts.title')}</h1>
          <p className="text-gray-400">{contacts.length} contacts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-primary hover:bg-primary/90 glow"
            data-testid="add-contact-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('contacts.addContact')}
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            data-testid="import-contacts-button"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('contacts.importContacts')}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={contacts.length === 0}
            data-testid="export-contacts-button"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('contacts.exportContacts')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      {contactsStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gradient">{contactsStats.total}</div>
              <div className="text-sm text-gray-400">Total contacts</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{contactsStats.subscribers}</div>
              <div className="text-sm text-gray-400">Abonnés</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-500">{contactsStats.non_subscribers}</div>
              <div className="text-sm text-gray-400">Non abonnés</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{contactsStats.trial}</div>
              <div className="text-sm text-gray-400">Essai</div>
            </CardContent>
          </Card>
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{contactsStats.expired}</div>
              <div className="text-sm text-gray-400">Expirés</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="glass border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('contacts.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-contacts-input"
                />
              </div>
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-full md:w-48" data-testid="filter-group-select">
                <SelectValue placeholder={t('contacts.filterByGroup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="group-all">{t('contacts.allGroups')}</SelectItem>
                {groups.filter(g => g !== 'all').map(group => (
                  <SelectItem key={group} value={group} data-testid={`group-${group}`}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48" data-testid="filter-status-select">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Abonnés</SelectItem>
                <SelectItem value="non-subscriber">Non abonnés</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="expired">Expirés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedContacts.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <span className="text-sm">
                {selectedContacts.length} contact(s) sélectionné(s)
              </span>
              <Button
                onClick={() => setShowBulkMessageDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Envoyer un message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card className="glass border-primary/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="contacts-table">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('contacts.name')}</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('contacts.email')}</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Téléphone</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('contacts.group')}</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('contacts.tags')}</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">{t('contacts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr
                    key={contact.id}
                    className="border-b border-primary/10 hover:bg-muted/30 transition-colors"
                    data-testid={`contact-row-${index}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{contact.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{contact.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{contact.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant="outline" className="border-primary/30">{contact.group}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getStatusBadge(contact.subscription_status || 'non-subscriber')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{contact.tags.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(contact)}
                          data-testid={`edit-contact-${index}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-500 hover:text-red-400"
                          data-testid={`delete-contact-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-gray-400" data-testid="no-contacts-message">
                Aucun contact trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass" data-testid="add-contact-dialog">
          <DialogHeader>
            <DialogTitle>{t('contacts.addContact')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{t('contacts.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="add-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('contacts.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="add-email-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+41 XX XXX XX XX"
                  data-testid="add-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="subscription_status">Statut d'abonnement</Label>
                <Select
                  value={formData.subscription_status}
                  onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-subscriber">Non abonné</SelectItem>
                    <SelectItem value="active">Abonné actif</SelectItem>
                    <SelectItem value="trial">Essai gratuit</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="membership_type">Type d'abonnement</Label>
                <Input
                  id="membership_type"
                  value={formData.membership_type}
                  onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                  placeholder="Standard, Premium, VIP..."
                  data-testid="add-membership-input"
                />
              </div>
              <div>
                <Label htmlFor="group">{t('contacts.group')}</Label>
                <Input
                  id="group"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  data-testid="add-group-input"
                />
              </div>
              <div>
                <Label htmlFor="tags">{t('contacts.tags')} (séparés par virgule)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  data-testid="add-tags-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-add-contact">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass" data-testid="edit-contact-dialog">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditContact}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">{t('contacts.name')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="edit-name-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">{t('contacts.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="edit-email-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-group">{t('contacts.group')}</Label>
                <Input
                  id="edit-group"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  data-testid="edit-group-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">{t('contacts.tags')} (séparés par virgule)</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  data-testid="edit-tags-input"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                  data-testid="edit-active-checkbox"
                />
                <Label htmlFor="edit-active">{t('contacts.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="submit-edit-contact">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog open={showBulkMessageDialog} onOpenChange={setShowBulkMessageDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Envoyer un message à {selectedContacts.length} contact(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk-channel">Canal d'envoi</Label>
              <Select value={bulkChannel} onValueChange={setBulkChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bulk-message">Message</Label>
              <textarea
                id="bulk-message"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder="Votre message ici..."
                className="w-full min-h-[150px] p-3 rounded-md bg-background border border-primary/20 text-white"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowBulkMessageDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendBulkMessage} className="bg-primary hover:bg-primary/90">
              <MessageCircle className="mr-2 h-4 w-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
