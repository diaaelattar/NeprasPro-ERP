// ════════════════════════════════════════════════════════════════
//  SiblingDiscoveryModal.jsx — نافذة اكتشاف وربط الإخوة والتوائم الذكي (NeprasPro)
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  Users, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  Link2, Check, ShieldCheck, HeartHandshake, X, UserCheck
} from 'lucide-react';
import API_BASE_URL from '../../config/api';

export default function SiblingDiscoveryModal({ isOpen, onClose, onLinkedSuccess }) {
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [data, setData] = useState({ groups: [], groupsCount: 0, totalSiblingsCount: 0, totalTwinsCount: 0 });
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDetected = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_BASE_URL}/students/siblings/detect`);
      if (!res.ok) throw new Error('فشل جلب نتائج الفحص الذكي');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        const allKeys = new Set(json.data.groups.map(g => g.groupKey));
        setSelectedGroups(allKeys);
      }
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء فحص البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDetected();
      setSuccessMsg('');
    }
  }, [isOpen]);

  const toggleGroup = (key) => {
    const next = new Set(selectedGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedGroups(next);
  };

  const selectAll = () => {
    setSelectedGroups(new Set(data.groups.map(g => g.groupKey)));
  };

  const deselectAll = () => {
    setSelectedGroups(new Set());
  };

  const handleLinkSelected = async () => {
    if (selectedGroups.size === 0) {
      alert('يرجى اختيار مجموعة واحدة على الأقل لربطها');
      return;
    }
    try {
      setLinking(true);
      setErrorMsg('');
      const res = await fetch(`${API_BASE_URL}/students/siblings/auto-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupKeys: Array.from(selectedGroups) })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'فشل تنفيذ الربط التلقائي');
      }
      setSuccessMsg(`تم بنجاح ربط ${json.linkedCount || 0} طالباً (${json.twinsLinkedCount || 0} توائم) وتحديث السجلات! ✅`);
      if (onLinkedSuccess) onLinkedSuccess();
      setTimeout(() => {
        fetchDetected();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء الربط');
    } finally {
      setLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, direction: 'rtl', fontFamily: 'Cairo, Tahoma, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #cbd5e1',
        width: '100%', maxWidth: 880,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: 10, background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={22} color="#fbbf24" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>المكتشف الذكي للإخوة والتوائم</h2>
              <p style={{ fontSize: 12, color: '#93c5fd', margin: '3px 0 0' }}>
                فحص آلي هرمي بالرقم القومي للأب وبصمة الاسم المركبة لتحديد الإخوة والتوائم بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
              borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, fontWeight: 700, color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#4f46e5' }}></span>
              <span>المجموعات المكتشفة: <b style={{ color: '#3730a3', fontSize: 14 }}>{data.groupsCount}</b></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span>إجمالي الإخوة: <b style={{ color: '#065f46', fontSize: 14 }}>{data.totalSiblingsCount}</b></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span>
              <span>التوائم (Twins): <b style={{ color: '#5b21b6', fontSize: 14 }}>{data.totalTwinsCount}</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={selectAll}
              style={{
                fontSize: 12, color: '#4f46e5', fontWeight: 700,
                background: '#eef2ff', border: '1px solid #c7d2fe',
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer'
              }}
            >
              تحديد الكل
            </button>
            <button
              onClick={deselectAll}
              style={{
                fontSize: 12, color: '#64748b', fontWeight: 700,
                background: '#f1f5f9', border: '1px solid #cbd5e1',
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer'
              }}
            >
              إلغاء التحديد
            </button>
            <button
              onClick={fetchDetected}
              disabled={loading}
              title="إعادة الفحص الآن"
              style={{
                fontSize: 12, color: '#0284c7', fontWeight: 700,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                padding: '5px 10px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>إعادة فحص</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, maxHeight: '55vh' }}>
          {errorMsg && (
            <div style={{
              padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, fontSize: 13, color: '#b91c1c', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: 12, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 10, fontSize: 13, color: '#166534', fontWeight: 700, marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#475569' }}>
              <RefreshCw size={32} color="#4f46e5" className="spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>جاري فحص وتطبيع الأسماء والأرقام القومية ومطابقة الأسر...</p>
            </div>
          ) : data.groups.length === 0 ? (
            <div style={{
              padding: '50px 20px', textAlign: 'center',
              backgroundColor: '#f8fafc', borderRadius: 12,
              border: '2px dashed #cbd5e1'
            }}>
              <HeartHandshake size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#334155', margin: '0 0 6px' }}>
                لم يتم العثور على مجموعات إخوة جديدة غير مرتبطة
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 450, margin: '0 auto', lineHeight: 1.6 }}>
                البيانات الحالية للطلاب إما ليس لديها أرقام قومية متطابقة للأب أو أسماء آباء متطابقة، أو تم ربطهم مسبقاً.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.groups.map((group, idx) => {
                const isSelected = selectedGroups.has(group.groupKey);
                const isTwinGroup = group.hasTwins;

                return (
                  <div
                    key={group.groupKey || idx}
                    onClick={() => toggleGroup(group.groupKey)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                      padding: 16,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          border: isSelected ? '2px solid #4f46e5' : '2px solid #cbd5e1',
                          backgroundColor: isSelected ? '#4f46e5' : '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff'
                        }}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                              أسرة: {group.fatherName}
                            </h4>
                            <span style={{
                              fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                              backgroundColor: isTwinGroup ? '#f3e8ff' : '#dbeafe',
                              color: isTwinGroup ? '#6b21a8' : '#1e40af'
                            }}>
                              {group.type}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#047857', fontWeight: 600 }}>
                              <ShieldCheck size={14} />
                              {group.matchType}
                            </span>
                            {group.guardianPhone && group.guardianPhone !== '—' && (
                              <span>هاتف: <b style={{ color: '#334155' }}>{group.guardianPhone}</b></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: 12, fontWeight: 800, color: '#4338ca',
                        backgroundColor: '#ffffff', padding: '4px 10px', borderRadius: 8,
                        border: '1px solid #c7d2fe', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        {group.studentsCount} طلاب
                      </span>
                    </div>

                    {/* Student List in Group */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0'
                    }}>
                      {group.students.map((stu) => (
                        <div
                          key={stu.id}
                          style={{
                            backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                            borderRadius: 8, padding: '8px 12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: 12
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>
                              <span>{stu.full_name_ar}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginRight: 4 }}>
                                ({stu.gender || 'طالب'})
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {stu.grade_name_ar || 'الصف'} {stu.classroom_name ? `• ${stu.classroom_name}` : ''}
                            </div>
                          </div>

                          <div style={{
                            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                            color: '#475569', backgroundColor: '#f1f5f9',
                            padding: '3px 8px', borderRadius: 6, border: '1px solid #e2e8f0'
                          }}>
                            {stu.birth_date || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            تم تحديد <b style={{ color: '#4f46e5' }}>{selectedGroups.size}</b> من أصل <b style={{ color: '#1e293b' }}>{data.groupsCount}</b> مجموعة
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 700,
                color: '#475569', backgroundColor: '#e2e8f0',
                border: 'none', borderRadius: 10, cursor: 'pointer'
              }}
            >
              إغلاق
            </button>
            <button
              onClick={handleLinkSelected}
              disabled={linking || selectedGroups.size === 0 || data.groups.length === 0}
              style={{
                padding: '8px 22px', fontSize: 13, fontWeight: 800,
                color: '#ffffff',
                backgroundColor: (linking || selectedGroups.size === 0 || data.groups.length === 0) ? '#94a3b8' : '#4f46e5',
                border: 'none', borderRadius: 10,
                cursor: (linking || selectedGroups.size === 0 || data.groups.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
              }}
            >
              {linking ? <RefreshCw size={15} className="spin" /> : <Link2 size={15} />}
              <span>تأكيد وربط الإخوة والتوائم المحددين</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
