import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useOpenRouter } from '../hooks/useOpenRouter';
import { getUserContext } from '../lib/userContextHelper';
import { OPENROUTER_DEFAULT_MODEL } from '../lib/openRouterConfig';
import { Bot, Crown, Send, AlertCircle, Settings, Loader } from 'lucide-react';
import './AIAdvisor.css';

export function AIAdvisor({ user, onNavigate }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [userContext, setUserContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
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

  const loadPremiumStatus = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const premium = settings.isPremium || false;
        setIsPremium(premium);

        if (premium) {
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
            disabled={!inputValue.trim() || isLoading || contextLoading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
