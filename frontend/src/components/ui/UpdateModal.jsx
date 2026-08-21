import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Download, CheckCircle2, ArrowRight, ExternalLink, 
  X, AlertCircle, RefreshCw, HardDrive, ShieldCheck
} from 'lucide-react';
import './UpdateModal.css';

export default function UpdateModal({ 
  isOpen, 
  onClose, 
  updateInfo, 
  onInstalled 
}) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0 });
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDownloading(false);
      setProgress({ percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0 });
      setDownloadComplete(false);
      setDownloadError('');
      setInstalling(false);
      return;
    }

    if (window.electronAPI && typeof window.electronAPI.onUpdateProgress === 'function') {
      const removeListener = window.electronAPI.onUpdateProgress((p) => {
        setProgress(p);
      });
      return () => {
        if (typeof removeListener === 'function') removeListener();
      };
    }
  }, [isOpen]);

  if (!isOpen || !updateInfo) return null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} ميجابايت`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '';
    const kb = bytesPerSec / 1024;
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(1)} MB/s`;
    }
    return `${Math.round(kb)} KB/s`;
  };

  const handleStartDownload = async () => {
    setDownloadError('');
    setDownloading(true);

    if (window.electronAPI && typeof window.electronAPI.downloadUpdate === 'function') {
      try {
        const res = await window.electronAPI.downloadUpdate({
          downloadUrl: updateInfo.downloadUrl,
          fileName: updateInfo.fileName
        });
        if (res && res.success) {
          setDownloading(false);
          setDownloadComplete(true);
        } else {
          setDownloading(false);
          setDownloadError(res?.error || 'فشل تحميل ملف التحديث، يرجى التنزيل يدوياً من الموقع.');
        }
      } catch (err) {
        setDownloading(false);
        setDownloadError(err.message || 'حدث خطأ أثناء الاتصال.');
      }
    } else {
      // Fallback for browser mode: open download URL directly
      window.open(updateInfo.downloadUrl || updateInfo.portalUrl, '_blank');
      setDownloading(false);
    }
  };

  const handleInstallNow = async () => {
    setInstalling(true);
    if (window.electronAPI && typeof window.electronAPI.installUpdate === 'function') {
      try {
        await window.electronAPI.installUpdate();
      } catch (err) {
        setDownloadError(err.message || 'تعذر تشغيل مثبت التحديث.');
        setInstalling(false);
      }
    }
  };

  const handleOpenBrowser = () => {
    const targetUrl = updateInfo.portalUrl || updateInfo.downloadUrl || 'https://unified-school-tools-website.vercel.app/';
    if (window.electronAPI && typeof window.electronAPI.openExternalUrl === 'function') {
      window.electronAPI.openExternalUrl(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="update-modal-backdrop" onClick={onClose}>
      <div className="update-modal-card" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="update-modal-header">
          <div className="update-header-title-box">
            <div className="update-header-icon">🚀</div>
            <div>
              <h3 className="update-header-title">يتوفر إصدار جديد لمنظومة نبراس برو</h3>
              <div className="update-header-subtitle">تحديث وترقية تلقائية عبر الإنترنت</div>
            </div>
          </div>
          <button type="button" className="update-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="update-modal-body">
          {/* Version comparison banner */}
          <div className="update-version-banner">
            <div className="update-version-col">
              <span className="update-version-label">الإصدار الحالي مثبت</span>
              <span className="update-version-val">v{updateInfo.currentVersion || '1.4.0'}</span>
            </div>
            <ArrowRight size={20} className="update-arrow-icon" style={{ transform: 'rotate(180deg)' }} />
            <div className="update-version-col">
              <span className="update-version-label">الإصدار الجديد متاح</span>
              <span className="update-version-val new">v{updateInfo.latestVersion || '1.4.1'}</span>
            </div>
          </div>

          {/* Changelog / Release notes */}
          <div className="update-changelog-box">
            <div className="update-changelog-header">
              <Sparkles size={16} color="#2563eb" />
              <span>أبرز الميزات والتحسينات الجديدة:</span>
            </div>
            <div className="update-changelog-content">
              {updateInfo.releaseNotes || '• تحسينات شاملة في سرعة واستقرار النظام ومزامنة بيانات الوزارة.'}
            </div>
          </div>

          {/* Download Progress Bar */}
          {downloading && (
            <div className="update-progress-container">
              <div className="update-progress-info">
                <span>جاري تحميل حزمة التحديث...</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="update-progress-bar-bg">
                <div 
                  className="update-progress-bar-fill" 
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="update-progress-subinfo">
                <span>تم تحميل: {formatBytes(progress.downloadedBytes)} من {formatBytes(progress.totalBytes)}</span>
                {progress.speedBytesPerSec > 0 && (
                  <span>السرعة: {formatSpeed(progress.speedBytesPerSec)}</span>
                )}
              </div>
            </div>
          )}

          {/* Download Complete State */}
          {downloadComplete && (
            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#065f46' }}>
              <CheckCircle2 size={24} color="#10b981" />
              <div>
                <strong style={{ display: 'block', fontSize: 13.5 }}>تم تحميل حزمة التحديث بنجاح!</strong>
                <span style={{ fontSize: 12, opacity: 0.9 }}>جاهز للتثبيت التلقائي وتحديث المنظومة الآن.</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {downloadError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 12, marginBottom: 16, color: '#991b1b', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} />
              <span>{downloadError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="update-modal-footer">
          <button 
            type="button" 
            className="update-btn link" 
            onClick={handleOpenBrowser}
            title="فتح بوابة أدوات المدرسة الموحدة أو صفحة التنزيل"
          >
            <ExternalLink size={14} />
            <span>بوابة التوزيع والموقع الرسمي</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button" 
              className="update-btn secondary" 
              onClick={onClose}
              disabled={installing}
            >
              تذكيري لاحقاً
            </button>

            {!downloadComplete ? (
              <button 
                type="button" 
                className="update-btn primary" 
                onClick={handleStartDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <RefreshCw size={15} className="spin-animate" />
                    <span>جاري التحميل ({progress.percent}%)...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>تحميل وتثبيت التحديث</span>
                  </>
                )}
              </button>
            ) : (
              <button 
                type="button" 
                className="update-btn success" 
                onClick={handleInstallNow}
                disabled={installing}
              >
                {installing ? (
                  <>
                    <RefreshCw size={15} className="spin-animate" />
                    <span>جاري بدء التثبيت...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>تثبيت التحديث الآن وإعادة التشغيل</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
