import { useState, useRef, useEffect, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, Loader, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useOpenRouter } from '../hooks/useOpenRouter';
import { getEnterpriseAIContext } from '../lib/enterpriseAIContext';
import { getEnterpriseMembersContext } from '../lib/enterpriseMembersContext';
import './EnterpriseAISection.css';

function downloadAsMd(content, index) {
  const d = new Date();
  const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  const filename = `enterprise-ai-response-${ts}-${index + 1}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const EnterpriseAISection = forwardRef(function EnterpriseAISection(
  { enterpriseId, members = [], triggerPrompt = null, onTriggerConsumed },
  ref
) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [membersContext, setMembersContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const enterpriseContext = useRef(null);
  const lastTriggerRef = useRef(null);

  const { sendMessageStreaming, isLoading } = useOpenRouter();

  useEffect(() => {
    if (enterpriseContext.current === null) {
      enterpriseContext.current = getEnterpriseAIContext();
    }
  }, []);

  useEffect(() => {
    if (expanded && enterpriseId && members.length > 0 && !membersContext && !contextLoading) {
      setContextLoading(true);
      getEnterpriseMembersContext(enterpriseId, members)
        .then((context) => {
          setMembersContext(context);
          setContextLoading(false);
        })
        .catch((error) => {
          console.error('Error loading members context:', error);
          setMembersContext('Error loading team data. Member data may not be available.');
          setContextLoading(false);
        });
    }
  }, [expanded, enterpriseId, members, membersContext, contextLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('enterprise.ai.welcome') }]);
    }
  }, [expanded, t]);

  useEffect(() => {
    const q = triggerPrompt?.trim();
    if (!q || isLoading) return;
    if (lastTriggerRef.current === q) return;
    lastTriggerRef.current = q;
    setExpanded(true);
    
    // Ensure members context is loaded before sending prompt
    const sendWithContext = async () => {
      if (enterpriseId && members.length > 0 && !membersContext && !contextLoading) {
        setContextLoading(true);
        try {
          const context = await getEnterpriseMembersContext(enterpriseId, members);
          setMembersContext(context);
          setContextLoading(false);
          // Send prompt after context is loaded, passing the context directly
          sendPrompt(q, context);
          onTriggerConsumed?.();
          lastTriggerRef.current = null;
        } catch (error) {
          console.error('Error loading members context:', error);
          const errorContext = 'Error loading team data. Member data may not be available.';
          setMembersContext(errorContext);
          setContextLoading(false);
          // Send prompt even if context load failed
          sendPrompt(q, errorContext);
          onTriggerConsumed?.();
          lastTriggerRef.current = null;
        }
      } else {
        // Context already loaded or not needed, send immediately
        sendPrompt(q);
        onTriggerConsumed?.();
        lastTriggerRef.current = null;
      }
    };
    
    sendWithContext();
  }, [triggerPrompt, isLoading, enterpriseId, members, membersContext, contextLoading]);

  const replacePlaceholderWith = (content) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === 'assistant' && last?.streaming) {
        next[next.length - 1] = { role: 'assistant', content, streaming: false };
        return next;
      }
      return prev;
    });
    setStreamingContent('');
  };

  const sendPrompt = async (prompt, contextOverride = null) => {
    if (!prompt?.trim() || isLoading) return;
    const userMessage = prompt.trim();
    setInputValue('');
    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', streaming: true },
    ];
    setMessages(newMessages);
    setStreamingContent('');

    const apiMessages = [];
    // Combine enterprise context (labor law) with members context (team data)
    let systemContext = '';
    if (enterpriseContext.current) {
      systemContext += enterpriseContext.current;
    }
    // Use contextOverride if provided (for trigger), otherwise use state
    const contextToUse = contextOverride !== null ? contextOverride : membersContext;
    if (contextToUse) {
      systemContext += '\n\n' + contextToUse;
    }
    if (systemContext) {
      apiMessages.push({ role: 'system', content: systemContext });
    }
    const conversationSoFar = [...messages, { role: 'user', content: userMessage }];
    const recent = conversationSoFar.slice(-10);
    apiMessages.push(...recent.map((m) => ({ role: m.role, content: m.content })));

    const onError = (err) =>
      replacePlaceholderWith(`**Erro:** ${err?.message || 'Unknown error'}\n\nVerifique as definições do OpenRouter e tente novamente.`);

    try {
      await sendMessageStreaming(apiMessages, {
        onChunk: (acc) => setStreamingContent(acc),
        onDone: ({ fullContent }) => replacePlaceholderWith(fullContent),
        onError,
      });
    } catch (e) {
      onError(e);
    }
  };

  const handleSend = () => sendPrompt(inputValue.trim());
  const handleSuggestion = (key) => sendPrompt(t(`enterprise.ai.suggestions.${key}`));

  const showSuggestions = expanded && messages.length <= 1 && !isLoading;

  return (
    <div ref={ref} className="enterprise-ai-card">
      <button
        type="button"
        className="enterprise-ai-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="enterprise-ai-header-left">
          <Bot className="enterprise-ai-icon" size={24} />
          <div>
            <h3 className="enterprise-ai-title">{t('enterprise.ai.title')}</h3>
            <p className="enterprise-ai-desc">{t('enterprise.ai.description')}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="enterprise-ai-chevron" size={22} />
        ) : (
          <ChevronDown className="enterprise-ai-chevron" size={22} />
        )}
      </button>

      {expanded && (
        <div className="enterprise-ai-body">
          {contextLoading && (
            <div style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              <Loader className="enterprise-ai-spin" size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
              {t('enterprise.ai.loadingData', { defaultValue: 'Loading team data...' })}
            </div>
          )}
          {showSuggestions && (
            <div className="enterprise-ai-suggestions">
              {['team', 'warnings', 'law'].map((key) => (
                <button
                  key={key}
                  type="button"
                  className="enterprise-ai-suggestion-btn"
                  onClick={() => handleSuggestion(key)}
                >
                  {t(`enterprise.ai.suggestions.${key}`)}
                </button>
              ))}
            </div>
          )}

          <div className="enterprise-ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`enterprise-ai-msg enterprise-ai-msg--${msg.role}`}>
                {msg.role === 'assistant' && <Bot className="enterprise-ai-msg-icon" size={18} />}
                <div className="enterprise-ai-msg-text">
                  {msg.role === 'assistant' ? (
                    msg.streaming ? (
                      (streamingContent || '').split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < (streamingContent || '').split('\n').length - 1 && <br />}
                        </span>
                      ))
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="enterprise-ai-markdown">
                          {msg.content}
                        </ReactMarkdown>
                        <div className="enterprise-ai-msg-actions">
                          <button
                            type="button"
                            className="enterprise-ai-download-md-btn"
                            onClick={() => downloadAsMd(msg.content, i)}
                            title={t('enterprise.ai.downloadMdTitle') || t('aiAdvisor.downloadMdTitle')}
                          >
                            <Download size={14} />
                            <span>{t('enterprise.ai.downloadMd') || t('aiAdvisor.downloadMd')}</span>
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="enterprise-ai-input-wrap">
            <textarea
              className="enterprise-ai-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('enterprise.ai.placeholder')}
              rows={2}
              disabled={isLoading}
            />
            <button
              type="button"
              className="enterprise-ai-send"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              title={t('enterprise.ai.send')}
            >
              {isLoading ? (
                <Loader className="enterprise-ai-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
