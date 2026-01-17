import { HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FAQ.css';

export function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const categoryNames = {
    "Working Hours": t('faq.categories.workingHours'),
    "Overtime": t('faq.categories.overtime'),
    "Breaks & Rest Periods": t('faq.categories.breaksRestPeriods'),
    "Weekend Work": t('faq.categories.weekendWork'),
    "Using This App": t('faq.categories.usingThisApp'),
    "Legal Compliance": t('faq.categories.legalCompliance')
  };

  // FAQ structure with translation keys
  const faqCategories = [
    {
      category: "Working Hours",
      questionKeys: ['q1', 'q2', 'q3']
    },
    {
      category: "Overtime",
      questionKeys: ['q1', 'q2', 'q3', 'q4', 'q5']
    },
    {
      category: "Breaks & Rest Periods",
      questionKeys: ['q1', 'q2', 'q3', 'q4']
    },
    {
      category: "Weekend Work",
      questionKeys: ['q1', 'q2', 'q3']
    },
    {
      category: "Using This App",
      questionKeys: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']
    },
    {
      category: "Legal Compliance",
      questionKeys: ['q1', 'q2', 'q3']
    }
  ];

  // Build FAQ data from translations
  const faqs = faqCategories.map(cat => ({
    category: cat.category,
    questions: cat.questionKeys.map(qKey => {
      const categoryKey = cat.category === "Working Hours" ? "workingHours" :
                          cat.category === "Overtime" ? "overtime" :
                          cat.category === "Breaks & Rest Periods" ? "breaksRestPeriods" :
                          cat.category === "Weekend Work" ? "weekendWork" :
                          cat.category === "Using This App" ? "usingThisApp" :
                          "legalCompliance";
      return {
        question: t(`faq.questions.${categoryKey}.${qKey}.question`),
        answer: t(`faq.questions.${categoryKey}.${qKey}.answer`)
      };
    })
  }));

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div className="header-content-faq">
          <BookOpen />
          <div>
            <h1>{t('faq.title')}</h1>
            <p>{t('faq.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="faq-content">
        <div className="faq-intro">
          <HelpCircle className="intro-icon" />
          <div>
            <h2>{t('faq.intro.title')}</h2>
            <p>
              {t('faq.intro.description')}
            </p>
            <p className="disclaimer">
              <strong>{t('faq.intro.disclaimer')}</strong>
            </p>
          </div>
        </div>

        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex} className="faq-category">
            <h2 className="category-title">{categoryNames[category.category] || category.category}</h2>
            <div className="questions-list">
              {category.questions.map((faq, questionIndex) => {
                const globalIndex = `${categoryIndex}-${questionIndex}`;
                const isOpen = openIndex === globalIndex;

                return (
                  <div key={questionIndex} className="faq-item">
                    <button
                      className={`faq-question ${isOpen ? 'open' : ''}`}
                      onClick={() => toggleQuestion(globalIndex)}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        {faq.answer.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="faq-footer">
          <h3>{t('faq.additionalResources')}</h3>
          <ul className="resources-list">
            <li>
              <a href="https://www.act.gov.pt" target="_blank" rel="noopener noreferrer">
                {t('faq.resources.act')}
              </a>
            </li>
            <li>
              <a href="https://portal.act.gov.pt/AnexosPDF/Legisla%C3%A7%C3%A3o%20nacional/C%C3%B3digo%20do%20trabalho.pdf" target="_blank" rel="noopener noreferrer">
                {t('faq.resources.laborCode')}
              </a>
            </li>
            <li>
              <a href="https://www.mtsss.gov.pt" target="_blank" rel="noopener noreferrer">
                {t('faq.resources.ministry')}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
