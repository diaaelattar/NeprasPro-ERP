; ===================================================================
; NeprasPro Arabic NSIS Localization and Branding Script
; ===================================================================

!macro customHeader
  !define MUI_TEXT_WELCOME_INFO_TITLE "مرحباً بك في معالج تثبيت منظومة نبرأس برو التعليمية (NeprasPro ERP)"
  !define MUI_TEXT_WELCOME_INFO_TEXT "سيقوم هذا البرنامج بتثبيت منظومة نبرأس برو لإدارة المدارس والكنترول على جهازك.$\r$\n$\r$\nيرجى إغلاق أي نوافذ أخرى قبل المتابعة.$\r$\n$\r$\nاضغط على (التالي) للبدء في التثبيت."
  
  !define MUI_TEXT_DIRECTORY_TITLE "اختيار مسار التثبيت"
  !define MUI_TEXT_DIRECTORY_SUBTITLE "اختر المجلد الذي ترغب في تثبيت منظومة نبرأس برو داخله."
  
  !define MUI_TEXT_INSTALLING_TITLE "جاري تثبيت ملفات منظومة نبرأس برو..."
  !define MUI_TEXT_INSTALLING_SUBTITLE "يرجى الانتظار ريثما يتم تجهيز ملفات المنظومة ومحرك قواعد البيانات على جهازك."
  
  !define MUI_TEXT_FINISH_INFO_TITLE "تهانينا! اكتمل تثبيت منظومة نبرأس برو بنجاح"
  !define MUI_TEXT_FINISH_INFO_TEXT "تم تثبيت كافة ملفات المنظومة وقواعد البيانات على جهازك بنجاح.$\r$\n$\r$\nاضغط على (إنهاء) لتشغيل المنظومة والبدء الفوري."
  !define MUI_TEXT_FINISH_INFO_REBOOT "يجب إعادة تشغيل جهاز الكمبيوتر لإتمام التثبيت."
  !define MUI_TEXT_FINISH_RUN "تشغيل منظومة نبرأس برو الآن"
  
  !define MUI_BUTTONTEXT_NEXT "التالي ⬅"
  !define MUI_BUTTONTEXT_BACK "➡ رجوع"
  !define MUI_BUTTONTEXT_CANCEL "إلغاء"
  !define MUI_BUTTONTEXT_FINISH "إنهاء وتشغيل"
!macroend

!macro customInit
  ; Initialization tasks
!macroend
