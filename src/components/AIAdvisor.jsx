import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useOpenRouter } from '../hooks/useOpenRouter';
import { getUserContext } from '../lib/userContextHelper';
import { OPENROUTER_DEFAULT_MODEL } from '../lib/openRouterConfig';
import { getCallStatus, checkAndResetCalls, initializeCalls } from '../lib/tokenManager';
import { ShoppingCart, Download } from 'lucide-react';
import { Bot, Crown, Send, AlertCircle, Settings, Loader, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

const LOADING_MESSAGE_KEYS = ['consultingHr', 'readingWorkLaw', 'analyzingData', 'preparingRecommendations', 'pleaseWait'];

function downloadAsMd(content, index) {
  const d = new Date();
  const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const filename = `ai-advisor-response-${ts}-${index + 1}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AIAdvisor({ user, onNavigate }) {
  const { t } = useTranslation();
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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef(null);
  const { sendMessageStreaming, isLoading, error } = useOpenRouter();

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGE_KEYS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    loadPremiumStatus();
  }, [user]);

  useEffect(() => {
    if (isPremium && userContext && messages.length === 0) {
      // Initialize with welcome message
      setMessages([{
        role: 'assistant',
        content: t('aiAdvisor.welcome')
      }]);
    }
  }, [isPremium, userContext, t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

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
        const premium = adminCheck || settings.isPremium || premiumAI || subscriptionPlan === 'basic' || subscriptionPlan === 'pro' || subscriptionPlan === 'enterprise';
        
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

    const newMessages = [...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: '', streaming: true }];
    setMessages(newMessages);
    setStreamingContent('');

    const apiMessages = [];
    if (userContext) {
      apiMessages.push({ role: 'system', content: userContext });
    }
    const conversationSoFar = [...messages, { role: 'user', content: userMessage }];
    const recentMessages = conversationSoFar.slice(-10);
    apiMessages.push(...recentMessages.map(m => ({ role: m.role, content: m.content })));

    const replacePlaceholderWith = (content, streaming = false) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && last?.streaming) {
          next[next.length - 1] = { role: 'assistant', content, streaming };
          return next;
        }
        return prev;
      });
      setStreamingContent('');
    };

    try {
      await sendMessageStreaming(apiMessages, {
        onChunk: (accumulated) => setStreamingContent(accumulated),
        onDone: ({ fullContent }) => {
          replacePlaceholderWith(fullContent, false);
          if (isPremiumAI) {
            const currentUser = auth.currentUser;
            if (currentUser) {
              getCallStatus(currentUser.uid).then((status) => {
                if (isAdmin) {
                  setCallStatus({ callsAllocated: 999999, callsUsed: status.callsUsed || 0, callsRemaining: 999999, totalTokensUsed: status.totalTokensUsed || 0 });
                } else {
                  setCallStatus(status);
                }
              }).catch((err) => console.error('Error updating call status:', err));
            }
          }
        },
        onError: (err) => {
          let errorMessage = err?.message || 'Unknown error';
          if (errorMessage.includes('No allowed providers')) {
            errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
              `To fix this:\n` +
              `1. Go to https://openrouter.ai/settings/routing\n` +
              `2. Configure your default model (or enable Auto Router)\n` +
              `3. Ensure at least one provider is enabled/allowed for your default model\n` +
              `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
              `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
          } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
            /* already formatted */
          }
          replacePlaceholderWith(`Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`, false);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('No allowed providers')) {
        errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
          `To fix this:\n` +
          `1. Go to https://openrouter.ai/settings/routing\n` +
          `2. Configure your default model (or enable Auto Router)\n` +
          `3. Ensure at least one provider is enabled/allowed for your default model\n` +
          `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
          `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
      } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
        /* already formatted */
      }
      replacePlaceholderWith(`Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`, false);
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
      title: t('aiAdvisor.suggestions.analyticsInsights.title'),
      description: t('aiAdvisor.suggestions.analyticsInsights.description'),
      prompt: t('aiAdvisor.suggestions.analyticsInsights.prompt')
    },
    {
      id: 'patterns',
      icon: TrendingUp,
      title: t('aiAdvisor.suggestions.workPatterns.title'),
      description: t('aiAdvisor.suggestions.workPatterns.description'),
      prompt: t('aiAdvisor.suggestions.workPatterns.prompt')
    },
    {
      id: 'isenção',
      icon: Clock,
      title: t('aiAdvisor.suggestions.isencaoOvertime.title'),
      description: t('aiAdvisor.suggestions.isencaoOvertime.description'),
      prompt: t('aiAdvisor.suggestions.isencaoOvertime.prompt')
    },
    {
      id: 'settings',
      icon: Settings,
      title: t('aiAdvisor.suggestions.settingsReview.title'),
      description: t('aiAdvisor.suggestions.settingsReview.description'),
      prompt: t('aiAdvisor.suggestions.settingsReview.prompt')
    }
  ];

  const handleSuggestionClick = async (prompt) => {
    if (isLoading || contextLoading || !prompt.trim()) return;

    const userMessage = prompt.trim();
    setInputValue('');

    const newMessages = [...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: '', streaming: true }];
    setMessages(newMessages);
    setStreamingContent('');

    const apiMessages = [];
    if (userContext) {
      apiMessages.push({ role: 'system', content: userContext });
    }
    const conversationSoFar = [...messages, { role: 'user', content: userMessage }];
    const recentMessages = conversationSoFar.slice(-10);
    apiMessages.push(...recentMessages.map(m => ({ role: m.role, content: m.content })));

    const replacePlaceholderWith = (content, streaming = false) => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && last?.streaming) {
          next[next.length - 1] = { role: 'assistant', content, streaming };
          return next;
        }
        return prev;
      });
      setStreamingContent('');
    };

    try {
      await sendMessageStreaming(apiMessages, {
        onChunk: (accumulated) => setStreamingContent(accumulated),
        onDone: ({ fullContent }) => {
          replacePlaceholderWith(fullContent, false);
          if (isPremiumAI) {
            const currentUser = auth.currentUser;
            if (currentUser) {
              getCallStatus(currentUser.uid).then((status) => {
                if (isAdmin) {
                  setCallStatus({ callsAllocated: 999999, callsUsed: status.callsUsed || 0, callsRemaining: 999999, totalTokensUsed: status.totalTokensUsed || 0 });
                } else {
                  setCallStatus(status);
                }
              }).catch((err) => console.error('Error updating call status:', err));
            }
          }
        },
        onError: (err) => {
          let errorMessage = err?.message || 'Unknown error';
          if (errorMessage.includes('No allowed providers')) {
            errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
              `To fix this:\n` +
              `1. Go to https://openrouter.ai/settings/routing\n` +
              `2. Configure your default model (or enable Auto Router)\n` +
              `3. Ensure at least one provider is enabled/allowed for your default model\n` +
              `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
              `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
          } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
            /* already formatted */
          }
          replacePlaceholderWith(`Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`, false);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('No allowed providers')) {
        errorMessage = `OpenRouter Routing Issue: No providers are enabled for your default model in your routing settings.\n\n` +
          `To fix this:\n` +
          `1. Go to https://openrouter.ai/settings/routing\n` +
          `2. Configure your default model (or enable Auto Router)\n` +
          `3. Ensure at least one provider is enabled/allowed for your default model\n` +
          `4. The app uses your OpenRouter default model (omitting the model parameter per API docs)\n\n` +
          `See: https://openrouter.ai/docs/api-reference/overview for details on using your default model.`;
      } else if (errorMessage.includes('calls') || errorMessage.includes('used all your')) {
        /* already formatted */
      }
      replacePlaceholderWith(`Sorry, I encountered an error:\n\n${errorMessage}\n\nPlease check your OpenRouter routing settings and try again.`, false);
    }
  };

  // Show cards only when conversation is empty (only welcome message)
  const showSuggestions = isPremium && !loading && !contextLoading && messages.length <= 1;

  if (loading) {
    return (
      <div className="ai-advisor-container">
        <div className="loading">{t('aiAdvisor.loading')}</div>
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
          <h2>{t('aiAdvisor.premiumFeature')}</h2>
          <p>{t('aiAdvisor.premiumOnly')}</p>
          <div className="premium-features">
            <h3>{t('aiAdvisor.premiumBenefits')}</h3>
            <ul>
              <li>{t('aiAdvisor.benefit1')}</li>
              <li>{t('aiAdvisor.benefit2')}</li>
              <li>{t('aiAdvisor.benefit3')}</li>
              <li>{t('aiAdvisor.benefit4')}</li>
            </ul>
          </div>
          <button
            className="upgrade-button"
            onClick={() => onNavigate && onNavigate('settings')}
          >
            <Settings />
            {t('aiAdvisor.goToSettings')}
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
            <h1>{t('aiAdvisor.title')}</h1>
            <p>{t('aiAdvisor.yourIntelligentAssistant')}</p>
          </div>
        </div>
        {contextLoading && (
          <div className="context-loading">
            <Loader className="spinning" />
            <span>{t('aiAdvisor.loadingData')}</span>
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
                  {message.role === 'assistant' ? (
                    message.streaming ? (
                      (streamingContent || '').split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < (streamingContent || '').split('\n').length - 1 && <br />}
                        </span>
                      ))
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-body">
                          {message.content}
                        </ReactMarkdown>
                        <div className="message-actions">
                          <button
                            type="button"
                            className="download-md-btn"
                            onClick={() => downloadAsMd(message.content, index)}
                            title={t('aiAdvisor.downloadMdTitle')}
                          >
                            <Download size={14} />
                            <span>{t('aiAdvisor.downloadMd')}</span>
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    (message.content || '').split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < (message.content || '').split('\n').length - 1 && <br />}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && !streamingContent && (
            <div className="message assistant">
              <div className="message-content">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-text loading-state">
                  <div className="loading-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                  <p className="loading-message">
                    {t(`aiAdvisor.loadingMessages.${LOADING_MESSAGE_KEYS[loadingMessageIndex]}`)}
                  </p>
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
            placeholder={t('aiAdvisor.placeholder')}
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
                ? `${t('aiAdvisor.calls.unlimited')}${callStatus.totalTokensUsed > 0 ? ` • ${formatTokenCount(callStatus.totalTokensUsed)} ${t('aiAdvisor.calls.tokensUsed')}` : ''}`
                : callStatus.totalAvailable !== undefined
                ? (() => {
                    const baseRemaining = callStatus.callsRemaining || 0;
                    const packsRemaining = callStatus.packsRemaining || 0;
                    const hasPacks = packsRemaining > 0;
                    const totalAvailable = callStatus.totalAvailable || 0;
                    
                    return (
                      <>
                        <span>
                          {totalAvailable}/{callStatus.callsAllocated + (hasPacks ? `+${packsRemaining}` : '')} {t('aiAdvisor.calls.remaining')}
                          {hasPacks && ` (${baseRemaining} base + ${packsRemaining} packs)`}
                          {callStatus.totalTokensUsed > 0 && ` • ${formatTokenCount(callStatus.totalTokensUsed)} ${t('aiAdvisor.calls.tokensUsed')}`}
                        </span>
                      </>
                    );
                  })()
                : callStatus.callsAllocated === 0 && !loading
                ? `75/75 ${t('aiAdvisor.calls.remaining')}`
                : t('common.loading')}
            </div>
            {callStatus.callsAllocated < 999999 && (
              <button 
                className="buy-more-calls-button"
                onClick={() => onNavigate && onNavigate('call-pack-purchase')}
                title={t('aiAdvisor.calls.buyMoreTitle')}
              >
                <ShoppingCart size={14} />
                <span>{t('aiAdvisor.calls.buyMore')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
