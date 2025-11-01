import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Link2, Gift, Mail, Copy, Check, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Referrals = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showRewardConfig, setShowRewardConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    referred_email: '',
    referred_name: ''
  });

  const [rewardConfig, setRewardConfig] = useState({
    referrer_reward_type: 'discount',
    referrer_reward_value: 10.0,
    referred_reward_type: 'discount',
    referred_reward_value: 10.0
  });

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/referrals/my-referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferrals(response.data);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/referrals/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/api/referrals`,
        {
          ...formData,
          ...rewardConfig
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: '✅ Invitation envoyée',
        description: `Invitation de parrainage envoyée à ${formData.referred_email}`
      });
      
      setShowInviteForm(false);
      setFormData({ referred_email: '', referred_name: '' });
      fetchReferrals();
      fetchStats();
    } catch (error) {
      console.error('Error creating referral:', error);
      toast({
        title: '❌ Erreur',
        description: error.response?.data?.detail || 'Impossible de créer l\'invitation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${stats?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: '✅ Lien copié',
      description: 'Le lien de parrainage a été copié dans le presse-papiers'
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', className: 'bg-yellow-500/20 text-yellow-400' },
      signed_up: { label: 'Inscrit', className: 'bg-blue-500/20 text-blue-400' },
      completed: { label: 'Complété', className: 'bg-green-500/20 text-green-400' },
      expired: { label: 'Expiré', className: 'bg-gray-500/20 text-gray-400' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getRewardText = (rewardType, rewardValue) => {
    if (rewardType === 'discount') {
      return `${rewardValue}% de réduction`;
    } else if (rewardType === 'credit') {
      return `${rewardValue} CHF de crédit`;
    } else if (rewardType === 'free_month') {
      return `${Math.floor(rewardValue)} mois gratuit${rewardValue > 1 ? 's' : ''}`;
    }
    return `Récompense: ${rewardValue}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Programme de Parrainage
          </h1>
          <p className="text-gray-400 mt-1">
            Invitez vos amis et gagnez des récompenses
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          <Mail className="mr-2 h-4 w-4" />
          Inviter un ami
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Parrainages</p>
                  <p className="text-3xl font-bold text-primary">{stats.total_referrals}</p>
                </div>
                <Users className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">En attente</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats.pending_referrals}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Complétés</p>
                  <p className="text-3xl font-bold text-green-400">{stats.completed_referrals}</p>
                </div>
                <Check className="h-8 w-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Récompenses</p>
                  <p className="text-3xl font-bold text-primary">{stats.total_rewards_earned} CHF</p>
                </div>
                <Gift className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral Link Card */}
      {stats && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Votre Lien de Parrainage
            </CardTitle>
            <CardDescription>
              Partagez ce lien avec vos amis pour qu'ils s'inscrivent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-background border border-gray-700 rounded-md px-4 py-3 font-mono text-sm">
                {window.location.origin}/register?ref={stats.referral_code}
              </div>
              <Button onClick={copyReferralLink}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Gift className="h-4 w-4" />
              <span>
                Vous recevrez {getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)} 
                {' '}et votre ami recevra {getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRewardConfig(!showRewardConfig)}
              className="w-full"
            >
              {showRewardConfig ? 'Masquer' : 'Configurer'} les récompenses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reward Configuration */}
      {showRewardConfig && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Configuration des Récompenses
            </CardTitle>
            <CardDescription>
              Définissez les récompenses pour vous et vos filleuls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Referrer Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">🎯 Votre récompense</h3>
                <div>
                  <Label>Type de récompense</Label>
                  <select
                    value={rewardConfig.referrer_reward_type}
                    onChange={(e) => setRewardConfig({...rewardConfig, referrer_reward_type: e.target.value})}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="discount">% de réduction</option>
                    <option value="credit">Crédit CHF</option>
                    <option value="free_month">Mois gratuit</option>
                  </select>
                </div>
                <div>
                  <Label>Valeur</Label>
                  <Input
                    type="number"
                    value={rewardConfig.referrer_reward_value}
                    onChange={(e) => setRewardConfig({...rewardConfig, referrer_reward_value: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)}
                  </p>
                </div>
              </div>

              {/* Referred Rewards */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">👥 Récompense de votre filleul</h3>
                <div>
                  <Label>Type de récompense</Label>
                  <select
                    value={rewardConfig.referred_reward_type}
                    onChange={(e) => setRewardConfig({...rewardConfig, referred_reward_type: e.target.value})}
                    className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="discount">% de réduction</option>
                    <option value="credit">Crédit CHF</option>
                    <option value="free_month">Mois gratuit</option>
                  </select>
                </div>
                <div>
                  <Label>Valeur</Label>
                  <Input
                    type="number"
                    value={rewardConfig.referred_reward_value}
                    onChange={(e) => setRewardConfig({...rewardConfig, referred_reward_value: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                💡 <strong>Aperçu :</strong> Lorsqu'un ami s'inscrit via votre lien, vous recevrez{' '}
                <strong>{getRewardText(rewardConfig.referrer_reward_type, rewardConfig.referrer_reward_value)}</strong>
                {' '}et il recevra <strong>{getRewardText(rewardConfig.referred_reward_type, rewardConfig.referred_reward_value)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle>Inviter un Ami</CardTitle>
            <CardDescription>
              Envoyez une invitation de parrainage par email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email du filleul *</Label>
                  <Input
                    type="email"
                    value={formData.referred_email}
                    onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })}
                    placeholder="ami@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>Nom du filleul (optionnel)</Label>
                  <Input
                    value={formData.referred_name}
                    onChange={(e) => setFormData({ ...formData, referred_name: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle>Mes Parrainages</CardTitle>
          <CardDescription>
            Liste de tous vos parrainages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Aucun parrainage pour le moment</p>
              <Button onClick={() => setShowInviteForm(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Inviter votre premier ami
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-background/50 border border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {referral.referred_name || referral.referred_email}
                      </p>
                      {referral.referred_name && (
                        <p className="text-sm text-gray-400">{referral.referred_email}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Invité le {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {referral.referrer_reward_applied && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <Gift className="mr-1 h-3 w-3" />
                        Récompense reçue
                      </Badge>
                    )}
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Referrals;
