import React, { useEffect, useState } from 'react';
import {
  Globe,
  Save,
  Send,
  Eye,
  RefreshCw,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Megaphone,
  Smartphone,
  Tv,
  Package,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Laptop,
  Tablet,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { adminService, DEFAULT_LANDING_CONTENT } from '../services/adminService';
import { LandingPageContent, BannerRecord, LandingSectionConfig, LandingFeatureItem, LandingBenefitItem } from '../types';
import { HishabLogo } from '../components/HishabLogo';

export const LandingPageManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hero' | 'services' | 'features' | 'banners' | 'cta-footer' | 'sections'>('hero');
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Banner Editor Modal
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<BannerRecord>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchContentAndBanners = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // First try to load draft so Admin sees latest work-in-progress
      const data = await adminService.getLandingPageContent('draft');
      setContent(data);

      const bannersData = await adminService.getBanners();
      setBanners(bannersData);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load landing page configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentAndBanners();
  }, []);

  const handleFieldChange = (field: keyof LandingPageContent, value: any) => {
    setContent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const saved = await adminService.saveLandingPageDraft(content);
      setContent(saved);
      setSuccessMessage('Draft saved successfully to Supabase. Content remains unlisted until published.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save draft in database.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to Publish this Landing Page? Changes will immediately become visible to all visitors of the Hishab User Website.')) {
      return;
    }

    setPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const published = await adminService.publishLandingPage(content);
      setContent(published);
      setSuccessMessage(`Landing Page Version ${published.version} published successfully to Supabase!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to publish landing page configuration.');
    } finally {
      setPublishing(false);
    }
  };

  // Section Ordering & Toggling
  const handleToggleSection = (sectionId: string) => {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...content.sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIdx];
    newSections[targetIdx] = temp;

    // re-assign order numbers
    newSections.forEach((s, idx) => {
      s.order = idx + 1;
    });

    setContent((prev) => ({
      ...prev,
      sections: newSections,
    }));
  };

  // Feature Items handlers
  const handleAddFeature = () => {
    const newFeature: LandingFeatureItem = {
      id: `feat_${Date.now()}`,
      title: 'New Feature Highlight',
      description: 'Describe this capability and how it benefits shopkeepers.',
    };
    setContent((prev) => ({
      ...prev,
      features_list: [...prev.features_list, newFeature],
    }));
  };

  const handleUpdateFeature = (id: string, key: 'title' | 'description', value: string) => {
    setContent((prev) => ({
      ...prev,
      features_list: prev.features_list.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  const handleDeleteFeature = (id: string) => {
    setContent((prev) => ({
      ...prev,
      features_list: prev.features_list.filter((f) => f.id !== id),
    }));
  };

  // Benefits handlers
  const handleAddBenefit = () => {
    const newBenefit: LandingBenefitItem = {
      id: `ben_${Date.now()}`,
      title: 'Reliable Cloud Protection',
      description: 'Zero data loss with automated encrypted backups.',
    };
    setContent((prev) => ({
      ...prev,
      benefits_list: [...prev.benefits_list, newBenefit],
    }));
  };

  const handleUpdateBenefit = (id: string, key: 'title' | 'description', value: string) => {
    setContent((prev) => ({
      ...prev,
      benefits_list: prev.benefits_list.map((b) => (b.id === id ? { ...b, [key]: value } : b)),
    }));
  };

  const handleDeleteBenefit = (id: string) => {
    setContent((prev) => ({
      ...prev,
      benefits_list: prev.benefits_list.filter((b) => b.id !== id),
    }));
  };

  // Bullet points for POS
  const handleAddPosBullet = () => {
    setContent((prev) => ({
      ...prev,
      billing_pos_bullets: [...prev.billing_pos_bullets, 'New billing feature capability'],
    }));
  };

  const handleUpdatePosBullet = (idx: number, val: string) => {
    setContent((prev) => {
      const copy = [...prev.billing_pos_bullets];
      copy[idx] = val;
      return { ...prev, billing_pos_bullets: copy };
    });
  };

  const handleDeletePosBullet = (idx: number) => {
    setContent((prev) => ({
      ...prev,
      billing_pos_bullets: prev.billing_pos_bullets.filter((_, i) => i !== idx),
    }));
  };

  // Banner Actions
  const handleOpenNewBanner = () => {
    setEditingBanner({
      title: '',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80',
      cta_text: 'Learn More',
      cta_link: '#pricing',
      badge_text: 'SPECIAL OFFER',
      type: 'promo',
      is_active: true,
      display_order: banners.length + 1,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!editingBanner.title?.trim()) {
      alert('Please enter a banner title.');
      return;
    }

    try {
      const saved = await adminService.saveBanner(editingBanner);
      setBanners((prev) => {
        const idx = prev.findIndex((b) => b.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      setIsBannerModalOpen(false);
      setSuccessMessage('Banner saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save banner.');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await adminService.deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setSuccessMessage('Banner deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete banner.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { url } = await adminService.uploadBannerImage(file);
      setEditingBanner((prev) => ({ ...prev, image_url: url }));
      setSuccessMessage('Image uploaded to Supabase Storage successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Image upload failed. You can paste an image URL directly.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Landing Page &amp; Branding Control</span>
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                content.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {content.status === 'published' ? `Published (v${content.version || 1})` : 'Draft Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative master content engine for the HishabKhata User Website. Changes published here update public visitor views instantly.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchContentAndBanners}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Reload from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Live Preview</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingDraft ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={savingDraft || publishing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishing ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Save &amp; Publish</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Navigation Segments */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
        {[
          { id: 'hero', label: 'Announcement & Hero' },
          { id: 'services', label: 'Services & Facilities' },
          { id: 'features', label: 'Features & Benefits' },
          { id: 'banners', label: `Promotional Banners (${banners.length})` },
          { id: 'cta-footer', label: 'CTA & Contact Info' },
          { id: 'sections', label: 'Section Ordering & Visibility' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Dynamic Edit Forms */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        {/* =========================================================================
            TAB 1: ANNOUNCEMENT & HERO SECTION
        ========================================================================== */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            {/* Announcement Bar */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Website Announcement Bar</h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={content.announcement_enabled}
                    onChange={(e) => handleFieldChange('announcement_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Show Announcement</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Announcement Message
                  </label>
                  <input
                    type="text"
                    value={content.announcement_text || ''}
                    onChange={(e) => handleFieldChange('announcement_text', e.target.value)}
                    placeholder="e.g. 🎉 New: Multi-Counter POS Billing & Instant Mobile Recharge Commission live!"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Destination Link
                  </label>
                  <input
                    type="text"
                    value={content.announcement_link || ''}
                    onChange={(e) => handleFieldChange('announcement_link', e.target.value)}
                    placeholder="#services or /register"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Hero Main Copy */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Hero Section Headline &amp; Descriptions
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Main Headline
                </label>
                <input
                  type="text"
                  value={content.hero_headline || ''}
                  onChange={(e) => handleFieldChange('hero_headline', e.target.value)}
                  placeholder="Smart Billing. Simple Business. Complete Khata & Invoicing."
                  className="w-full px-4 py-2.5 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Hero Subtitle
                </label>
                <input
                  type="text"
                  value={content.hero_subtitle || ''}
                  onChange={(e) => handleFieldChange('hero_subtitle', e.target.value)}
                  placeholder="The all-in-one business software built specifically for Indian retail shops..."
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Detailed Hero Description
                </label>
                <textarea
                  rows={3}
                  value={content.hero_description || ''}
                  onChange={(e) => handleFieldChange('hero_description', e.target.value)}
                  placeholder="Detailed breakdown of POS billing, GST invoicing, mobile recharge, inventory..."
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Call-to-action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Primary CTA Button
                  </span>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={content.hero_cta_primary_text || ''}
                      onChange={(e) => handleFieldChange('hero_cta_primary_text', e.target.value)}
                      placeholder="Start 15-Day Free Trial"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Button Link / Destination
                    </label>
                    <input
                      type="text"
                      value={content.hero_cta_primary_link || ''}
                      onChange={(e) => handleFieldChange('hero_cta_primary_link', e.target.value)}
                      placeholder="/register"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Secondary CTA Button
                  </span>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={content.hero_cta_secondary_text || ''}
                      onChange={(e) => handleFieldChange('hero_cta_secondary_text', e.target.value)}
                      placeholder="View Demo & Plans"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Button Link / Destination
                    </label>
                    <input
                      type="text"
                      value={content.hero_cta_secondary_link || ''}
                      onChange={(e) => handleFieldChange('hero_cta_secondary_link', e.target.value)}
                      placeholder="#pricing"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SERVICES & FACILITIES (BILLING, RECHARGE, STOCK, KHATA, INVOICES)
        ========================================================================== */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Services &amp; Facilities Content
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure descriptive text and bullet highlights for the 6 core business modules on the landing page.
              </p>
            </div>

            {/* 1. Billing & POS */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <Laptop className="w-4 h-4" />
                <span>1. Point of Sale (POS) &amp; Smart Billing</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={content.billing_pos_title || ''}
                    onChange={(e) => handleFieldChange('billing_pos_title', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={content.billing_pos_description || ''}
                    onChange={(e) => handleFieldChange('billing_pos_description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Bullet Features:</span>
                  <button
                    type="button"
                    onClick={handleAddPosBullet}
                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bullet</span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {content.billing_pos_bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => handleUpdatePosBullet(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePosBullet(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Mobile & DTH Recharge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>2. Mobile Recharge Module</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={content.recharge_mobile_title || ''}
                    onChange={(e) => handleFieldChange('recharge_mobile_title', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={content.recharge_mobile_description || ''}
                    onChange={(e) => handleFieldChange('recharge_mobile_description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <Tv className="w-4 h-4" />
                  <span>3. DTH TV Recharge Module</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={content.recharge_dth_title || ''}
                    onChange={(e) => handleFieldChange('recharge_dth_title', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={content.recharge_dth_description || ''}
                    onChange={(e) => handleFieldChange('recharge_dth_description', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 3. Stock, Khata & Invoices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                  <Package className="w-4 h-4" />
                  <span>4. Product &amp; Stock</span>
                </div>
                <input
                  type="text"
                  value={content.inventory_stock_title || ''}
                  onChange={(e) => handleFieldChange('inventory_stock_title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                />
                <textarea
                  rows={3}
                  value={content.inventory_stock_description || ''}
                  onChange={(e) => handleFieldChange('inventory_stock_description', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  <span>5. Customer Khata</span>
                </div>
                <input
                  type="text"
                  value={content.party_management_title || ''}
                  onChange={(e) => handleFieldChange('party_management_title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                />
                <textarea
                  rows={3}
                  value={content.party_management_description || ''}
                  onChange={(e) => handleFieldChange('party_management_description', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>6. Invoices &amp; Reports</span>
                </div>
                <input
                  type="text"
                  value={content.reports_invoices_title || ''}
                  onChange={(e) => handleFieldChange('reports_invoices_title', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                />
                <textarea
                  rows={3}
                  value={content.reports_invoices_description || ''}
                  onChange={(e) => handleFieldChange('reports_invoices_description', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: FEATURES & BENEFITS LISTS
        ========================================================================== */}
        {activeTab === 'features' && (
          <div className="space-y-8">
            {/* Features section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Feature Highlights</h3>
                  <p className="text-xs text-slate-500">Key capability cards shown below the hero section.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={content.features_heading || ''}
                    onChange={(e) => handleFieldChange('features_heading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Section Subheading</label>
                  <input
                    type="text"
                    value={content.features_subheading || ''}
                    onChange={(e) => handleFieldChange('features_subheading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {content.features_list.map((feat, idx) => (
                  <div key={feat.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        Feature #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(feat.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete feature card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={feat.title}
                      onChange={(e) => handleUpdateFeature(feat.id, 'title', e.target.value)}
                      placeholder="Feature Title"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                    <textarea
                      rows={2}
                      value={feat.description}
                      onChange={(e) => handleUpdateFeature(feat.id, 'description', e.target.value)}
                      placeholder="Feature Description"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Benefits &amp; Why Choose Us</h3>
                  <p className="text-xs text-slate-500">Trust-building reasons and guarantees displayed to customers.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Benefit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Benefits Heading</label>
                  <input
                    type="text"
                    value={content.benefits_heading || ''}
                    onChange={(e) => handleFieldChange('benefits_heading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Benefits Subheading</label>
                  <input
                    type="text"
                    value={content.benefits_subheading || ''}
                    onChange={(e) => handleFieldChange('benefits_subheading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {content.benefits_list.map((ben, idx) => (
                  <div key={ben.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        Benefit #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBenefit(ben.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete benefit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ben.title}
                      onChange={(e) => handleUpdateBenefit(ben.id, 'title', e.target.value)}
                      placeholder="Benefit Title"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                    <textarea
                      rows={2}
                      value={ben.description}
                      onChange={(e) => handleUpdateBenefit(ben.id, 'description', e.target.value)}
                      placeholder="Benefit Description"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: BANNERS & BRANDING CAROUSEL
        ========================================================================== */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Landing Page Banners &amp; Media</h3>
                <p className="text-xs text-slate-500">
                  Manage promotional hero banners, campaign graphics, and announcements with direct image upload.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewBanner}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Banner</span>
              </button>
            </div>

            {banners.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No Banners Configured</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">Click below to create your first promotional banner.</p>
                <button
                  type="button"
                  onClick={handleOpenNewBanner}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg"
                >
                  Create Banner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((b) => (
                  <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
                    {/* Banner Image Preview */}
                    <div className="relative h-40 bg-slate-900 overflow-hidden group">
                      <img
                        src={b.image_url}
                        alt={b.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      {b.badge_text && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                          {b.badge_text}
                        </span>
                      )}
                      <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {b.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    {/* Banner Content Details */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{b.title}</h4>
                          <span className="text-[10px] font-mono text-slate-400">Order: {b.display_order}</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{b.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                          <span>{b.cta_text || 'CTA'}</span>
                          <span className="text-slate-400 font-mono">({b.cta_link || '#'})</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBanner(b);
                              setIsBannerModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: CTA, FOOTER & CONTACT INFORMATION
        ========================================================================== */}
        {activeTab === 'cta-footer' && (
          <div className="space-y-6">
            {/* Final CTA Banner */}
            <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Bottom Call To Action (CTA) Section</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Headline</label>
                  <input
                    type="text"
                    value={content.cta_heading || ''}
                    onChange={(e) => handleFieldChange('cta_heading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subheading</label>
                  <input
                    type="text"
                    value={content.cta_subheading || ''}
                    onChange={(e) => handleFieldChange('cta_subheading', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={content.cta_button_text || ''}
                    onChange={(e) => handleFieldChange('cta_button_text', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Button Destination Link</label>
                  <input
                    type="text"
                    value={content.cta_button_link || ''}
                    onChange={(e) => handleFieldChange('cta_button_link', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Footer Copy & Contact info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Footer Text &amp; Public Contact Channels
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Footer Copyright / Disclaimer Text
                </label>
                <input
                  type="text"
                  value={content.footer_text || ''}
                  onChange={(e) => handleFieldChange('footer_text', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Support Email</span>
                  </label>
                  <input
                    type="email"
                    value={content.contact_email || ''}
                    onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Support Phone</span>
                  </label>
                  <input
                    type="text"
                    value={content.contact_phone || ''}
                    onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-green-600" />
                    <span>WhatsApp Contact</span>
                  </label>
                  <input
                    type="text"
                    value={content.contact_whatsapp || ''}
                    onChange={(e) => handleFieldChange('contact_whatsapp', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Physical Address / Office Location</span>
                </label>
                <input
                  type="text"
                  value={content.contact_address || ''}
                  onChange={(e) => handleFieldChange('contact_address', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: SECTION ORDERING & TOGGLING
        ========================================================================== */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Landing Page Section Visibility &amp; Ordering
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle individual sections on or off, and arrange the vertical sequence in which they appear on the live HishabKhata website.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {content.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    sec.enabled ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">{sec.name}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Toggle Switch */}
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSection(sec.id)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className={sec.enabled ? 'text-emerald-700' : 'text-slate-400'}>
                        {sec.enabled ? 'Active' : 'Hidden'}
                      </span>
                    </label>

                    {/* Move Up / Down Buttons */}
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <button
                        type="button"
                        onClick={() => handleMoveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(idx, 'down')}
                        disabled={idx === content.sections.length - 1}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          BANNER EDIT / ADD MODAL
      ========================================================================== */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingBanner.id ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Festival Season Special Offer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Description / Offer Details
                </label>
                <textarea
                  rows={2}
                  value={editingBanner.description || ''}
                  onChange={(e) => setEditingBanner((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe discounts, extra months, printer setup..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              {/* Image URL & Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Banner Graphic (Direct URL or Storage Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingBanner.image_url || ''}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://... image URL"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {editingBanner.image_url && (
                  <div className="mt-2 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={editingBanner.image_url}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={editingBanner.cta_text || ''}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, cta_text: e.target.value }))}
                    placeholder="Claim Offer Now"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    CTA Destination Link
                  </label>
                  <input
                    type="text"
                    value={editingBanner.cta_link || ''}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, cta_link: e.target.value }))}
                    placeholder="#pricing"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Badge Pill
                  </label>
                  <input
                    type="text"
                    value={editingBanner.badge_text || ''}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, badge_text: e.target.value }))}
                    placeholder="LIMITED TIME"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={editingBanner.type || 'hero'}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg capitalize"
                  >
                    <option value="hero">Hero Carousel</option>
                    <option value="promo">Promo Card</option>
                    <option value="popup">Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingBanner.display_order ?? 1}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, display_order: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBanner.is_active ?? true)}
                    onChange={(e) => setEditingBanner((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">Banner is Active &amp; Visible</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBannerModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBanner}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
              >
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE LANDING PAGE PREVIEW MODAL
      ========================================================================== */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
          {/* Top Bar with Device Toggles & Controls */}
          <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <HishabLogo size="sm" showTagline={false} />
              <span className="text-xs font-bold text-slate-300 border-l border-slate-700 pl-3">
                Live User Landing Page Preview
              </span>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop (1440px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  previewDevice === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rendered Preview Screen in Viewport Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center bg-slate-900/50">
            <div
              className={`bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
                previewDevice === 'desktop'
                  ? 'w-full max-w-5xl'
                  : previewDevice === 'tablet'
                  ? 'w-[768px]'
                  : 'w-[375px]'
              }`}
            >
              {/* Preview Announcement Bar */}
              {content.announcement_enabled && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
                  <span>{content.announcement_text}</span>
                  {content.announcement_link && (
                    <span className="underline text-[11px] font-bold">Learn more &rarr;</span>
                  )}
                </div>
              )}

              {/* Preview Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <HishabLogo size="md" showTagline={false} />
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden sm:inline">
                    Features
                  </span>
                  <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden sm:inline">
                    Pricing
                  </span>
                  <span className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs">
                    {content.hero_cta_primary_text || 'Start Free Trial'}
                  </span>
                </div>
              </div>

              {/* Preview Hero Section */}
              <div className="px-6 py-14 sm:py-20 text-center bg-gradient-to-b from-slate-50/80 to-white">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Smart Retail &amp; Accounting Platform</span>
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight max-w-3xl mx-auto leading-tight">
                  {content.hero_headline}
                </h1>
                <p className="text-sm sm:text-base font-medium text-slate-600 max-w-2xl mx-auto mt-3">
                  {content.hero_subtitle}
                </p>
                <p className="text-xs text-slate-500 max-w-xl mx-auto mt-2 leading-relaxed">
                  {content.hero_description}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <span className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm">
                    {content.hero_cta_primary_text}
                  </span>
                  <span className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                    {content.hero_cta_secondary_text}
                  </span>
                </div>
              </div>

              {/* Preview Banners Grid */}
              {banners.filter((b) => b.is_active).length > 0 && (
                <div className="px-6 py-6 bg-slate-50/60 border-y border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners
                      .filter((b) => b.is_active)
                      .map((b) => (
                        <div key={b.id} className="relative rounded-xl overflow-hidden h-36 bg-slate-900 text-white p-4 flex flex-col justify-end">
                          <img
                            src={b.image_url}
                            alt={b.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                          <div className="relative z-10">
                            {b.badge_text && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-600 text-white">
                                {b.badge_text}
                              </span>
                            )}
                            <h4 className="font-bold text-sm text-white mt-1">{b.title}</h4>
                            <p className="text-[11px] text-slate-200 line-clamp-1">{b.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Preview Features */}
              <div className="px-6 py-12">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <h3 className="text-lg font-bold text-slate-900">{content.features_heading}</h3>
                  <p className="text-xs text-slate-500 mt-1">{content.features_subheading}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {content.features_list.map((f) => (
                    <div key={f.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40">
                      <h4 className="font-bold text-xs text-slate-900">{f.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Services */}
              <div className="px-6 py-12 bg-slate-50/70 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 text-center mb-6">
                  Complete Business Services
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h5 className="font-bold text-xs text-blue-600">{content.billing_pos_title}</h5>
                    <p className="text-[11px] text-slate-500 mt-1">{content.billing_pos_description}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h5 className="font-bold text-xs text-emerald-600">{content.recharge_mobile_title}</h5>
                    <p className="text-[11px] text-slate-500 mt-1">{content.recharge_mobile_description}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h5 className="font-bold text-xs text-indigo-600">{content.recharge_dth_title}</h5>
                    <p className="text-[11px] text-slate-500 mt-1">{content.recharge_dth_description}</p>
                  </div>
                </div>
              </div>

              {/* Preview Benefits */}
              <div className="px-6 py-12">
                <h3 className="text-base font-bold text-slate-900 text-center mb-6">
                  {content.benefits_heading}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.benefits_list.map((b) => (
                    <div key={b.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="font-bold text-xs text-slate-900">{b.title}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview CTA */}
              <div className="p-8 bg-blue-600 text-white text-center">
                <h3 className="text-lg font-bold">{content.cta_heading}</h3>
                <p className="text-xs text-blue-100 mt-1">{content.cta_subheading}</p>
                <span className="inline-block mt-4 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-bold text-xs shadow-sm">
                  {content.cta_button_text}
                </span>
              </div>

              {/* Preview Footer */}
              <div className="px-6 py-8 bg-slate-900 text-slate-400 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <HishabLogo size="sm" showTagline={true} />
                  <div className="text-[11px] space-y-0.5 text-slate-300">
                    <div>Email: {content.contact_email}</div>
                    <div>Phone: {content.contact_phone}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">{content.footer_text}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
