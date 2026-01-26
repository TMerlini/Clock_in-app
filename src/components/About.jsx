import { Clock, Coffee, AlertTriangle, DollarSign, TrendingUp, Calendar, BarChart3, Info, UtensilsCrossed, MapPin, Globe, Bot, Crown, Building2, Users, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './About.css';

export function About() {
  const { t } = useTranslation();
  return (
    <div className="about-container">
      <div className="about-header">
        <img src="/images/Clock in Logo White.webp" alt="Clock In Logo" className="about-logo-img" />
        <h1>{t('about.title')}</h1>
        <p className="about-subtitle">{t('about.subtitle')}</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <div className="section-header">
            <Info />
            <h2>{t('about.aboutThisApp.title')}</h2>
          </div>
          <p>
            {t('about.aboutThisApp.paragraph1')}
          </p>
          <p>
            {t('about.aboutThisApp.paragraph2')}
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Clock />
            <h2>{t('about.howItWorks.title')}</h2>
          </div>
          <div className="how-it-works">
            <div className="work-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{t('about.howItWorks.step1.title')}</h3>
                <p>{t('about.howItWorks.step1.description')}</p>
              </div>
            </div>
            <div className="work-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{t('about.howItWorks.step2.title')}</h3>
                <p>{t('about.howItWorks.step2.description')}</p>
              </div>
            </div>
            <div className="work-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{t('about.howItWorks.step3.title')}</h3>
                <p>{t('about.howItWorks.step3.description')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <TrendingUp />
            <h2>{t('about.hourCategories.title')}</h2>
          </div>
          <div className="categories">
            <div className="category-card regular">
              <div className="category-icon">
                <TrendingUp />
              </div>
              <div className="category-content">
                <h3>{t('about.hourCategories.regularHours.title')}</h3>
                <p>{t('about.hourCategories.regularHours.description')}</p>
              </div>
            </div>

            <div className="category-card unpaid">
              <div className="category-icon">
                <AlertTriangle />
              </div>
              <div className="category-content">
                <h3>{t('about.hourCategories.isencao.title')}</h3>
                <p>{t('about.hourCategories.isencao.description')}</p>
              </div>
            </div>

            <div className="category-card overtime">
              <div className="category-icon">
                <DollarSign />
              </div>
              <div className="category-content">
                <h3>{t('about.hourCategories.overwork.title')}</h3>
                <p>{t('about.hourCategories.overwork.description')}</p>
              </div>
            </div>

            <div className="category-card lunch">
              <div className="category-icon">
                <Coffee />
              </div>
              <div className="category-content">
                <h3>{t('about.hourCategories.lunch.title')}</h3>
                <p>{t('about.hourCategories.lunch.description')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Calendar />
            <h2>{t('about.keyFeatures.title')}</h2>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <Clock />
              <div>
                <strong>{t('about.keyFeatures.realTimeTracking.title')}</strong>
                <p>{t('about.keyFeatures.realTimeTracking.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <Calendar />
              <div>
                <strong>{t('about.keyFeatures.interactiveCalendar.title')}</strong>
                <p>{t('about.keyFeatures.interactiveCalendar.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <BarChart3 />
              <div>
                <strong>{t('about.keyFeatures.advancedAnalytics.title')}</strong>
                <p>{t('about.keyFeatures.advancedAnalytics.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <Globe />
              <div>
                <strong>{t('about.keyFeatures.googleCalendarIntegration.title')}</strong>
                <p>{t('about.keyFeatures.googleCalendarIntegration.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <Coffee />
              <div>
                <strong>{t('about.keyFeatures.flexibleLunchTracking.title')}</strong>
                <p>{t('about.keyFeatures.flexibleLunchTracking.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <UtensilsCrossed />
              <div>
                <strong>{t('about.keyFeatures.expenseManagement.title')}</strong>
                <p>{t('about.keyFeatures.expenseManagement.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <MapPin />
              <div>
                <strong>{t('about.keyFeatures.locationNotes.title')}</strong>
                <p>{t('about.keyFeatures.locationNotes.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <DollarSign />
              <div>
                <strong>{t('about.keyFeatures.weekendWorkBenefits.title')}</strong>
                <p>{t('about.keyFeatures.weekendWorkBenefits.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <TrendingUp />
              <div>
                <strong>{t('about.keyFeatures.overworkManagement.title')}</strong>
                <p>{t('about.keyFeatures.overworkManagement.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <AlertTriangle />
              <div>
                <strong>{t('about.keyFeatures.customizableThresholds.title')}</strong>
                <p>{t('about.keyFeatures.customizableThresholds.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <Bot />
              <div>
                <strong>{t('about.keyFeatures.aiAdvisor.title')}</strong>
                <p>{t('about.keyFeatures.aiAdvisor.description')}</p>
              </div>
            </div>
            <div className="feature-item">
              <Crown />
              <div>
                <strong>{t('about.keyFeatures.premiumPlans.title')}</strong>
                <p>{t('about.keyFeatures.premiumPlans.description')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Bot />
            <h2>{t('about.aiAdvisorSection.title')}</h2>
          </div>
          <p>
            {t('about.aiAdvisorSection.description')}
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.portugueseLaborLaw.title')}</h4>
              <p>{t('about.aiAdvisorSection.portugueseLaborLaw.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.legalLimitCalculations.title')}</h4>
              <p>{t('about.aiAdvisorSection.legalLimitCalculations.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.hrBestPractices.title')}</h4>
              <p>{t('about.aiAdvisorSection.hrBestPractices.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.proactiveAlerts.title')}</h4>
              <p>{t('about.aiAdvisorSection.proactiveAlerts.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.contextAwareAnalysis.title')}</h4>
              <p>{t('about.aiAdvisorSection.contextAwareAnalysis.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.aiAdvisorSection.callPackSystem.title')}</h4>
              <p>{t('about.aiAdvisorSection.callPackSystem.description')}</p>
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
            {t('about.aiAdvisorSection.poweredBy')}
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Building2 />
            <h2>{t('about.enterpriseSection.title')}</h2>
          </div>
          <p>
            {t('about.enterpriseSection.description')}
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.teamManagement.title')}</h4>
              <p>{t('about.enterpriseSection.features.teamManagement.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.premiumAiMembers.title')}</h4>
              <p>{t('about.enterpriseSection.features.premiumAiMembers.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.aiCalls.title')}</h4>
              <p>{t('about.enterpriseSection.features.aiCalls.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.centralizedDashboard.title')}</h4>
              <p>{t('about.enterpriseSection.features.centralizedDashboard.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.teamWarnings.title')}</h4>
              <p>{t('about.enterpriseSection.features.teamWarnings.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.overworkDetails.title')}</h4>
              <p>{t('about.enterpriseSection.features.overworkDetails.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.enterpriseSection.features.memberAnalytics.title')}</h4>
              <p>{t('about.enterpriseSection.features.memberAnalytics.description')}</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <BarChart3 />
            <h2>{t('about.analyticsReports.title')}</h2>
          </div>
          <p>
            {t('about.analyticsReports.description')}
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.multipleReportViews.title')}</h4>
              <p>{t('about.analyticsReports.multipleReportViews.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.searchFilter.title')}</h4>
              <p>{t('about.analyticsReports.searchFilter.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.visualStatsCards.title')}</h4>
              <p>{t('about.analyticsReports.visualStatsCards.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.csvExport.title')}</h4>
              <p>{t('about.analyticsReports.csvExport.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.overworkTracker.title')}</h4>
              <p>{t('about.analyticsReports.overworkTracker.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.analyticsReports.expenseReports.title')}</h4>
              <p>{t('about.analyticsReports.expenseReports.description')}</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-header">
            <Info />
            <h2>{t('about.technologyStack.title')}</h2>
          </div>
          <p>
            {t('about.technologyStack.description')}
          </p>
          <ul className="tech-list">
            <li><strong>{t('about.technologyStack.react')}</strong></li>
            <li><strong>{t('about.technologyStack.firebase')}</strong></li>
            <li><strong>{t('about.technologyStack.googleCalendar')}</strong></li>
            <li><strong>{t('about.technologyStack.openRouter')}</strong></li>
            <li><strong>{t('about.technologyStack.vite')}</strong></li>
            <li><strong>{t('about.technologyStack.vercel')}</strong></li>
          </ul>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
            {t('about.technologyStack.optimized')}
          </p>
        </section>

        <section className="about-section">
          <div className="section-header">
            <TrendingUp />
            <h2>{t('about.performanceReliability.title')}</h2>
          </div>
          <p>
            {t('about.performanceReliability.description')}
          </p>
          <div className="analytics-features">
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.fastLoading.title')}</h4>
              <p>{t('about.performanceReliability.fastLoading.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.parallelOperations.title')}</h4>
              <p>{t('about.performanceReliability.parallelOperations.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.smartCaching.title')}</h4>
              <p>{t('about.performanceReliability.smartCaching.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.errorRecovery.title')}</h4>
              <p>{t('about.performanceReliability.errorRecovery.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.optimizedRendering.title')}</h4>
              <p>{t('about.performanceReliability.optimizedRendering.description')}</p>
            </div>
            <div className="analytics-item">
              <h4>{t('about.performanceReliability.smallerBundles.title')}</h4>
              <p>{t('about.performanceReliability.smallerBundles.description')}</p>
            </div>
          </div>
        </section>

        <section className="about-section footer-section">
          <p className="version">{t('about.footer.version')}</p>
          <p className="copyright">{t('about.footer.copyright')}</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
            {t('about.footer.latestUpdate')}
          </p>
        </section>
      </div>
    </div>
  );
}
