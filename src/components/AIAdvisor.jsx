import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useOpenRouter } from '../hooks/useOpenRouter';
import { getUserContext } from '../lib/userContextHelper';
import { OPENROUTER_DEFAULT_MODEL } from '../lib/openRouterConfig';
import { getCallStatus, checkAndResetCalls, initializeCalls } from '../lib/tokenManager';
import { ShoppingCart } from 'lucide-react';
import { Bot, Crown, Send, AlertCircle, Settings, Loader, BarChart3, TrendingUp, Clock } from 'lucide-react';
import './AIAdvisor.css';

// Helper function to format token count
function formatTokenCount(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function AIAdvisor({ user, onNavigate }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [userContext, setUserContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [callStatus, setCallStatus] = useState({ 
    callsAllocated: 0, 
    callsUsed: 0, 
    callsRemaining: 0, 
    packsRemaining: 0,
    totalAvailable: 0,
    totalTokensUsed: 0,
    callPacks: []
  });
  const [isPremiumAI, setIsPremiumAI] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef(null);
  const { sendMessage, isLoading, error } = useOpenRouter();

  useEffect(() => {
    loadPremiumStatus();
  }, [user]);

  useEffect(() => {
    if (isPremium && userContext && messages.length === 0) {
      // Initialize with welcome message
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AI Advisor. I have access to your time tracking data and can help you with questions about your work sessions, analytics, settings, or anything else you need assistance with. How can I help you today?'
      }]);
    }
  }, [isPremium, userContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debug effect to log call status
  useEffect(() => {
    if (isPremiumAI) {
      console.log('Premium AI user detected, call status:', callStatus);
    }
  }, [isPremiumAI, callStatus]);

  const loadPremiumStatus = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Admin email - full Premium AI access
      const ADMIN_EMAIL = 'merloproductions@gmail.com';
      const adminCheck = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(adminCheck);

      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const subscriptionPlan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();
        // Admin always has Premium AI access
        const premiumAI = adminCheck || subscriptionPlan === 'premium_ai';
        // Premium is true if user has any paid plan (including premium_ai), isPremium flag, or is admin
        const premium = adminCheck || settings.isPremium || premiumAI || subscriptionPlan === 'basic' || subscriptionPlan === 'pro';
        
        setIsPremium(premium);
        setIsPremiumAI(premiumAI);
        
        console.log('Premium status check:', { premium, premiumAI, subscriptionPlan, isAdmin: adminCheck });

        if (premium) {
          // Check and reset calls if needed (for Premium AI users)
          if (premiumAI) {
              // Admin gets unlimited calls but still tracks token usage for testing
            if (adminCheck) {
              // Load actual call status to show token usage, but display as unlimited
              try {
                const status = await getCallStatus(currentUser.uid);
                // Set to show unlimited but keep token tracking
                setCallStatus({ 
                  callsAllocated: 999999, 
                  callsUsed: status.callsUsed || 0, 
                  callsRemaining: 999999,
                  packsRemaining: 0,
                  totalAvailable: 999999,
                  totalTokensUsed: status.totalTokensUsed || 0,
                  callPacks: []
                });
              } catch (error) {
                // Fallback if error loading
                setCallStatus({ 
                  callsAllocated: 999999, 
                  callsUsed: 0, 
                  callsRemaining: 999999,
                  packsRemaining: 0,
                  totalAvailable: 999999,
                  totalTokensUsed: 0,
                  callPacks: []
                });
              }
            } else {
              try {
                await checkAndResetCalls(currentUser.uid);
                const status = await getCallStatus(currentUser.uid);
                console.log('Call status loaded:', status);
                setCallStatus(status);
                
                // If status shows 0 allocated, initialize calls
                if (status.callsAllocated === 0) {
                  console.log('Initializing calls for Premium AI user');
                  await initializeCalls(currentUser.uid);
                  const newStatus = await getCallStatus(currentUser.uid);
                  setCallStatus(newStatus);
                }
              } catch (error) {
                console.error('Error loading call status:', error);
                // Set default call status even on error
                setCallStatus({ 
                  callsAllocated: 75, 
                  callsUsed: 0, 
                  callsRemaining: 75,
                  packsRemaining: 0,
                  totalAvailable: 75,
                  totalTokensUsed: 0,
                  callPacks: []
                });
              }
            }
          }
          
          // Load user context for AI
          setContextLoading(true);
          try {
            const context = await getUserContext(currentUser.uid);
            setUserContext(context);
          } catch (error) {
            console.error('Error loading user context:', error);
          } finally {
            setContextLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to messages
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Prepare messages for API (include system context if available)
      const apiMessages = [];
      
      if (userContext) {
        apiMessages.push({
          role: 'system',
          content: userContext
        });
      }

      // Add conversation history (last 10 messages to avoid token limits)
      const recentMessages = newMessages.slice(-10);
      apiMessages.push(...recentMessages.map(m => ({
        role: m.role,
        content: m.content
      })));

      // Send to OpenRouter with default model (mistralai/mistral-large)
      // This model should work with your allowed providers (Mistral is in your allowed list)
      const response = await sendMessage(apiMessages);

      // Add AI response
      setMessages([...newMessages, { role: 'assistant', content: response }]);
      
      // Update call status after successful message (for Premium AI users)
      if (isPremiumAI) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const status = await getCallStatus(currentUser.uid);
            // For admin, keep unlimited calls display but update token count
            if (isAdmin) {
              setCallStatus({ 
                callsAllocated: 999999, 
                callsUsed: status.callsUsed || 0, 
                callsRemaining: 999999, 
                totalTokensUsed: status.totalTokensUsed || 0 
              });
            } else {
              setCallStatus(status);
            }
          } catch (error) {
            console.error('Error updating call status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message;
      if (errorMessage.includes('No allowed providers')) {
        errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
          `To fix this:\n` +
          `1. Go to https://openrouter.ai/settings/routing\n` +
          `2. Configure your default model (or enable Auto Router)\n` +
          `3. Ensure at least one provider is enabled/allowed for your default model\n` +
          `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
          `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
      } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
        // Call limit error - already formatted in useOpenRouter
        errorMessage = errorMessage;
      }
      
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Suggestion cards data
  const suggestionCards = [
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Analytics Insights',
      description: 'Get insights on your work patterns',
      prompt: 'Analyze my work patterns and provide insights on how I can improve my time management'
    },
    {
      id: 'patterns',
      icon: TrendingUp,
      title: 'Work Patterns',
      description: 'Discover your productivity trends',
      prompt: 'What are my work patterns and trends? Show me my most productive times and days'
    },
    {
      id: 'isenção',
      icon: Clock,
      title: 'Isenção & Overtime',
      description: 'Optimize your hours usage',
      prompt: 'How can I optimize my Isenção usage and overtime hours? Am I close to my annual limit?'
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Settings Review',
      description: 'Get recommendations for your settings',
      prompt: 'Review my current settings and suggest optimal thresholds for regular hours, Isenção, and other configurations'
    }
  ];

  const handleSuggestionClick = async (prompt) => {
    if (isLoading || contextLoading || !prompt.trim()) return;
    
    const userMessage = prompt.trim();
    setInputValue('');

    // Add user message to messages
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Prepare messages for API (include system context if available)
      const apiMessages = [];
      
      if (userContext) {
        apiMessages.push({
          role: 'system',
          content: userContext
        });
      }

      // Add conversation history (last 10 messages to avoid token limits)
      const recentMessages = newMessages.slice(-10);
      apiMessages.push(...recentMessages.map(m => ({
        role: m.role,
        content: m.content
      })));

      // Send to OpenRouter with default model (mistralai/mistral-large)
      const response = await sendMessage(apiMessages);

      // Add AI response
      setMessages([...newMessages, { role: 'assistant', content: response }]);
      
      // Update call status after successful message (for Premium AI users)
      if (isPremiumAI) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const status = await getCallStatus(currentUser.uid);
            // For admin, keep unlimited calls display but update token count
            if (isAdmin) {
              setCallStatus({ 
                callsAllocated: 999999, 
                callsUsed: status.callsUsed || 0, 
                callsRemaining: 999999, 
                totalTokensUsed: status.totalTokensUsed || 0 
              });
            } else {
              setCallStatus(status);
            }
          } catch (error) {
            console.error('Error updating call status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message;
      if (errorMessage.includes('No allowed providers')) {
        errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
          `To fix this:\n` +
          `1. Go to https://openrouter.ai/settings/routing\n` +
          `2. Configure your default model (or enable Auto Router)\n` +
          `3. Ensure at least one provider is enabled/allowed for your default model\n` +
          `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
          `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
      } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
        // Call limit error - already formatted in useOpenRouter
        errorMessage = errorMessage;
      }
      
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`
      }]);
    }
  };

  // Show cards only when conversation is empty (only welcome message)
  const showSuggestions = isPremium && !loading && !contextLoading && messages.length <= 1;

  if (loading) {
    return (
      <div className="ai-advisor-container">
        <div className="loading">Loading AI Advisor...</div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="ai-advisor-container">
        <div className="premium-gate">
          <div className="premium-gate-icon">
            <Crown />
          </div>
          <h2>Premium Feature</h2>
          <p>The AI Advisor is available to premium users only.</p>
          <div className="premium-features">
            <h3>Premium Benefits:</h3>
            <ul>
              <li>AI Assistant with access to your time tracking data</li>
              <li>Personalized advice and insights</li>
              <li>Help with analytics and settings</li>
              <li>General-purpose AI assistance</li>
            </ul>
          </div>
          <button
            className="upgrade-button"
            onClick={() => onNavigate && onNavigate('settings')}
          >
            <Settings />
            Go to Settings to Enable Premium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-advisor-container">
      <div className="ai-advisor-header">
        <div className="header-content">
          <Bot className="header-icon" />
          <div>
            <h1>AI Advisor</h1>
            <p>Your intelligent assistant for time tracking insights</p>
          </div>
        </div>
        {contextLoading && (
          <div className="context-loading">
            <Loader className="spinning" />
            <span>Loading your data...</span>
          </div>
        )}
      </div>

      {/* Suggestion Cards */}
      {showSuggestions && (
        <div className="suggestion-cards-container">
          {suggestionCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <button
                key={card.id}
                className="suggestion-card"
                onClick={() => handleSuggestionClick(card.prompt)}
                disabled={isLoading || contextLoading}
              >
                <div className="suggestion-card-icon">
                  <IconComponent size={24} />
                </div>
                <div className="suggestion-card-content">
                  <h3 className="suggestion-card-title">{card.title}</h3>
                  <p className="suggestion-card-description">{card.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                {message.role === 'assistant' && (
                  <div className="message-avatar">
                    <Bot size={20} />
                  </div>
                )}
                <div className="message-text">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-text loading-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="error-banner">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your time tracking, analytics, or general questions..."
            rows={1}
            disabled={isLoading || contextLoading}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || contextLoading || (isPremiumAI && callStatus.totalAvailable <= 0)}
          >
            <Send size={20} />
          </button>
        </div>
        {isPremiumAI && (
          <div className="call-counter-container">
            <div className="token-counter-small">
              {callStatus.callsAllocated >= 999999
                ? `Unlimited calls (Admin)${callStatus.totalTokensUsed > 0 ? ` • ${formatTokenCount(callStatus.totalTokensUsed)} tokens used` : ''}`
                : callStatus.totalAvailable !== undefined
                ? (() => {
                    const baseRemaining = callStatus.callsRemaining || 0;
                    const packsRemaining = callStatus.packsRemaining || 0;
                    const hasPacks = packsRemaining > 0;
                    const totalAvailable = callStatus.totalAvailable || 0;
                    
                    return (
                      <>
                        <span>
                          {totalAvailable}/{callStatus.callsAllocated + (hasPacks ? `+${packsRemaining}` : '')} calls
                          {hasPacks && ` (${baseRemaining} base + ${packsRemaining} packs)`}
                          {callStatus.totalTokensUsed > 0 && ` • ${formatTokenCount(callStatus.totalTokensUsed)} tokens used`}
                        </span>
                      </>
                    );
                  })()
                : callStatus.callsAllocated === 0 && !loading
                ? '75/75 calls remaining'
                : 'Loading...'}
            </div>
            {callStatus.callsAllocated < 999999 && (
              <button 
                className="buy-more-calls-button"
                onClick={() => onNavigate && onNavigate('call-pack-purchase')}
                title="Buy more AI calls"
              >
                <ShoppingCart size={14} />
                <span>Buy More</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
