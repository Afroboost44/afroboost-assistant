import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, UserCheck, Star, ArrowLeft, Share2, Copy, Users } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdChat = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const groups = [
    { id: 'all', name: 'Tous', count: chats.length },
    { id: 'new', name: 'Nouveaux', count: chats.filter(c => c.status === 'new').length },
    { id: 'active', name: 'Actifs', count: chats.filter(c => c.status === 'active').length },
    { id: 'resolved', name: 'Résolus', count: chats.filter(c => c.status === 'resolved').length },
    { id: 'priority', name: 'Prioritaires', count: chats.filter(c => c.is_priority).length }
  ];

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ad-chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const loadChatDetails = async (chatId) => {
    try {
      const response = await axios.get(`${API_URL}/api/ad-chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedChat(response.data);
      setShowMobileChat(true);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/ad-chat/${selectedChat.id}/message`,
        {
          sender: 'agent',
          content: message.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSelectedChat(response.data);
      setMessage('');
      setChats(chats.map(c => c.id === selectedChat.id ? response.data : c));
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/chat-public/${user?.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: '✅ Lien copié',
      description: 'Lien public copié dans le presse-papier'
    });
  };

  const filteredChats = selectedGroup === 'all' 
    ? chats 
    : selectedGroup === 'priority'
    ? chats.filter(c => c.is_priority)
    : chats.filter(c => c.status === selectedGroup);

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">💬 Chat Publicités</h1>
        <Button onClick={copyPublicLink} variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Partager Chat Public
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100%-5rem)]">
        {/* Left Column - Groups (Hidden on mobile when chat selected) */}
        <Card className={`lg:col-span-3 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Groupes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex justify-between items-center ${
                  selectedGroup === group.id 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span>{group.name}</span>
                <Badge variant={selectedGroup === group.id ? 'secondary' : 'outline'}>
                  {group.count}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Middle Column - Chat List (Hidden on mobile when chat selected) */}
        <Card className={`lg:col-span-4 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
          <CardHeader>
            <CardTitle className="text-lg">Conversations ({filteredChats.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {filteredChats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune conversation</p>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => loadChatDetails(chat.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedChat?.id === chat.id
                      ? 'bg-primary/20 border-primary border-2'
                      : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="font-medium">{chat.visitor_name || 'Anonyme'}</span>
                    </div>
                    <Badge variant={chat.status === 'new' ? 'default' : 'outline'}>
                      {chat.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {chat.messages?.[chat.messages.length - 1]?.content || 'Pas de message'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {chat.is_priority && <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />}
                    <span className="text-xs text-gray-500">{chat.ad_platform}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column - Chat Details */}
        <Card className={`lg:col-span-5 ${showMobileChat ? 'block' : 'hidden lg:block'}`}>
          {selectedChat ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setShowMobileChat(false)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{selectedChat.visitor_name || 'Visiteur anonyme'}</CardTitle>
                      <p className="text-sm text-gray-400">{selectedChat.visitor_email || 'Email non fourni'}</p>
                    </div>
                  </div>
                  <Badge>{selectedChat.status}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                {/* Messages */}
                <div className="space-y-4 mb-4 max-h-[calc(100vh-24rem)] overflow-y-auto">
                  {selectedChat.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === 'visitor' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.sender === 'visitor'
                            ? 'bg-gray-800'
                            : 'bg-primary text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Votre réponse..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading || !message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdChat;
