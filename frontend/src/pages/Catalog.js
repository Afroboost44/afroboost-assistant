import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Eye, Package, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Catalog = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'course',
    price: '',
    currency: 'CHF',
    image_url: '',
    stock_quantity: '',
    max_attendees: '',
    event_date: '',
    event_duration: '',
    location: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API}/catalog?published_only=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le catalogue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        event_duration: formData.event_duration ? parseInt(formData.event_duration) : null,
      };

      const url = editingItem 
        ? `${API}/catalog/${editingItem.id}`
        : `${API}/catalog`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({
          title: "✅ Succès",
          description: editingItem ? "Article modifié" : "Article créé"
        });
        fetchItems();
        resetForm();
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'article",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      currency: item.currency,
      image_url: item.image_url || '',
      stock_quantity: item.stock_quantity?.toString() || '',
      max_attendees: item.max_attendees?.toString() || '',
      event_date: item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : '',
      event_duration: item.event_duration?.toString() || '',
      location: item.location || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const response = await fetch(`${API}/catalog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: "✅ Article supprimé" });
        fetchItems();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'course',
      price: '',
      currency: 'CHF',
      image_url: '',
      stock_quantity: '',
      max_attendees: '',
      event_date: '',
      event_duration: '',
      location: ''
    });
    setEditingItem(null);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'course': return <Calendar className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'product': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      course: 'Cours',
      event: 'Événement',
      product: 'Produit'
    };
    return labels[category] || category;
  };

  const filteredItems = filterCategory === 'all' 
    ? items 
    : items.filter(item => item.category === filterCategory);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">📦 Catalogue</h1>
          <p className="text-gray-400">Gérez vos produits, cours et événements</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer un article
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="course">Cours</SelectItem>
                <SelectItem value="event">Événements</SelectItem>
                <SelectItem value="product">Produits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card className="glass border-primary/20">
          <CardContent className="py-12 text-center text-gray-400">
            Aucun article dans le catalogue. Cliquez sur "Créer un article" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="glass border-primary/20 overflow-hidden">
              {item.image_url && (
                <div className="h-48 bg-muted overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-primary/30">
                        {getCategoryIcon(item.category)}
                        <span className="ml-1">{getCategoryLabel(item.category)}</span>
                      </Badge>
                      <Badge className={item.is_published ? 'bg-green-500' : 'bg-gray-500'}>
                        {item.is_published ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {item.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-primary">
                    {item.price} {item.currency}
                  </div>
                  {item.max_attendees && (
                    <div className="text-sm text-gray-400">
                      {item.current_attendees}/{item.max_attendees} places
                    </div>
                  )}
                </div>

                {item.event_date && (
                  <div className="text-sm text-gray-400 mb-4">
                    📅 {new Date(item.event_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    className="flex-1"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier l\'article' : 'Créer un article'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full min-h-[100px] p-3 rounded-md bg-background border border-primary/20 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Cours</SelectItem>
                    <SelectItem value="event">Événement</SelectItem>
                    <SelectItem value="product">Produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Prix *</Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHF">CHF</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="image_url">URL de l'image</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {formData.category === 'product' && (
              <div>
                <Label htmlFor="stock_quantity">Stock disponible</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="Laisser vide pour illimité"
                />
              </div>
            )}

            {(formData.category === 'course' || formData.category === 'event') && (
              <>
                <div>
                  <Label htmlFor="max_attendees">Nombre de places maximum</Label>
                  <Input
                    id="max_attendees"
                    type="number"
                    value={formData.max_attendees}
                    onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                    placeholder="Laisser vide pour illimité"
                  />
                </div>

                <div>
                  <Label htmlFor="event_date">Date et heure</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="event_duration">Durée (minutes)</Label>
                  <Input
                    id="event_duration"
                    type="number"
                    value={formData.event_duration}
                    onChange={(e) => setFormData({ ...formData, event_duration: e.target.value })}
                    placeholder="60"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Lieu</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Adresse ou Zoom/En ligne"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingItem ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Catalog;
