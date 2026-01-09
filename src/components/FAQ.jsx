import { HelpCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useState } from 'react';
import './FAQ.css';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      category: "Working Hours",
      questions: [
        {
          question: "What are the standard working hours in Portugal?",
          answer: "According to Portuguese labor law (Código do Trabalho), full-time employment is legally defined as 40 hours per week, typically distributed as 8 hours per day over a five-day workweek. This standard applies across various industries, though specific sectors may have different arrangements through collective bargaining agreements."
        },
        {
          question: "What is the maximum daily working time?",
          answer: "The standard daily working time is 8 hours per day. With overtime, employees can work up to 10 hours per day (8 regular hours + 2 hours overtime maximum). However, the total overtime is subject to annual limits."
        },
        {
          question: "What is Working Time Exemption (Isenção de Horário)?",
          answer: "The exemption from working hours (Article 218 of Código do Trabalho) provides greater flexibility in work schedule execution. It requires a written agreement between employee and employer. Workers with this exemption still maintain their rights to rest periods, weekly rest, mandatory holidays, and daily rest of at least 11 hours between working days."
        }
      ]
    },
    {
      category: "Overtime",
      questions: [
        {
          question: "How much overtime can I work?",
          answer: "The maximum overtime is limited to 2 hours per day. Annual caps are: 150 hours for companies with 50+ employees, 175 hours for smaller companies, and up to 200 hours in exceptional cases (force majeure or specific collective agreements)."
        },
        {
          question: "How is overtime compensated?",
          answer: "Overtime compensation rates:\n• First hour: 125% of regular rate\n• Additional hours: 137.5% of regular rate\n• Weekend/holiday overtime: 150% of regular rate\n\nEmployers must request overtime in advance, and employees can decline for extenuating circumstances."
        },
        {
          question: "When can employers request overtime?",
          answer: "Employers can only request overtime when there's a temporary increase in work or an indispensable need to prevent damage to the company. Overtime must be requested in advance, and employees have the right to decline for valid reasons."
        },
        {
          question: "What does 'Isenção' (Unpaid Extra Hours) mean in this app?",
          answer: "In this app, 'Isenção' refers to hours worked between 8-10 hours per day that may not receive overtime compensation if you have a Working Time Exemption agreement (Isenção de Horário). Hours beyond 10 per day are tracked as 'Paid Overtime' as they typically require additional compensation."
        }
      ]
    },
    {
      category: "Breaks & Rest Periods",
      questions: [
        {
          question: "What breaks am I entitled to during work?",
          answer: "For working periods exceeding 5 hours, employees are entitled to a break of between 1 hour and 2 hours. This break cannot be taken at the beginning or end of the working period and is commonly used for lunch."
        },
        {
          question: "What is the minimum daily rest period?",
          answer: "Employees are entitled to a minimum of 11 consecutive hours of rest between working days. This applies to all workers, including those with Working Time Exemption agreements."
        },
        {
          question: "What is the minimum weekly rest period?",
          answer: "Employees are entitled to a minimum of 24 consecutive hours of rest per week, typically taken on Sunday. This weekly rest period should ideally be added to the daily rest period of the preceding or following day, resulting in approximately 35 consecutive hours of rest."
        },
        {
          question: "Can I work during my lunch break?",
          answer: "No. The mandatory break after 5 hours of work (typically lunch) must be taken and cannot be worked through. This is a legal requirement under Portuguese labor law to ensure employee wellbeing."
        }
      ]
    },
    {
      category: "Weekend Work",
      questions: [
        {
          question: "Can I be required to work on weekends?",
          answer: "Weekend work (Saturday and Sunday) is generally subject to special rules and typically requires employee consent. It's compensated at 150% of the regular rate and should respect the weekly rest period of 24 consecutive hours."
        },
        {
          question: "How is weekend work compensated?",
          answer: "Weekend and public holiday work is paid at 150% of the regular rate. Some collective agreements or company policies may also grant additional benefits such as compensatory time off or bonuses, which can be tracked in this app's Weekend Work settings."
        },
        {
          question: "What are my rights if I work on Sunday?",
          answer: "If you work on Sunday (the typical weekly rest day), you should receive: overtime compensation at 150% rate, and an alternative rest day during the week to maintain your 24-hour weekly rest entitlement."
        }
      ]
    },
    {
      category: "Using This App",
      questions: [
        {
          question: "How does this app help me comply with Portuguese labor law?",
          answer: "This app helps you:\n• Track if you exceed 8 hours/day (regular hours limit)\n• Monitor daily overtime (max 2h/day)\n• Track total overtime to stay within annual limits (150-200h/year)\n• Record breaks and lunch periods\n• Calculate proper overtime compensation rates\n• Document weekend work and special compensation\n• Export reports for legal compliance records"
        },
        {
          question: "Why does the app separate 'Regular', 'Isenção', and 'Overwork' hours?",
          answer: "The app categorizes hours to align with Portuguese law:\n• Regular Hours (0-8h): Standard working time\n• Isenção/Unpaid Extra (8-10h): Hours that may not be compensated if you have Working Time Exemption\n• Paid Overwork (10h+): Hours typically requiring overtime compensation at higher rates\n\nThis helps you and your employer track compliance and proper compensation."
        },
        {
          question: "Should I track my lunch breaks in the app?",
          answer: "Yes! Tracking lunch breaks ensures compliance with the legal requirement for breaks after 5 hours of work. The app allows you to:\n• Mark when you took a lunch break\n• Record the duration (1-2 hours as per law)\n• Calculate actual working hours excluding breaks\n• Track lunch expenses if applicable"
        },
        {
          question: "How can I use the overwork tracking feature?",
          answer: "The overwork tracking helps you monitor accumulated overtime:\n• View total overtime hours (converted to work days: 8h = 1 day)\n• Track when overtime is used/compensated\n• Ensure you don't exceed annual limits (150-200h)\n• Record reasons for overtime usage\n• Maintain compliance documentation"
        }
      ]
    },
    {
      category: "Legal Compliance",
      questions: [
        {
          question: "Are employers required to track working hours?",
          answer: "Yes. Employers in Portugal have a legal obligation to maintain accurate records of employees' working hours. This is crucial for demonstrating compliance with maximum working hours, overtime limits, and rest period requirements. This app can serve as your personal tracking tool."
        },
        {
          question: "What should I do if I regularly exceed overtime limits?",
          answer: "If you regularly exceed the legal overtime limits (2h/day or 150-200h/year), you should:\n1. Document your hours (use this app for records)\n2. Discuss the situation with your employer\n3. Contact the Portuguese labor authority (ACT - Autoridade para as Condições do Trabalho)\n4. Seek advice from a labor union or employment lawyer"
        },
        {
          question: "Where can I find official information about Portuguese labor law?",
          answer: "Official sources for Portuguese labor law:\n• ACT (Autoridade para as Condições do Trabalho): https://www.act.gov.pt\n• Código do Trabalho (Labor Code): Available on ACT website\n• Ministry of Labor: https://www.mtsss.gov.pt\n• European Labor Authority: https://www.ela.europa.eu\n\nAlways consult official sources or legal professionals for specific legal advice."
        }
      ]
    }
  ];

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div className="header-content-faq">
          <BookOpen />
          <div>
            <h1>Frequent Questions</h1>
            <p>Portuguese Labor Law & App Usage</p>
          </div>
        </div>
      </div>

      <div className="faq-content">
        <div className="faq-intro">
          <HelpCircle className="intro-icon" />
          <div>
            <h2>About Portuguese Labor Law</h2>
            <p>
              This FAQ section provides information based on the Portuguese Labor Code (Código do Trabalho)
              and explains how this app helps you track compliance with working hours, overtime, breaks,
              and rest period regulations.
            </p>
            <p className="disclaimer">
              <strong>Disclaimer:</strong> This information is for general guidance only and does not constitute
              legal advice. For specific legal situations, please consult the official Portuguese Labor Code or
              seek advice from a qualified employment lawyer.
            </p>
          </div>
        </div>

        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex} className="faq-category">
            <h2 className="category-title">{category.category}</h2>
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
          <h3>Additional Resources</h3>
          <ul className="resources-list">
            <li>
              <a href="https://www.act.gov.pt" target="_blank" rel="noopener noreferrer">
                ACT - Autoridade para as Condições do Trabalho
              </a>
            </li>
            <li>
              <a href="https://portal.act.gov.pt/AnexosPDF/Legisla%C3%A7%C3%A3o%20nacional/C%C3%B3digo%20do%20trabalho.pdf" target="_blank" rel="noopener noreferrer">
                Código do Trabalho (Labor Code PDF)
              </a>
            </li>
            <li>
              <a href="https://www.mtsss.gov.pt" target="_blank" rel="noopener noreferrer">
                Ministry of Labor, Solidarity and Social Security
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
