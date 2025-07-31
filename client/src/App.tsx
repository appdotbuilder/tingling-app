
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { User, Chat, Message, FriendRequest, Status } from '../../server/src/schema';
import { 
  Menu, 
  UserPlus, 
  Home, 
  Bell, 
  Phone, 
  Camera, 
  Send, 
  Search,
  Settings,
  Plus,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageCircle,
  X,
  Users
} from 'lucide-react';

interface ChatWithUser extends Chat {
  otherUser: User;
  lastMessage?: Message;
  unreadCount?: number;
}

interface MessageWithSender extends Message {
  sender: User;
}

function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Current user and auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState<'home' | 'notifications' | 'calls' | 'status'>('home');
  const [currentView, setCurrentView] = useState<'chats' | 'chat' | 'profile' | 'add_friend' | 'search' | 'notifications' | 'calls' | 'status' | 'friends'>('chats');
  
  // Data state
  const [chats, setChats] = useState<ChatWithUser[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  
  // Chat state
  const [selectedChat, setSelectedChat] = useState<ChatWithUser | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  
  // Search and form states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [profileForm, setProfileForm] = useState({
    name: '',
    emoji: '😊',
    profile_picture_url: ''
  });
  
  // Status form
  const [statusForm, setStatusForm] = useState({
    content: '',
    media_url: '',
    media_type: 'text' as 'text' | 'image' | 'video',
    privacy: 'friends_only' as 'public' | 'friends_only'
  });
  
  // Call state
  const [incomingCall, setIncomingCall] = useState<{ caller: User; type: 'audio' | 'video' } | null>(null);
  const [activeCall, setActiveCall] = useState<{ user: User; type: 'audio' | 'video' } | null>(null);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Initialize demo user for testing
  useEffect(() => {
    const demoUser: User = {
      id: 'ting-demo',
      google_id: 'demo-google-id',
      name: 'Demo User',
      emoji: '🚀',
      profile_picture_url: null,
      call_status: 'online',
      created_at: new Date(),
      updated_at: new Date()
    };
    setCurrentUser(demoUser);
    setIsAuthenticated(true);
    setProfileForm({
      name: demoUser.name,
      emoji: demoUser.emoji,
      profile_picture_url: demoUser.profile_picture_url || ''
    });
  }, []);

  // Load data when authenticated
  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const [chatsData, friendsData, requestsData, statusesData] = await Promise.all([
        trpc.getUserChats.query(currentUser.id),
        trpc.getFriends.query(currentUser.id),
        trpc.getFriendRequests.query(currentUser.id),
        trpc.getFriendsStatuses.query(currentUser.id)
      ]);
      
      // Transform chats to include other user info
      const chatsWithUsers = chatsData.map(chat => ({
        ...chat,
        otherUser: {
          id: 'ting-friend',
          google_id: 'friend-google-id',
          name: 'Friend User',
          emoji: '👋',
          profile_picture_url: null,
          call_status: 'online' as const,
          created_at: new Date(),
          updated_at: new Date()
        },
        unreadCount: 0
      })) as ChatWithUser[];
      
      setChats(chatsWithUsers);
      setFriends(friendsData);
      setFriendRequests(requestsData);
      setStatuses(statusesData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser, loadUserData]);

  // Handle tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'home':
        setCurrentView('chats');
        break;
      case 'notifications':
        setCurrentView('notifications');
        break;
      case 'calls':
        setCurrentView('calls');
        break;
      case 'status':
        setCurrentView('status');
        break;
      default:
        setCurrentView('chats');
    }
  }, [activeTab]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await trpc.searchUsers.query(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !currentUser) return;
    
    try {
      const newMessage = await trpc.sendMessage.mutate({
        chat_id: selectedChat.id,
        sender_id: currentUser.id,
        content: messageInput.trim(),
        message_type: 'text'
      });
      
      const messageWithSender: MessageWithSender = {
        ...newMessage,
        sender: currentUser
      };
      
      setMessages(prev => [...prev, messageWithSender]);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle opening chat
  const handleOpenChat = async (chat: ChatWithUser) => {
    setSelectedChat(chat);
    setCurrentView('chat');
    
    try {
      const chatMessages = await trpc.getChatMessages.query({ chatId: chat.id });
      const messagesWithSenders = chatMessages.map(msg => ({
        ...msg,
        sender: msg.sender_id === currentUser?.id ? currentUser : chat.otherUser
      })) as MessageWithSender[];
      
      setMessages(messagesWithSenders);
      
      // Mark messages as read
      if (currentUser) {
        await trpc.markMessagesAsRead.mutate({
          chat_id: chat.id,
          user_id: currentUser.id
        });
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      await trpc.updateUser.mutate({
        id: currentUser.id,
        name: profileForm.name,
        emoji: profileForm.emoji,
        profile_picture_url: profileForm.profile_picture_url || null
      });
      
      setCurrentUser(prev => prev ? {
        ...prev,
        name: profileForm.name,
        emoji: profileForm.emoji,
        profile_picture_url: profileForm.profile_picture_url || null
      } : null);
      
      setShowProfileModal(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // Handle create status
  const handleCreateStatus = async () => {
    if (!currentUser) return;
    
    try {
      const newStatus = await trpc.createStatus.mutate({
        user_id: currentUser.id,
        content: statusForm.content || null,
        media_url: statusForm.media_url || null,
        media_type: statusForm.media_type,
        privacy: statusForm.privacy
      });
      
      setStatuses(prev => [newStatus, ...prev]);
      setStatusForm({
        content: '',
        media_url: '',
        media_type: 'text',
        privacy: 'friends_only'
      });
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to create status:', error);
    }
  };

  // Handle friend request
  const handleSendFriendRequest = async (receiverId: string) => {
    if (!currentUser) return;
    
    try {
      await trpc.sendFriendRequest.mutate({
        sender_id: currentUser.id,
        receiver_id: receiverId
      });
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  // Handle respond to friend request
  const handleRespondToRequest = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      await trpc.respondToFriendRequest.mutate({
        request_id: requestId,
        status
      });
      
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (status === 'accepted') {
        loadUserData();
      }
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
    }
  };

  // Start call
  const handleStartCall = (user: User, type: 'audio' | 'video') => {
    setActiveCall({ user, type });
    setShowCallModal(true);
    
    // Simulate incoming call for demo
    if (!incomingCall) {
      setIncomingCall({ caller: user, type });
    }
  };

  // End call
  const handleEndCall = () => {
    setActiveCall(null);
    setShowCallModal(false);
    setIncomingCall(null);
    setIsCallMuted(false);
    setIsVideoOff(false);
  };

  // Answer call
  const handleAnswerCall = () => {
    if (incomingCall) {
      setActiveCall({ user: incomingCall.caller, type: incomingCall.type });
      setIncomingCall(null);
      setShowCallModal(true);
    }
  };

  // Reject call
  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  // Start chat with friend
  const handleStartChatWithFriend = async (friend: User) => {
    if (!currentUser) return;
    
    try {
      const chat = await trpc.getOrCreateChat.mutate({
        user1Id: currentUser.id,
        user2Id: friend.id
      });
      
      const chatWithUser: ChatWithUser = {
        ...chat,
        otherUser: friend,
        unreadCount: 0
      };
      
      setShowFriendsModal(false);
      handleOpenChat(chatWithUser);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-rose-900 animate-gradient-x' 
          : 'bg-gradient-to-br from-sky-200 via-blue-200 to-blue-400 animate-gradient-x'
      }`}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="mb-8">
                <h1 className={`text-4xl font-black tracking-wider mb-2 animate-pulse ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  TINGLING
                </h1>
                <p className={`text-lg ${isDarkMode ? 'text-white/80' : 'text-slate-600'}`}>
                  Real-time messaging reimagined
                </p>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-rose-900 animate-gradient-x' 
        : 'bg-gradient-to-br from-sky-200 via-blue-200 to-blue-400 animate-gradient-x'
    }`}>
      {/* Top Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/10 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="backdrop-blur-lg bg-white/10 border-white/20">
              <div className="py-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Avatar className="w-12 h-12 ring-2 ring-white/30">
                    <AvatarImage src={currentUser?.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {currentUser?.emoji}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">{currentUser?.name}</p>
                    <p className="text-sm text-white/70">{currentUser?.id}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white hover:bg-white/20"
                    onClick={() => setShowProfileModal(true)}
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    Profile Settings
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white hover:bg-white/20"
                    onClick={() => setShowFriendsModal(true)}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Friends ({friends.length})
                  </Button>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white">Dark Mode</span>
                    <Switch 
                      checked={isDarkMode} 
                      onCheckedChange={setIsDarkMode}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className={`text-2xl font-black tracking-wider animate-pulse ${
            isDarkMode ? 'text-white' : 'text-slate-800'
          }`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            TINGLING
          </h1>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => setShowAddFriendModal(true)}
          >
            <UserPlus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20">
        {currentView === 'chats' && (
          <div className="p-4 space-y-4">
            {chats.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <p className="text-white/70 text-lg">No chats yet</p>
                <p className="text-white/50">Add friends to start messaging!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <Card 
                  key={chat.id} 
                  className="backdrop-blur-lg bg-white/10 border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                  onClick={() => handleOpenChat(chat)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 ring-2 ring-white/30">
                        <AvatarImage src={chat.otherUser.profile_picture_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                          {chat.otherUser.emoji}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white truncate">{chat.otherUser.name}</p>
                          {chat.unreadCount && chat.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">{chat.unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-white/70 truncate">
                          {chat.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {currentView === 'notifications' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Friend Requests</h2>
            {friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <p className="text-white/70 text-lg">No notifications</p>
                <p className="text-white/50">You're all caught up!</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <Card key={request.id} className="backdrop-blur-lg bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                            👤
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">Friend Request</p>
                          <p className="text-sm text-white/70">From {request.sender_id}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => handleRespondToRequest(request.id, 'accepted')}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondToRequest(request.id, 'rejected')}
                          className="border-white/30 text-white hover:bg-white/20"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {currentView === 'calls' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Calls</h2>
            <div className="text-center py-12">
              <Phone className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <p className="text-white/70 text-lg">No recent calls</p>
              <p className="text-white/50">Your call history will appear here</p>
            </div>
          </div>
        )}

        {currentView === 'status' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Status</h2>
              <Button 
                onClick={() => setShowStatusModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Status
              </Button>
            </div>
            
            {statuses.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <p className="text-white/70 text-lg">No status updates</p>
                <p className="text-white/50">Share your moments with friends!</p>
              </div>
            ) : (
              statuses.map((status) => (
                <Card key={status.id} className="backdrop-blur-lg bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 ring-2 ring-blue-500">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                          👤
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Status Update</p>
                        <p className="text-white/80">{status.content}</p>
                        <p className="text-xs text-white/60 mt-1">
                          {status.created_at.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {currentView === 'chat' && selectedChat && (
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Chat Header */}
            <div className="backdrop-blur-lg bg-white/10 border-b border-white/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={() => setCurrentView('chats')}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10 ring-2 ring-white/30">
                    <AvatarImage src={selectedChat.otherUser.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                      {selectedChat.otherUser.emoji}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">{selectedChat.otherUser.name}</p>
                    <p className="text-xs text-white/70">
                      {selectedChat.otherUser.call_status === 'online' ? 'Online' : 'Last seen recently'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={() => handleStartCall(selectedChat.otherUser, 'audio')}
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={() => handleStartCall(selectedChat.otherUser, 'video')}
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-lg ${
                    message.sender_id === currentUser?.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-500/50'
                      : 'backdrop-blur-lg bg-white/20 text-white border border-white/30'
                  }`}>
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_id === currentUser?.id ? 'text-white/80' : 'text-white/60'
                    }`}>
                      {message.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="backdrop-blur-lg bg-white/10 border-t border-white/20 p-4">
              <div className="flex space-x-2">
                <Input
                  value={messageInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 backdrop-blur-lg bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="icon"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-lg bg-white/10 border-t border-white/20">
        <div className="flex justify-around p-2">
          {[
            { key: 'home', icon: Home, label: 'Home' },
            { key: 'notifications', icon: Bell, label: 'Notifications', badge: friendRequests.length },
            { key: 'calls', icon: Phone, label: 'Calls' },
            { key: 'status', icon: Camera, label: 'Status' }
          ].map(({ key, icon: Icon, label, badge }) => (
            <Button
              key={key}
              variant="ghost"
              className={`flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-300 ${
                activeTab === key ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setActiveTab(key as 'home' | 'notifications' | 'calls' | 'status')}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {badge && badge > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Friends Modal */}
      <Dialog open={showFriendsModal} onOpenChange={setShowFriendsModal}>
        <DialogContent className="backdrop-blur-lg bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Friends ({friends.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-white/50" />
                <p className="text-white/70">No friends yet</p>
                <p className="text-white/50">Add some friends to get started!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                        {friend.emoji}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.name}</p>
                      <p className="text-sm text-white/70">{friend.id}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleStartChatWithFriend(friend)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="backdrop-blur-lg bg-black/90 border-white/20 text-white">
            <div className="text-center py-8">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={incomingCall.caller.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-2xl">
                    {incomingCall.caller.emoji}
                  </AvatarFallback>
                </Avatar>
              </Avatar>
              <h3 className="text-2xl font-semibold mb-2">{incomingCall.caller.name}</h3>
              <p className="text-white/70 mb-8">
                Incoming {incomingCall.type} call...
              </p>
              
              <div className="flex justify-center space-x-8">
                <Button
                  onClick={handleRejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
                <Button
                  onClick={handleAnswerCall}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-8 h-8" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="backdrop-blur-lg bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input value={currentUser?.id || ''} disabled className="mt-1 bg-white/5 border-white/20" />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={profileForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setProfileForm(prev => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Emoji</label>
              <Input 
                value={profileForm.emoji}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setProfileForm(prev => ({ ...prev, emoji: e.target.value }))
                }
                className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                maxLength={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Profile Picture URL</label>
              <Input 
                value={profileForm.profile_picture_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setProfileForm(prev => ({ ...prev, profile_picture_url: e.target.value }))
                }
                placeholder="https://..."
                className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <Button 
              onClick={handleUpdateProfile}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Friend Modal */}
      <Dialog open={showAddFriendModal} onOpenChange={setShowAddFriendModal}>
        <DialogContent className="backdrop-blur-lg bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input 
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search by ting-xxxx ID"
                className="flex-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
              <Button onClick={handleSearch} variant="outline" className="border-white/30 text-white hover:bg-white/20">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                        {user.emoji}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-white/70">{user.id}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleSendFriendRequest(user.id)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="backdrop-blur-lg bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Add Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={statusForm.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  setStatusForm(prev => ({ ...prev, content: e.target.value }))
                }
                placeholder="What's on your mind?"
                className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Media URL (optional)</label>
              <Input 
                value={statusForm.media_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setStatusForm(prev => ({ ...prev, media_url: e.target.value }))
                }
                placeholder="https://..."
                className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Media Type</label>
              <Select 
                value={statusForm.media_type || 'text'} 
                onValueChange={(value: 'text' | 'image' | 'video') => 
                  setStatusForm(prev => ({ ...prev, media_type: value }))
                }
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/30 text-white">
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Privacy</label>
              <Select 
                value={statusForm.privacy || 'friends_only'} 
                onValueChange={(value: 'public' | 'friends_only') => 
                  setStatusForm(prev => ({ ...prev, privacy: value }))
                }
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/30 text-white">
                  <SelectValue placeholder="Select privacy setting" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="friends_only">Friends Only</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleCreateStatus}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Share Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Modal */}
      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent className="backdrop-blur-lg bg-black/80 border-white/20 text-white max-w-full max-h-full h-screen w-screen">
          {activeCall && (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex items-center justify-center relative">
                {activeCall.type === 'video' ? (
                  <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Avatar className="w-32 h-32 mx-auto mb-4">
                          <AvatarImage src={activeCall.user.profile_picture_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-4xl">
                            {activeCall.user.emoji}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-2xl font-semibold">{activeCall.user.name}</p>
                        <p className="text-white/70">Video calling...</p>
                      </div>
                    </div>
                    
                    {/* Local video preview */}
                    <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg border-2 border-white/30">
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <Camera className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Avatar className="w-40 h-40 mx-auto mb-6">
                      <AvatarImage src={activeCall.user.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-6xl">
                        {activeCall.user.emoji}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-3xl font-semibold mb-2">{activeCall.user.name}</p>
                    <p className="text-white/70 text-lg">Audio calling...</p>
                  </div>
                )}
              </div>
              
              {/* Call Controls */}
              <div className="flex justify-center space-x-6 p-8">
                <Button
                  variant="outline"
                  size="icon"
                  className={`w-14 h-14 rounded-full border-2 ${
                    isCallMuted ? 'bg-red-500 border-red-500' : 'border-white/30 hover:bg-white/20'
                  }`}
                  onClick={() => setIsCallMuted(!isCallMuted)}
                >
                  {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                
                {activeCall.type === 'video' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className={`w-14 h-14 rounded-full border-2 ${
                      isVideoOff ? 'bg-red-500 border-red-500' : 'border-white/30 hover:bg-white/20'
                    }`}
                    onClick={() => setIsVideoOff(!isVideoOff)}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-red-500 border-red-500 hover:bg-red-600"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
