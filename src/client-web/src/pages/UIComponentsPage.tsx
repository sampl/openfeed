import { BookmarkSimple, House, Gear } from "@phosphor-icons/react";
import Badge from "../ui_components/Badge";
import Banner from "../ui_components/Banner";
import BottomNav from "../ui_components/BottomNav";
import Copyright from "../ui_components/Copyright";
import Debug from "../ui_components/Debug";
import EmptyState from "../ui_components/EmptyState";
import ErrorBoundary from "../ui_components/ErrorBoundary";
import ErrorState from "../ui_components/ErrorState";
import PageSpinner from "../ui_components/PageSpinner";
import SettingsItem from "../ui_components/SettingsItem";
import SettingsSection from "../ui_components/SettingsSection";
import { Toaster, toast } from "../ui_components/Toaster";
import styles from "./UIComponentsPage.module.css";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    <div className={styles.sectionContent}>{children}</div>
  </section>
);

const Row = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div className={styles.row}>
    {label && <span className={styles.rowLabel}>{label}</span>}
    <div className={styles.rowItems}>{children}</div>
  </div>
);

export const UIComponentsPage = () => {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>UI Components</h1>

      {/* Badge */}
      <Section title="Badge">
        <Row label="Emphasis variants">
          <Badge emphasis="primary">primary</Badge>
          <Badge emphasis="secondary">secondary</Badge>
          <Badge emphasis="tertiary">tertiary</Badge>
          <Badge emphasis="success">success</Badge>
          <Badge emphasis="warning">warning</Badge>
          <Badge emphasis="error">error</Badge>
          <Badge emphasis="info">info</Badge>
          <Badge emphasis="neutral">neutral</Badge>
        </Row>
        <Row label="No emphasis (default)">
          <Badge>default</Badge>
        </Row>
      </Section>

      {/* Banner */}
      <Section title="Banner">
        <Row label="Emphasis variants (md padding)">
          <div className={styles.bannerStack}>
            <Banner emphasis="info">Info banner</Banner>
            <Banner emphasis="success">Success banner</Banner>
            <Banner emphasis="warning">Warning banner</Banner>
            <Banner emphasis="error">Error banner</Banner>
            <Banner>No emphasis (default)</Banner>
          </div>
        </Row>
        <Row label="Padding sizes (info)">
          <div className={styles.bannerStack}>
            <Banner emphasis="info" padding="sm">Small padding</Banner>
            <Banner emphasis="info" padding="md">Medium padding</Banner>
            <Banner emphasis="info" padding="lg">Large padding</Banner>
          </div>
        </Row>
      </Section>

      {/* BottomNav */}
      <Section title="BottomNav">
        <Row label="3-item example (static, non-functional)">
          <div className={styles.bottomNavContainer}>
            <BottomNav
              items={[
                { label: "Feed", icon: <House size={22} />, onClick: () => {}, active: true },
                { label: "Saved", icon: <BookmarkSimple size={22} />, onClick: () => {}, active: false },
                { label: "Settings", icon: <Gear size={22} />, onClick: () => {}, active: false, badge: true },
              ]}
            />
          </div>
        </Row>
      </Section>

      {/* Copyright */}
      <Section title="Copyright">
        <Row label="Default">
          <Copyright />
        </Row>
      </Section>

      {/* Debug */}
      <Section title="Debug">
        <Row label="Dev-only panel (hidden in prod; triple-click copyright year to reveal)">
          <span className={styles.note}>Debug renders nothing in production. Triple-click the copyright year in settings to toggle it in dev.</span>
          <Debug persistenceId="ui-components-demo" />
        </Row>
      </Section>

      {/* EmptyState */}
      <Section title="EmptyState">
        <Row label="Size sm (no icon)">
          <EmptyState title="Nothing here" description="This is a small empty state." size="sm" />
        </Row>
        <Row label="Size md (with icon)">
          <EmptyState
            icon={<BookmarkSimple size={32} weight="light" />}
            title="Nothing saved yet"
            description="Items you save will appear here."
            size="md"
          />
        </Row>
        <Row label="Size lg (with primary CTA)">
          <EmptyState
            title="No results found"
            description="Try adjusting your search."
            ctaText="Clear search"
            ctaOnClick={() => {}}
            ctaStyle="primary"
            size="lg"
          />
        </Row>
        <Row label="With secondary CTA">
          <EmptyState
            title="No items"
            description="Add sources to get started."
            ctaText="Add source"
            ctaOnClick={() => {}}
            ctaStyle="primary"
            secondaryCtaText="View docs"
            secondaryCtaOnClick={() => {}}
            secondaryCtaStyle="secondary"
            size="md"
          />
        </Row>
        <Row label="Link-style CTA">
          <EmptyState
            title="No data"
            ctaText="Learn more"
            ctaOnClick={() => {}}
            ctaStyle="link"
            size="md"
          />
        </Row>
      </Section>

      {/* ErrorBoundary */}
      <Section title="ErrorBoundary">
        <Row label="Wrapping a healthy child">
          <ErrorBoundary>
            <span className={styles.note}>ErrorBoundary is active. This child renders fine.</span>
          </ErrorBoundary>
        </Row>
      </Section>

      {/* ErrorState */}
      <Section title="ErrorState">
        <Row label="Size sm">
          <ErrorState error={new Error("Something went wrong (sm)")} size="sm" />
        </Row>
        <Row label="Size md">
          <ErrorState error={new Error("Something went wrong (md)")} size="md" />
        </Row>
        <Row label="Size lg">
          <ErrorState error={new Error("Something went wrong (lg)")} size="lg" />
        </Row>
      </Section>

      {/* PageSpinner */}
      <Section title="PageSpinner">
        <Row label="Default">
          <PageSpinner />
        </Row>
      </Section>

      {/* SettingsItem */}
      <Section title="SettingsItem">
        <div className={styles.settingsItemContainer}>
          <SettingsSection>
            <SettingsItem title="With icon" icon={<House size={18} />} onClick={() => {}} />
            <SettingsItem title="Without icon" onClick={() => {}} />
            <SettingsItem title="With chevron" icon={<Gear size={18} />} onClick={() => {}} showChevron />
            <SettingsItem title="With badge count" icon={<BookmarkSimple size={18} />} onClick={() => {}} badge={5} />
            <SettingsItem title="Error state" icon={<House size={18} />} onClick={() => {}} error />
            <SettingsItem title="Disabled" icon={<House size={18} />} onClick={() => {}} disabled />
            <SettingsItem title="External link" icon={<House size={18} />} href="https://example.com" target="_blank" />
            <SettingsItem title="Internal link (no new tab)" icon={<House size={18} />} href="/settings" />
          </SettingsSection>
        </div>
      </Section>

      {/* SettingsSection */}
      <Section title="SettingsSection">
        <Row label="With title">
          <div className={styles.settingsItemContainer}>
            <SettingsSection title="Section Title">
              <SettingsItem title="Item one" onClick={() => {}} />
              <SettingsItem title="Item two" onClick={() => {}} />
            </SettingsSection>
          </div>
        </Row>
        <Row label="Without title">
          <div className={styles.settingsItemContainer}>
            <SettingsSection>
              <SettingsItem title="Item one" onClick={() => {}} />
              <SettingsItem title="Item two" onClick={() => {}} />
            </SettingsSection>
          </div>
        </Row>
      </Section>

      {/* Toaster */}
      <Section title="Toaster">
        <Row label="Fire a toast notification">
          <button
            className={styles.toastButton}
            onClick={() => toast("Hello from Toaster!")}
          >
            Show toast
          </button>
        </Row>
        <span className={styles.note}>
          The Toaster component must be mounted in the app root (it already is via App.tsx).
        </span>
        <Toaster />
      </Section>
    </div>
  );
};
