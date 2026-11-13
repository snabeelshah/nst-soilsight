export interface Translations {
  appName: string
  tagline: string
  challengeBadge: string
  selectField: string
  drawPrompt: string
  clearBoundary: string
  centerCoords: string
  fieldArea: string
  hectares: string
  acres: string
  fetchData: string
  loadingNasa: string
  tabs: {
    overview: string
    nasa: string
    risk: string
    crops: string
    scoring: string
    simulator: string
    irrigation: string
    soil: string
    action: string
    trends: string
    assistant: string
  }
  confidence: {
    observed: string
    modelled: string
    estimated: string
  }
  riskCalendar: {
    title: string
    subtitle: string
    low: string
    medium: string
    high: string
    noRisk: string
  }
  strategies: {
    baseline: string
    soilFirst: string
    waterSaver: string
    overallScore: string
    soilHealth: string
    waterConservation: string
    marketValue: string
    nitrogenFixing: string
    erosionControl: string
    riskReduction: string
    benefits: string
    gaps: string
    expertBanner: string
  }
  simulator: {
    title: string
    subtitle: string
    tempSlider: string
    rainSlider: string
    reset: string
    beforeStress: string
    afterStress: string
  }
  irrigation: {
    title: string
    subtitle: string
    monthlyGap: string
    annualNeed: string
    annualRain: string
    deficit: string
  }
  soilAdvisor: {
    title: string
    subtitle: string
    ph: string
    soc: string
    texture: string
    nitrogen: string
  }
  actionPlan: {
    title: string
    subtitle: string
    downloadPdf: string
    expertDisclaimer: string
  }
  quickDemos: string
}

