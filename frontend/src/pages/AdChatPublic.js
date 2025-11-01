import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Sparkles, User, Bot } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChatPublic = () => {
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    
    // Optimistic UI update
    const tempMessage = {
      sender: 'visitor',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setCurrentMessage('');
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/ad-chat/${chatId}/message`,
        {
          sender: 'visitor',
          content: tempMessage.content
        }
      );
      
      setMessages(response.data.messages || []);
      
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-2 sm:p-4">
        <Card className="glass border-primary/20 w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Bienvenue sur BoostTribe ! 🎉</CardTitle>
            <p className="text-sm sm:text-base text-gray-400 mt-2">
              Discutez avec notre assistant intelligent
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartChat} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base">Votre nom *</Label>
                <Input
                  id="name"
                  value={visitorInfo.name}
                  onChange={(e) => setVisitorInfo({...visitorInfo, name: e.target.value})}
                  placeholder="Jean Dupont"
                  required
                  className="h-12 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-base">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={visitorInfo.email}
                  onChange={(e) => setVisitorInfo({...visitorInfo, email: e.target.value})}
                  placeholder="jean@example.com"
                  required
                  className="h-12 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-base">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={visitorInfo.phone}
                  onChange={(e) => setVisitorInfo({...visitorInfo, phone: e.target.value})}
                  placeholder="+41 79 123 45 67"
                  className="h-12 text-base"
                />
              </div>
              
              <div>
                <Label htmlFor="message" className="text-base">Votre message *</Label>
                <textarea
                  id="message"
                  value={visitorInfo.initial_message}
                  onChange={(e) => setVisitorInfo({...visitorInfo, initial_message: e.target.value})}
                  placeholder="Bonjour, je suis intéressé par..."
                  required
                  className="w-full bg-background border border-gray-700 rounded-md px-4 py-3 text-white min-h-[100px] text-base"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Démarrer la conversation'}
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-primary/20 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">Assistant BoostTribe</h1>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs sm:text-sm text-gray-400">En ligne</p>
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/50 hidden sm:inline-flex">
            IA Active
          </Badge>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%] ${msg.sender === 'visitor' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'visitor' 
                    ? 'bg-primary' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {msg.sender === 'visitor' ? (
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>
                
                <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                  msg.sender === 'visitor'
                    ? 'bg-primary text-white'
                    : 'bg-gray-800/80 text-gray-100 border border-gray-700/50'
                }`}>
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p className={`text-[10px] sm:text-xs mt-1 ${
                    msg.sender === 'visitor' ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-in fade-in">
              <div className="flex gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl px-4 py-3 flex items-center gap-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="bg-black/30 backdrop-blur-sm border-t border-primary/20 p-2 sm:p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg bg-gray-800/50 border-gray-700 focus:border-primary"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !currentMessage.trim()}
              className="h-12 sm:h-14 w-12 sm:w-14 p-0 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 flex-shrink-0"
            >
              <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdChatPublic;

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
