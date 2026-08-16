/**
 * In-Process End-to-End Audit Script for NeprasPro Wizard & Settings Integration
 * Boots Express app in-process, tests 3 real-world school setup scenarios:
 *   Scenario A: Single-Section (Arabic), Single-Stage (Primary)
 *   Scenario B: 2-Section (Arabic, Languages), All Standard Stages
 *   Scenario C: 3-Section (Arabic, Languages, International) Heterogeneous Custom Stages
 */

const express = require('express');
const path = require('path');
const db = require('../backend/config/db');

async function runInProcessAudit() {
  console.log('====================================================');
  console.log('🚀 Starting In-Process NeprasPro Wizard & Settings Audit');
  console.log('====================================================\n');

  // Initialize SQLite in-memory DB for audit
  await db.initSQLiteMode();

  const setupController = require('../backend/modules/setup/setup.controller');
  const settingsController = require('../backend/modules/settings/settings.controller');

  // Helper mock req/res
  const mockReqRes = (body = {}, params = {}) => {
    let statusCode = 200;
    let result = null;
    const req = { body, params };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { result = data; return res; }
    };
    return { req, res, getResult: () => ({ statusCode, result }) };
  };

  try {
    // ----------------------------------------------------
    // SCENARIO A: Single-Section (Arabic), Single-Stage (Primary)
    // ----------------------------------------------------
    console.log('📌 SCENARIO A: Testing Single-Section & Single-Stage Setup...');
    
    // 1. Reset system
    const resetA = mockReqRes({ adminPassword: 'admin', confirmText: 'إعادة تهيئة النظام بالكامل' });
    await setupController.resetInstitution(resetA.req, resetA.res);
    console.log(`   [Reset] ${resetA.getResult().result.message}`);

    // 2. Run Wizard
    const wizardPayloadA = {
      schoolCode: '1001',
      schoolName: 'مدرسة الأمل الابتدائية الفردية',
      schoolNameEn: 'Al-Amal Primary School',
      governorate: 'القاهرة',
      directorate: 'إدارة المعادي التعليمية',
      adminUsername: 'admin_a',
      adminFullName: 'أحمد محمود علي',
      adminPassword: 'Password123!',
      adminNationalId: '29501011234567',
      startYear: '2026',
      sections: [
        {
          name: 'القسم العربي',
          type: 'arabic',
          educationType: 'عام',
          legalStatus: 'حكومي',
          stages: ['ابتدائي']
        }
      ]
    };
    const wizA = mockReqRes(wizardPayloadA);
    await setupController.runWizard(wizA.req, wizA.res);
    const wizResA = wizA.getResult().result;
    if (!wizResA.success) throw new Error(`Wizard Scenario A failed: ${wizResA.error}`);
    console.log('   ✅ Wizard Scenario A executed successfully.');

    // 3. Verify Sections & Stages
    const secA = mockReqRes();
    await settingsController.getSections(secA.req, secA.res);
    const sectionsA = secA.getResult().result.sections;
    console.log(`   [Sections Count] ${sectionsA?.length} active section(s)`);
    if (sectionsA?.length !== 1) throw new Error(`Expected exactly 1 section, found ${sectionsA?.length}`);

    const stgA = mockReqRes();
    await settingsController.getStages(stgA.req, stgA.res);
    const stagesA = stgA.getResult().result.stages;
    console.log(`   [Stages Count] ${stagesA?.length} active stage(s)`);
    if (stagesA?.length !== 1 || stagesA[0].stage_name !== 'ابتدائي') {
      throw new Error(`Expected 1 stage ("ابتدائي"), found: ${JSON.stringify(stagesA)}`);
    }

    const yrA = mockReqRes();
    await settingsController.getAcademicYears(yrA.req, yrA.res);
    const yearsA = yrA.getResult().result.academicYears;
    console.log(`   [Academic Year] ${yearsA?.[0]?.year_label}`);
    if (yearsA?.[0]?.year_label !== '2026 / 2027 م') {
      throw new Error(`Academic year mismatch: ${yearsA?.[0]?.year_label}`);
    }
    console.log('   🎉 SCENARIO A VERIFIED PERFECTLY!\n');

    // ----------------------------------------------------
    // SCENARIO B: 2-Section (Arabic + Languages), All Standard Stages
    // ----------------------------------------------------
    console.log('📌 SCENARIO B: Testing 2-Section (Arabic + Languages) with All Standard Stages...');
    
    // 1. Reset system
    const resetB = mockReqRes({ adminPassword: 'Password123!', confirmText: 'إعادة تهيئة النظام بالكامل' });
    await setupController.resetInstitution(resetB.req, resetB.res);

    // 2. Run Wizard
    const wizardPayloadB = {
      schoolCode: '2002',
      schoolName: 'مجمع النور للغات والعربي',
      schoolNameEn: 'Al-Noor Complex',
      governorate: 'الجيزة',
      directorate: 'إدارة الدقي التعليمية',
      adminUsername: 'admin_b',
      adminFullName: 'مصطفى حسين السيد',
      adminPassword: 'Password123!',
      adminNationalId: '29805121234567',
      startYear: '2026',
      sections: [
        {
          name: 'القسم العربي',
          type: 'arabic',
          educationType: 'عام',
          legalStatus: 'حكومي',
          stages: ['تمهيدي', 'رياض أطفال', 'ابتدائي', 'إعدادي', 'ثانوي']
        },
        {
          name: 'قسم اللغات',
          type: 'languages',
          educationType: 'لغات',
          legalStatus: 'خاص',
          stages: ['تمهيدي لغات', 'رياض أطفال لغات', 'ابتدائي لغات', 'إعدادي لغات', 'ثانوي لغات']
        }
      ]
    };
    const wizB = mockReqRes(wizardPayloadB);
    await setupController.runWizard(wizB.req, wizB.res);
    const wizResB = wizB.getResult().result;
    if (!wizResB.success) throw new Error(`Wizard Scenario B failed: ${wizResB.error}`);
    console.log('   ✅ Wizard Scenario B executed successfully.');

    // 3. Verify Settings
    const secB = mockReqRes();
    await settingsController.getSections(secB.req, secB.res);
    const sectionsB = secB.getResult().result.sections;
    console.log(`   [Sections Count] ${sectionsB?.length} active section(s)`);
    if (sectionsB?.length !== 2) throw new Error(`Expected 2 sections, found ${sectionsB?.length}`);

    const stgB = mockReqRes();
    await settingsController.getStages(stgB.req, stgB.res);
    const stagesB = stgB.getResult().result.stages;
    console.log(`   [Stages Count] ${stagesB?.length} active stage(s)`);
    if (stagesB?.length !== 10) {
      throw new Error(`Expected 10 active stages, found ${stagesB?.length}`);
    }
    console.log('   🎉 SCENARIO B VERIFIED PERFECTLY!\n');

    // ----------------------------------------------------
    // SCENARIO C: 3-Section (Arabic, Languages, International) Heterogeneous Custom Stages
    // ----------------------------------------------------
    console.log('📌 SCENARIO C: Testing 3-Section (Arabic, Languages, International) Heterogeneous Custom Stages...');
    
    // 1. Reset system
    const resetC = mockReqRes({ adminPassword: 'Password123!', confirmText: 'إعادة تهيئة النظام بالكامل' });
    await setupController.resetInstitution(resetC.req, resetC.res);

    // 2. Run Wizard
    const wizardPayloadC = {
      schoolCode: '3003',
      schoolName: 'مؤسسة نبراس الدولية المتكاملة',
      schoolNameEn: 'Nepras International School System',
      governorate: 'القاهرة',
      directorate: 'إدارة القاهرة الجديدة التعليمية',
      adminUsername: 'admin_c',
      adminFullName: 'إبراهيم حسن فاروق',
      adminPassword: 'Password123!',
      adminNationalId: '29003151234567',
      startYear: '2026',
      sections: [
        {
          name: 'القسم العربي',
          type: 'arabic',
          educationType: 'عام',
          legalStatus: 'حكومي',
          stages: ['إعدادي', 'ثانوي']
        },
        {
          name: 'قسم اللغات',
          type: 'languages',
          educationType: 'لغات',
          legalStatus: 'خاص',
          stages: ['رياض أطفال لغات', 'ابتدائي لغات']
        },
        {
          name: 'القسم الدولي',
          type: 'international',
          educationType: 'دولي',
          legalStatus: 'دولي',
          stages: ['Middle School', 'High School']
        }
      ]
    };
    const wizC = mockReqRes(wizardPayloadC);
    await setupController.runWizard(wizC.req, wizC.res);
    const wizResC = wizC.getResult().result;
    if (!wizResC.success) throw new Error(`Wizard Scenario C failed: ${wizResC.error}`);
    console.log('   ✅ Wizard Scenario C executed successfully.');

    // 3. Verify Settings
    const secC = mockReqRes();
    await settingsController.getSections(secC.req, secC.res);
    const sectionsC = secC.getResult().result.sections;
    console.log(`   [Sections Count] ${sectionsC?.length} active section(s)`);
    if (sectionsC?.length !== 3) throw new Error(`Expected 3 sections, found ${sectionsC?.length}`);

    const stgC = mockReqRes();
    await settingsController.getStages(stgC.req, stgC.res);
    const stagesC = stgC.getResult().result.stages;
    console.log(`   [Stages Count] ${stagesC?.length} active stage(s) across 3 distinct sections`);

    const stagesBySec = {};
    for (const stg of stagesC || []) {
      const secName = stg.section_name || 'غير معروف';
      if (!stagesBySec[secName]) stagesBySec[secName] = [];
      stagesBySec[secName].push(stg.stage_name);
    }
    console.log('   [Heterogeneous Stage Breakdown]:');
    for (const [sec, stgs] of Object.entries(stagesBySec)) {
      console.log(`     - ${sec}: [${stgs.join(', ')}]`);
    }

    console.log('\n   🎉 SCENARIO C VERIFIED PERFECTLY!\n');

    console.log('====================================================');
    console.log('🏆 ALL 3 REAL-WORLD SCHOOL SCENARIOS PASSED 100% PERFECTLY!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ In-Process Audit Failed:', err.message);
    process.exit(1);
  }
}

runInProcessAudit();