export const translations: Record<'en' | 'ur', Translations> = {
  en: {
    appName: 'NST SoilSight',
    tagline: 'NASA Earth Observations for Climate-Adaptive Crop Rotations & Soil Resilience',
    challengeBadge: 'NASA Space Apps Challenge 2026',
    selectField: 'Select or Draw Your Field',
    drawPrompt: 'Draw a polygon on the map to define your farm boundary and initiate NASA satellite analysis.',
    clearBoundary: 'Clear Boundary',
    centerCoords: 'Center Coordinates',
    fieldArea: 'Field Area',
    hectares: 'ha',
    acres: 'acres',
    fetchData: 'Fetch NASA Satellite & Soil Data',
    loadingNasa: 'Querying NASA POWER & SoilGrids APIs...',
    tabs: {
      overview: 'Overview',
      nasa: 'NASA Climate',
      risk: '12-Month Risk',
      crops: 'Crop Rotations',
      scoring: 'Scoring Engine',
      simulator: 'Climate Stress Sim',
      irrigation: 'Water & Irrigation',
      soil: 'Soil Health',
      action: 'Next-Season Plan',
      trends: 'Historical Trends',
      assistant: 'Farm AI Advisor',
    },
    confidence: {
      observed: 'Observed (Satellite Sensors)',
      modelled: 'Modelled (NASA POWER Fusion)',
      estimated: 'Estimated (Pedological Model)',
    },
    riskCalendar: {
      title: '12-Month Weather & Agro-Ecological Risk Calendar',
      subtitle: 'Derived from multi-year NASA climate observations. Click any month to analyze thermal, moisture, and exposure hazards.',
      low: 'Low Risk',
      medium: 'Moderate Risk',
      high: 'Severe Risk',
      noRisk: 'Optimal Growing Window',
    },
    strategies: {
      baseline: 'Baseline Rotation',
      soilFirst: 'Soil Restoration Strategy',
      waterSaver: 'Water-Smart Rotation',
      overallScore: 'Overall Resilience Score',
      soilHealth: 'Soil Health & Carbon',
      waterConservation: 'Water Conservation',
      marketValue: 'Market & Economic Value',
      nitrogenFixing: 'Biological Nitrogen Fixation',
      erosionControl: 'Erosion Prevention',
      riskReduction: 'Pest & Climate Buffering',
      benefits: 'Agronomic Benefits',
      gaps: 'Information Gaps & Constraints',
      expertBanner: 'Notice: This rotation has agronomic indicators that require local agricultural extension verification before adoption.',
    },
    simulator: {
      title: 'Climate Stress Simulator',
      subtitle: 'Stress-test rotation viability under extreme warming (+0°C to +5°C) and precipitation deficits (-50% to +50%).',
      tempSlider: 'Temperature Anomaly',
      rainSlider: 'Rainfall Deviation',
      reset: 'Reset to Observed Baseline',
      beforeStress: 'Current Baseline Climate',
      afterStress: 'Stressed Climate Scenario',
    },
    irrigation: {
      title: 'Smart Irrigation & Water Gap Planner',
      subtitle: 'Calculated as monthly crop evapotranspiration requirement (ETc) minus NASA-observed rainfall.',
      monthlyGap: 'Monthly Supplemental Water Gap (mm)',
      annualNeed: 'Total Crop Water Requirement',
      annualRain: 'Effective Rainfall',
      deficit: 'Supplemental Water Deficit',
    },
    soilAdvisor: {
      title: 'Soil Health & Fertility Diagnostics',
      subtitle: 'ISRIC SoilGrids 250m machine-learning profile with pedological heuristics.',
      ph: 'Soil pH (H₂O)',
      soc: 'Soil Organic Carbon',
      texture: 'USDA Texture Class',
      nitrogen: 'Total Nitrogen Stock',
    },
    actionPlan: {
      title: 'Next-Season Field Action Protocol',
      subtitle: 'Dynamic seasonal roadmap generated for your top-ranked rotation strategy.',
      downloadPdf: 'Export Action Plan',
      expertDisclaimer: 'This protocol is generated from NASA Earth observations and global crop databases. Always consult your district extension agronomist regarding local seed cultivars, pest quarantines, and groundwater rights.',
    },
    quickDemos: 'Quick Demo Locations:',
  },
  ur: {
    appName: 'این ایس ٹی سوئل سائٹ',
    tagline: 'ناسا کے سیٹلائٹ مشاہدات برائے موسمیاتی موافقت اور زمین کی زرخیزی',
    challengeBadge: 'ناسا اسپیس ایپس چیلنج 2026',
    selectField: 'اپنا کھیت منتخب کریں یا نشان لگائیں',
    drawPrompt: 'اپنے فارم کی حدود بنانے کے لیے نقشے پر پولی گون بنائیں تاکہ ناسا کے سیٹلائٹ ڈیٹا کا تجزیہ شروع کیا جا سکے۔',
    clearBoundary: 'حدود ختم کریں',
    centerCoords: 'مرکزی نقاط (مقام)',
    fieldArea: 'کھیت کا رقبہ',
    hectares: 'ہیکٹر',
    acres: 'ایکڑ',
    fetchData: 'ناسا اور مٹی کا ڈیٹا حاصل کریں',
    loadingNasa: 'ناسا پاور اور مٹی کے ڈیٹا بیس سے رابطہ ہو رہا ہے...',
    tabs: {
      overview: 'جائزہ',
      nasa: 'ناسا موسمیات',
      risk: '12 ماہ کے خطرات',
      crops: 'فصلوں کا چکر',
      scoring: 'ترجیحی درجہ بندی',
      simulator: 'موسمیاتی دباؤ سمولیٹر',
      irrigation: 'پانی اور آبپاشی',
      soil: 'زمین کی صحت',
      action: 'اگلے سیزن کا لائحہ عمل',
      trends: 'تاریخی رجحانات',
      assistant: 'فارم اے آئی مشیر',
    },
    confidence: {
      observed: 'مشاہداتی (سیٹلائٹ سینسرز)',
      modelled: 'ماڈل شدہ (ناسا پاور فیوژن)',
      estimated: 'تخمینہ شدہ (مٹی کا ماڈل)',
    },
    riskCalendar: {
      title: '12 ماہ کا موسمیاتی اور زرعی خطرات کا کیلنڈر',
      subtitle: 'ناسا کے کثیر سالہ مشاہدات کی بنیاد پر۔ حرارت، خشک سالی اور کھلے کھیت کے خطرات جاننے کے لیے کسی بھی مہینے پر کلک کریں۔',
      low: 'کم خطرہ',
      medium: 'درمیانہ خطرہ',
      high: 'شدید خطرہ',
      noRisk: 'کاشت کے لیے بہترین وقت',
    },
    strategies: {
      baseline: 'بنیادی روایتی چکر',
      soilFirst: 'مٹی بحالی کی حکمت عملی',
      waterSaver: 'پانی بچت حکمت عملی',
      overallScore: 'مجموعی پائیداری سکور',
      soilHealth: 'مٹی کی زرخیزی اور نامیاتی مادہ',
      waterConservation: 'پانی کی بچت',
      marketValue: 'مارکیٹ اور معاشی منافع',
      nitrogenFixing: 'قدرتی نائٹروجن کی فراہمی',
      erosionControl: 'کٹاؤ سے بچاؤ',
      riskReduction: 'بیماریوں اور کیڑوں سے تحفظ',
      benefits: 'زرعی فوائد',
      gaps: 'معلوماتی خلا اور رکاوٹیں',
      expertBanner: 'توجہ: اس روٹیشن میں زرعی نکات ہیں جن پر عمل سے قبل مقامی زرعی ماہر سے تصدیق ضروری ہے۔',
    },
    simulator: {
      title: 'موسمیاتی دباؤ کا سمولیٹر',
      subtitle: 'درجہ حرارت میں اضافے (+0 سے +5 ڈگری) اور بارش میں کمی (-50% سے +50%) کے اثرات کا تجربہ کریں۔',
      tempSlider: 'اضافی درجہ حرارت',
      rainSlider: 'بارش میں تبدیلی',
      reset: 'اصل بنیاد پر واپس لائیں',
      beforeStress: 'موجودہ موسمی حالات',
      afterStress: 'تبدیل شدہ موسمیاتی منظر نامہ',
    },
    irrigation: {
      title: 'سمارٹ آبپاشی اور پانی کی کمی کا منصوبہ ساز',
      subtitle: 'فصل کی ماہانہ پانی کی ضرورت اور بارش کے فرق کا تجزیہ۔',
      monthlyGap: 'ماہانہ اضافی پانی کی ضرورت (ملی میٹر)',
      annualNeed: 'فصل کی کل پانی کی ضرورت',
      annualRain: 'متوقع بارش',
      deficit: 'پانی کی متوقع کمی',
    },
    soilAdvisor: {
      title: 'زمین کی صحت اور زرخیزی کی تشخیص',
      subtitle: 'عالمی سطح پر تصدیق شدہ سوئل گرڈز اور پیڈولوجیکل ماڈل۔',
      ph: 'مٹی کی پی ایچ (pH)',
      soc: 'نامیاتی کاربن (SOC)',
      texture: 'مٹی کی ساخت (Texture)',
      nitrogen: 'کل نائٹروجن کی مقدار',
    },
    actionPlan: {
      title: 'اگلے سیزن کے عملی اقدامات کا پروٹوکول',
      subtitle: 'آپ کی ترجیحی حکمت عملی کے مطابق تیار کردہ موسمی ہدایات۔',
      downloadPdf: 'منصوبہ محفوظ کریں',
      expertDisclaimer: 'یہ منصوبہ ناسا کے مشاہدات اور عالمی ڈیٹا پر مبنی ہے۔ بیج کے انتخاب اور مقامی بیماریوں کے لیے اپنے قریبی محکمہ زراعت سے مشورہ ضرور کریں۔',
    },
    quickDemos: 'فوری آزمائشی مقامات:',
  },
}
