import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChatPublic = () => {
  const { toast } = useToast();
  
  const [chatStarted, setChatStarted] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    phone: '',
    initial_message: ''
  });

  const handleStartChat = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/ad-chat/start`, {
        ad_id: 'demo-ad-' + Date.now(),
        ad_platform: 'facebook',
        ad_campaign_name: 'Test Campaign - BoostTribe',
        visitor_name: visitorInfo.name,
        visitor_email: visitorInfo.email,
        visitor_phone: visitorInfo.phone,
        initial_message: visitorInfo.initial_message
      });
      
      setChatId(response.data.id);
      setMessages(response.data.messages || []);
      setChatStarted(true);
      
      toast({
        title: '✅ Chat démarré',
        description: 'Bienvenue ! L\'IA va te répondre...'
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de démarrer le chat',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !chatId) return;
    
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/ad-chat/${chatId}/message`,
        {
          sender: 'visitor',
          content: currentMessage.trim()
        }
      );
      
      setMessages(response.data.messages || []);
      setCurrentMessage('');
      
      toast({
        title: '✅ Message envoyé',
        description: 'L\'IA est en train de répondre...'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!chatStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <Card className="glass border-primary/20 max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl text-center text-gradient">
              Chat BoostTribe
            </CardTitle>
            <Badge className="mx-auto bg-primary/20 text-primary">
              <MessageCircle className="mr-1 h-3 w-3" />
              Chat Intelligent avec IA
            </Badge>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartChat} className="space-y-4">
              <div>
                <Label>Ton nom *</Label>
                <Input
                  value={visitorInfo.name}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
                  placeholder="Ex: Marie Dupont"
                  required
                />
              </div>
              
              <div>
                <Label>Ton email *</Label>
                <Input
                  type="email"
                  value={visitorInfo.email}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
                  placeholder="marie@example.com"
                  required
                />
              </div>
              
              <div>
                <Label>Ton téléphone (optionnel)</Label>
                <Input
                  type="tel"
                  value={visitorInfo.phone}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, phone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                />
              </div>
              
              <div>
                <Label>Ta question *</Label>
                <textarea
                  value={visitorInfo.initial_message}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, initial_message: e.target.value })}
                  placeholder="Bonjour, j'aimerais en savoir plus sur vos cours..."
                  className="w-full bg-background border border-gray-700 rounded-md px-3 py-2 text-white min-h-[100px]"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Démarrage...' : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Démarrer le chat
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="glass border-primary/20 h-[80vh] flex flex-col">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Chat BoostTribe
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-400">
                En ligne
              </Badge>
            </div>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p>Aucun message pour le moment</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      msg.sender === 'visitor'
                        ? 'bg-primary text-white'
                        : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.sender === 'visitor' ? 'Toi' : '🤖 Assistant BoostTribe'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          
          {/* Input */}
          <CardContent className="border-t border-gray-700 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Écris ton message..."
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !currentMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 L'IA connaît le catalogue, les cartes cadeaux et les offres BoostTribe
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdChatPublic;
