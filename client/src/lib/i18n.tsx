import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "hi";

export interface Translations {
  [key: string]: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Navigation & Common
    "app.title": "NirVayu",
    "nav.citizen": "Citizen Portal",
    "nav.authority": "Authority Command",
    "nav.login": "Authority Login",
    "nav.logout": "Logout",
    "nav.backHome": "Back to Home",
    "common.loading": "Loading...",
    "common.realtime": "Real-time",
    "common.submit": "Submit",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.restore": "Restore",
    "common.all": "All",
    "common.active": "Active",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.view": "View",
    "common.verified": "Verified",
    "common.pending": "Pending",
    "common.rejected": "Rejected",
    "common.lastUpdated": "Last Updated",
    "common.emergency": "EMERGENCY",
    "common.credits": "Credits",
    "common.pts": "pts",
    "common.tons": "tons",

    // Home / Landing Page
    "home.liveSystemPill": "Live Ward-Wise Air Monitoring",
    "home.heroTitle1": "Breathing data into",
    "home.heroTitle2": "actionable change.",
    "home.heroSubtitle": "A smart platform connecting citizens with real-time health advice and authorities with ward-level pollution controls.",
    "home.citizenCard.title": "Citizen Portal",
    "home.citizenCard.desc": "Check your local air quality, get daily safe outdoor timings, and earn credits for green actions.",
    "home.citizenCard.cta": "Open Citizen Portal",
    "home.authorityCard.title": "Authority Hub",
    "home.authorityCard.desc": "Track ward-level pollution, test policy impacts (Odd-Even, dust control), and activate emergency rules.",
    "home.authorityCard.cta": "Open Authority Hub",
    "home.footer": "© 2024 NirVayu System. Real-time air quality data by Delhi Ward Sensors.",
    "home.clock.caption": "Time left to limit warming to 1.5°C",
    "home.clock.yrs": "YRS",
    "home.clock.days": "DAYS",

    // Metrics
    "metric.aqi": "AQI",
    "metric.delhiAvgAqi": "Delhi Avg AQI",
    "metric.pm25": "PM 2.5",
    "metric.delhiAvgPm25": "Delhi Avg PM 2.5",
    "metric.pm10": "PM 10",
    "metric.delhiAvgPm10": "Delhi Avg PM 10",
    "metric.no2": "NO2",
    "metric.delhiAvgNo2": "Delhi Avg NO2",
    "metric.co2Budget": "CO2 Budget",
    "metric.delhiAvgCo2Budget": "Delhi Avg CO2 Budget",

    // Status Levels
    "status.good": "Good",
    "status.moderate": "Moderate",
    "status.unhealthy": "Poor",
    "status.veryUnhealthy": "Very Poor",
    "status.hazardous": "Severe",

    // Sources
    "source.traffic": "Traffic",
    "source.construction": "Construction Dust",
    "source.industry": "Factory Smoke",
    "source.waste": "Garbage Burning",
    "source.dust": "Road Dust",
    "source.general": "General Pollution",

    // Citizen Dashboard
    "citizen.searchPlaceholder": "Search your area (e.g. Rohini, Dwarka, Karol Bagh)...",
    "citizen.mapTitle": "Delhi Ward Map",
    "citizen.mapSubtitle": "Search your area or tap on the map to see local air quality.",
    "citizen.tab.map": "Ward Map",
    "citizen.tab.planner": "Health Planner",
    "citizen.tab.actions": "Daily Green Actions",
    "citizen.tab.report": "Report Pollution",
    "citizen.selectedWard": "Selected Ward",
    "citizen.selectWardPrompt": "Click on any ward to see local advice and pollution details",
    "citizen.delhiAverages": "Delhi Overall Average",

    // Safe Life Planner
    "planner.title": "Personalized Health & Outdoor Planner",
    "planner.subtitle": "Get safe outdoor timings and mask advice based on your health and local air quality.",
    "planner.age": "Your Age",
    "planner.agePlaceholder": "Enter age",
    "planner.healthCondition": "Health Condition",
    "planner.condition.none": "Healthy (No issues)",
    "planner.condition.asthma": "Asthma / Breathing Trouble",
    "planner.condition.heart": "Heart Problem / High BP",
    "planner.condition.bronchitis": "Cough / Bronchitis / Elderly",
    "planner.outdoorHours": "Hours planning to spend outside",
    "planner.generateBtn": "Get Safe Timings",
    "planner.generating": "Checking air quality...",
    "planner.safeWindows": "Best Time to Go Out",
    "planner.precautions": "Health Precautions",
    "planner.noData": "Fill in your details above and click 'Get Safe Timings' for AI health guidance.",

    // Daily Actions & Credits
    "actions.title": "Daily Green Actions & Rewards",
    "actions.subtitle": "Take simple eco-friendly steps and earn reward credits for your ward.",
    "actions.yourCredits": "Your Credits",
    "actions.wardCredits": "Ward Total Credits",
    "actions.action1.title": "Used Metro / Electric Bus",
    "actions.action1.desc": "Travelled by Delhi Metro or electric bus instead of personal car/bike.",
    "actions.action2.title": "Reported Garbage Burning",
    "actions.action2.desc": "Took a photo of local trash burning to help stop it.",
    "actions.action3.title": "Used Air Purifier or Plants",
    "actions.action3.desc": "Kept indoor plants (snake plant, areca palm) or used an air filter.",
    "actions.action4.title": "Shared Ride / Cycled",
    "actions.action4.desc": "Carpooled with friends or used a bicycle for nearby errands.",
    "actions.completeBtn": "Mark Done (+10 Credits)",
    "actions.completedBadge": "Done Today",

    // Incident Reporting
    "report.title": "Report Pollution in Your Area",
    "report.subtitle": "Upload a photo of pollution. AI will identify the cause and record it securely.",
    "report.wardLabel": "Ward Location",
    "report.selectWard": "Select ward...",
    "report.incidentType": "Type of Pollution",
    "report.type.waste": "Open Garbage Burning",
    "report.type.construction": "Construction Dust",
    "report.type.industry": "Factory Smoke",
    "report.type.vehicle": "Heavy Vehicle Smoke",
    "report.type.stubble": "Stubble / Biomass Burning",
    "report.description": "What did you see?",
    "report.descPlaceholder": "Tell us where this happened and what caused the smoke or dust...",
    "report.uploadPhoto": "Upload Pollution Photo",
    "report.takePhoto": "Take Live Photo",
    "report.photoSelected": "Photo Selected",
    "report.submitBtn": "Submit Report",
    "report.submitting": "Submitting report...",
    "report.success": "Report submitted and safely logged!",

    // Authority Dashboard
    "authority.title": "Delhi Pollution Control Center",
    "authority.lastUpdated": "Live Data Time",
    "authority.wardMonitor": "Ward Status List",
    "authority.activeWards": "Active Wards",
    "authority.jurisdictionDesc": "Real-time pollution across Delhi wards",
    "authority.emergencyProtocol": "Emergency Protocol",
    "authority.emergencyActive": "EMERGENCY ACTIVE",
    "authority.emergencyNormal": "Normal Status",
    "authority.tab.intelligence": "AI Insights",
    "authority.tab.simulation": "Test Rules (Simulation)",
    "authority.tab.reports": "Citizen Reports",

    // Authority AI Intel
    "intel.dominantSource": "Main Pollution Cause",
    "intel.severity": "Severity Level",
    "intel.prediction": "24-Hour Forecast",
    "intel.confidence": "Confidence",
    "intel.summary": "AI Summary",
    "intel.plan90Title": "90-Day Ward Action Plan",
    "intel.days0_30": "Day 0 - 30: Immediate Steps",
    "intel.days31_60": "Day 31 - 60: Strict Checks",
    "intel.days61_90": "Day 61 - 90: Long-Term Improvement",
    "intel.allowedControls": "Applicable Rules",

    // Authority Policy Simulation
    "sim.title": "Test Impact of Rules (Simulator)",
    "sim.subtitle": "See how much AQI drops by applying Odd-Even, halting construction, or spraying water.",
    "sim.trafficOddEven": "Odd-Even Vehicle Rule",
    "sim.constructionHalt": "Stop Construction Work",
    "sim.waterSprinkling": "Water Sprinkling & Smog Guns",
    "sim.industryHalt": "Restrict Factory Emissions",
    "sim.wasteBan": "Strict Ban on Waste Burning",
    "sim.calculate": "Calculate Impact",
    "sim.calculating": "Calculating...",
    "sim.projectedAqi": "Expected New AQI",
    "sim.estimatedReduction": "Estimated AQI Drop",

    // Authority Citizen Reports
    "audit.title": "Citizen Reports & Verified Record",
    "audit.subtitle": "Check citizen photos, verify records on blockchain, and take action.",
    "audit.table.id": "Report ID",
    "audit.table.ward": "Ward",
    "audit.table.type": "Type",
    "audit.table.desc": "Details",
    "audit.table.hash": "Blockchain Code",
    "audit.table.status": "Status",
    "audit.table.actions": "Action",
    "audit.verify": "Verify",
    "audit.reject": "Dismiss",
    "audit.ledgerVerified": "Verified on Ledger",

    // Auth Page
    "auth.authorityAccess": "Authority Login",
    "auth.restrictedDesc": "For authorized government and municipality officers only.",
    "auth.authorityId": "Officer / Authority ID",
    "auth.idPlaceholder": "Enter ID (e.g. admin)",
    "auth.accessCode": "Password",
    "auth.codePlaceholder": "••••••••",
    "auth.authorizeBtn": "Login to Portal",
    "auth.securityNotice": "All logins are securely monitored and recorded.",
    "auth.orPublic": "Or check public air data",
    "auth.enterCitizen": "Go to Citizen Portal",
    "auth.sideTitle": "Clean Air for Every Delhi Ward",
    "auth.sideDesc": "NirVayu is Delhi's smart air pollution dashboard. Check live AQI, report local pollution, and protect your family's health.",
    "auth.stat1.val": "272+",
    "auth.stat1.label": "Delhi Wards",
    "auth.stat2.val": "Live AI",
    "auth.stat2.label": "Air Forecast",

    // Language Toggle
    "lang.toggle": "Switch Language",
    "lang.en": "English",
    "lang.hi": "हिन्दी",

    // News Bulletin Ticker
    "news.label": "Delhi Pollution",
    "news.zoneLabel": "{zone} Air Quality",
    "news.loading": "Loading news for {zone}…",
    "news.notFound": "No news found for {zone}.",
    "news.agoMinutes": "{m}m ago",
    "news.agoHours": "{h}h ago",
    "news.agoDays": "{d}d ago",

    // Air Quality Chatbot
    "chat.badge": "Ask NirVayu AI ✨",
    "chat.title": "NirVayu AI",
    "chat.subtitle": "Air Quality Assistant · Delhi",
    "chat.welcome": "Hi! I'm NirVayu AI 🌿 I can help you with air quality questions, AQI levels, health tips, and how to report pollution in Delhi. What would you like to know?",
    "chat.placeholder": "Ask about AQI, pollution, health tips…",
    "chat.listening": "Listening...",
    "chat.speaking": "Speaking...",
    "chat.micUnsupported": "Voice input not supported in browser",
    "chat.autoSpeechOn": "Auto Voice Readout On",
    "chat.autoSpeechOff": "Auto Voice Readout Off",
    "chat.sug.1": "What does AQI 200 mean?",
    "chat.sug.2": "How do I file a report?",
    "chat.sug.3": "Why is Delhi air so bad?",
    "chat.sug.4": "How to protect myself from smog?",
    "chat.sug.5": "What causes stubble burning?",
    "chat.sug.6": "Is today safe to go outside?",
  },
  hi: {
    // Navigation & Common - सरल और बोलचाल की हिंदी
    "app.title": "निर्वायु",
    "nav.citizen": "नागरिक पोर्टल",
    "nav.authority": "अधिकारी पोर्टल",
    "nav.login": "अधिकारी लॉगिन",
    "nav.logout": "लॉगआउट",
    "nav.backHome": "होम पेज",
    "common.loading": "लोड हो रहा है...",
    "common.realtime": "लाइव",
    "common.submit": "जमा करें",
    "common.cancel": "रद्द करें",
    "common.save": "सेव करें",
    "common.delete": "हटाएं",
    "common.restore": "वापस लाएं",
    "common.all": "सभी",
    "common.active": "सक्रिय",
    "common.status": "स्थिति",
    "common.actions": "कार्रवाई",
    "common.view": "देखें",
    "common.verified": "सत्यापित",
    "common.pending": "लंबित",
    "common.rejected": "खारिज",
    "common.lastUpdated": "अपडेट का समय",
    "common.emergency": "आपातकाल (Emergency)",
    "common.credits": "क्रेडिट",
    "common.pts": "पॉइंट्स",
    "common.tons": "टन",

    // Home / Landing Page
    "home.liveSystemPill": "दिल्ली के सभी वार्डों की लाइव हवा की स्थिति",
    "home.heroTitle1": "हवा के लाइव डेटा से",
    "home.heroTitle2": "स्वच्छ दिल्ली की ओर कदम।",
    "home.heroSubtitle": "नागरिकों के लिए सही समय पर स्वास्थ्य सलाह और अधिकारियों के लिए प्रदूषण पर तुरंत रोक लगाने का आसान मंच।",
    "home.citizenCard.title": "नागरिक पोर्टल",
    "home.citizenCard.desc": "अपने इलाके की हवा का हाल जानें, बाहर जाने का सुरक्षित समय देखें और अच्छे कार्यों से क्रेडिट जीतें।",
    "home.citizenCard.cta": "नागरिक पोर्टल खोलें",
    "home.authorityCard.title": "अधिकारी पोर्टल",
    "home.authorityCard.desc": "वार्ड अनुसार प्रदूषण ट्रैक करें, नए नियमों (जैसे ऑड-इवन, पानी का छिड़काव) का असर देखें और सख्त कदम उठाएं।",
    "home.authorityCard.cta": "अधिकारी पोर्टल खोलें",
    "home.footer": "© 2024 निर्वायु। दिल्ली के वार्ड सेंसर द्वारा लाइव डेटा।",
    "home.clock.caption": "ग्लोबल वार्मिंग 1.5°C तक रोकने का बचा हुआ समय",
    "home.clock.yrs": "साल",
    "home.clock.days": "दिन",

    // Metrics
    "metric.aqi": "AQI (हवा की गुणवत्ता)",
    "metric.delhiAvgAqi": "दिल्ली का औसत AQI",
    "metric.pm25": "PM 2.5 (महीन धूल)",
    "metric.delhiAvgPm25": "दिल्ली औसत PM 2.5",
    "metric.pm10": "PM 10 (धूल कण)",
    "metric.delhiAvgPm10": "दिल्ली औसत PM 10",
    "metric.no2": "NO2 (गैस)",
    "metric.delhiAvgNo2": "दिल्ली औसत NO2",
    "metric.co2Budget": "CO2 बजट",
    "metric.delhiAvgCo2Budget": "दिल्ली औसत CO2 बजट",

    // Status Levels
    "status.good": "अच्छा (Good)",
    "status.moderate": "मध्यम (Moderate)",
    "status.unhealthy": "खराब (Poor)",
    "status.veryUnhealthy": "बहुत खराब (Very Poor)",
    "status.hazardous": "गंभीर (Severe)",

    // Sources
    "source.traffic": "गाड़ियों का धुआं",
    "source.construction": "कन्स्ट्रक्शन की धूल",
    "source.industry": "फैक्ट्री का धुआं",
    "source.waste": "कचरा जलाना",
    "source.dust": "सड़क की धूल",
    "source.general": "सामान्य प्रदूषण",

    // Citizen Dashboard
    "citizen.searchPlaceholder": "अपना इलाका खोजें (उदा. रोहिणी, द्वारका, करोल बाग)...",
    "citizen.mapTitle": "दिल्ली वार्ड का नक्शा",
    "citizen.mapSubtitle": "अपने इलाके का नाम खोजें या नक्शे पर क्लिक करके हवा की गुणवत्ता देखें।",
    "citizen.tab.map": "वार्ड नक्शा",
    "citizen.tab.planner": "स्वास्थ्य प्लानर",
    "citizen.tab.actions": "दैनिक पर्यावरण कार्य",
    "citizen.tab.report": "शिकायत दर्ज करें",
    "citizen.selectedWard": "चुना हुआ वार्ड",
    "citizen.selectWardPrompt": "इलाके की पूरी जानकारी और सलाह देखने के लिए कोई वार्ड चुनें",
    "citizen.delhiAverages": "पूरी दिल्ली का औसत हाल",

    // Safe Life Planner
    "planner.title": "दैनिक स्वास्थ्य व सुरक्षित समय प्लानर",
    "planner.subtitle": "आपकी उम्र, सेहत और इलाके की हवा के अनुसार बाहर जाने का सबसे सुरक्षित समय।",
    "planner.age": "आपकी उम्र",
    "planner.agePlaceholder": "उम्र दर्ज करें",
    "planner.healthCondition": "स्वास्थ्य स्थिति",
    "planner.condition.none": "स्वस्थ (कोई समस्या नहीं)",
    "planner.condition.asthma": "अस्थमा / सांस लेने में तकलीफ",
    "planner.condition.heart": "दिल की बीमारी / बीपी",
    "planner.condition.bronchitis": "खांसी / बुजुर्ग / ब्रोंकाइटिस",
    "planner.outdoorHours": "कितने घंटे बाहर रहना है?",
    "planner.generateBtn": "सुरक्षित समय पता करें",
    "planner.generating": "हवा की जांच हो रही है...",
    "planner.safeWindows": "बाहर जाने का सुरक्षित समय",
    "planner.precautions": "जरूरी सावधानियां",
    "planner.noData": "ऊपर अपनी जानकारी भरें और AI सलाह पाने के लिए 'सुरक्षित समय पता करें' पर क्लिक करें।",

    // Daily Actions & Credits
    "actions.title": "दैनिक अच्छे कार्य और वार्ड क्रेडिट",
    "actions.subtitle": "पर्यावरण के लिए छोटे-छोटे कदम उठाएं और अपने वार्ड के लिए पॉइंट्स (क्रेडिट) जीतें।",
    "actions.yourCredits": "आपके क्रेडिट",
    "actions.wardCredits": "वार्ड के कुल क्रेडिट",
    "actions.action1.title": "मेट्रो या इलेक्ट्रिक बस का उपयोग",
    "actions.action1.desc": "निजी गाड़ी के बजाय दिल्ली मेट्रो या DTC इलेक्ट्रिक बस से सफर किया।",
    "actions.action2.title": "कचरा जलाने की रिपोर्ट की",
    "actions.action2.desc": "इलाके में कचरा जलते देख उसकी फोटो खींचकर शिकायत भेजी।",
    "actions.action3.title": "एयर प्यूरीफायर या पौधे लगाए",
    "actions.action3.desc": "घर में स्नेक प्लांट, एरेका पाम या फिल्टर का उपयोग किया।",
    "actions.action4.title": "कारपूलिंग या साइकिल चलाई",
    "actions.action4.desc": "सहकर्मियों के साथ गाड़ी शेयर की या पास की दूरी के लिए साइकिल का इस्तेमाल किया।",
    "actions.completeBtn": "कार्य पूरा किया (+10 क्रेडिट)",
    "actions.completedBadge": "आज पूरा हुआ",

    // Incident Reporting
    "report.title": "प्रदूषण की शिकायत दर्ज करें",
    "report.subtitle": "प्रदूषण की फोटो खींचकर भेजें। AI तुरंत कारण की पहचान कर इसे सुरक्षित रिकॉर्ड करेगा।",
    "report.wardLabel": "वार्ड का नाम",
    "report.selectWard": "वार्ड चुनें...",
    "report.incidentType": "प्रदूषण का कारण",
    "report.type.waste": "खुले में कचरा जलाना",
    "report.type.construction": "कन्स्ट्रक्शन की खुली धूल",
    "report.type.industry": "फैक्ट्री का काला धुआं",
    "report.type.vehicle": "गाड़ियों का अत्यधिक धुआं",
    "report.type.stubble": "पराली जलाना",
    "report.description": "आपने क्या देखा? (विवरण)",
    "report.descPlaceholder": "स्थान और प्रदूषण के बारे में थोड़ा बताएं...",
    "report.uploadPhoto": "फोटो अपलोड करें",
    "report.takePhoto": "कैमरे से फोटो लें",
    "report.photoSelected": "फोटो चुनी गई",
    "report.submitBtn": "शिकायत दर्ज करें",
    "report.submitting": "दर्ज हो रहा है...",
    "report.success": "शिकायत सफलतापूर्वक दर्ज हो गई और रिकॉर्ड सुरक्षित हो गया!",

    // Authority Dashboard
    "authority.title": "पर्यावरण कंट्रोल सेंटर",
    "authority.lastUpdated": "डेटा अपडेट समय",
    "authority.wardMonitor": "वार्ड सूची",
    "authority.activeWards": "सक्रिय वार्ड",
    "authority.jurisdictionDesc": "दिल्ली के सभी वार्डों की लाइव स्थिति",
    "authority.emergencyProtocol": "आपातकालीन नियम",
    "authority.emergencyActive": "आपातकाल लागू है",
    "authority.emergencyNormal": "सामान्य स्थिति",
    "authority.tab.intelligence": "AI विश्लेषण",
    "authority.tab.simulation": "नियमों का असर (सिम्युलेटर)",
    "authority.tab.reports": "नागरिक शिकायतें",

    // Authority AI Intel
    "intel.dominantSource": "मुख्य प्रदूषण का कारण",
    "intel.severity": "गंभीरता स्तर",
    "intel.prediction": "24 घंटे का पूर्वानुमान",
    "intel.confidence": "सटीकता",
    "intel.summary": "AI विश्लेषण सारांश",
    "intel.plan90Title": "90 दिनों का एक्शन प्लान",
    "intel.days0_30": "दिन 0 - 30: तुरंत किए जाने वाले उपाय",
    "intel.days31_60": "दिन 31 - 60: सख्त जांच व निगरानी",
    "intel.days61_90": "दिन 61 - 90: दीर्घकालिक सुधार",
    "intel.allowedControls": "लागू किए जा सकने वाले नियम",

    // Authority Policy Simulation
    "sim.title": "नियमों का असर जांचें (सिम्युलेटर)",
    "sim.subtitle": "जांचें कि ऑड-इवन, पानी छिड़काव या निर्माण रोकने से AQI कितना कम होगा।",
    "sim.trafficOddEven": "ऑड-इवन (Odd-Even) गाड़ी नियम",
    "sim.constructionHalt": "कन्स्ट्रक्शन काम पर रोक",
    "sim.waterSprinkling": "पानी का छिड़काव और स्मॉग गन",
    "sim.industryHalt": "फैक्ट्रियों के धुएं पर रोक",
    "sim.wasteBan": "कचरा जलाने पर सख्त रोक",
    "sim.calculate": "असर की गणना करें",
    "sim.calculating": "गणना हो रही है...",
    "sim.projectedAqi": "अनुमानित नया AQI",
    "sim.estimatedReduction": "AQI में अनुमानित कमी",

    // Authority Citizen Reports
    "audit.title": "नागरिक शिकायतें और रिकॉर्ड",
    "audit.subtitle": "नागरिकों की शिकायतों की जांच करें, समाधान करें और रिकॉर्ड सत्यापित करें।",
    "audit.table.id": "शिकायत ID",
    "audit.table.ward": "वार्ड",
    "audit.table.type": "प्रकार",
    "audit.table.desc": "विवरण",
    "audit.table.hash": "सुरक्षित कोड",
    "audit.table.status": "स्थिति",
    "audit.table.actions": "कार्रवाई",
    "audit.verify": "सत्यापित करें",
    "audit.reject": "खारिज करें",
    "audit.ledgerVerified": "रिकॉर्ड सुरक्षित",

    // Auth Page
    "auth.authorityAccess": "अधिकारी लॉगिन",
    "auth.restrictedDesc": "केवल अधिकृत प्रशासनिक अधिकारियों के लिए।",
    "auth.authorityId": "अधिकारी ID",
    "auth.idPlaceholder": "ID दर्ज करें (उदा. admin)",
    "auth.accessCode": "पासवर्ड",
    "auth.codePlaceholder": "••••••••",
    "auth.authorizeBtn": "लॉगिन करें",
    "auth.securityNotice": "सुरक्षा के लिए सभी लॉगिन की निगरानी की जाती है।",
    "auth.orPublic": "या आम जनता का डेटा देखें",
    "auth.enterCitizen": "नागरिक पोर्टल खोलें",
    "auth.sideTitle": "हर वार्ड के लिए स्वच्छ हवा का संकल्प",
    "auth.sideDesc": "निर्वायु दिल्ली का स्मार्ट प्रदूषण नियंत्रण डैशबोर्ड है। लाइव हवा का हाल जानें, प्रदूषण की शिकायत करें और अपने परिवार की सेहत सुरक्षित रखें।",
    "auth.stat1.val": "272+",
    "auth.stat1.label": "दिल्ली के वार्ड",
    "auth.stat2.val": "लाइव AI",
    "auth.stat2.label": "हवा का पूर्वानुमान",

    // Language Toggle
    "lang.toggle": "भाषा बदलें",
    "lang.en": "English",
    "lang.hi": "हिन्दी",

    // News Bulletin Ticker
    "news.label": "दिल्ली प्रदूषण खबरें",
    "news.zoneLabel": "{zone} हवा की स्थिति",
    "news.loading": "{zone} की ताजा खबरें लोड हो रही हैं…",
    "news.notFound": "{zone} के लिए खबरें उपलब्ध नहीं हैं।",
    "news.agoMinutes": "{m} मि. पहले",
    "news.agoHours": "{h} घंटे पहले",
    "news.agoDays": "{d} दिन पहले",

    // Air Quality Chatbot
    "chat.badge": "निर्वायु AI से पूछें ✨",
    "chat.title": "निर्वायु AI",
    "chat.subtitle": "पर्यावरण व हवा की स्थिति सहायक · दिल्ली",
    "chat.welcome": "नमस्ते! मैं निर्वायु AI हूँ 🌿 मैं हवा की गुणवत्ता, AQI स्तर, सेहत की देखभाल और प्रदूषण की शिकायत दर्ज करने में आपकी मदद कर सकता हूँ। आप क्या जानना चाहते हैं?",
    "chat.placeholder": "AQI, प्रदूषण या सेहत की सलाह पूछें…",
    "chat.listening": "आपकी आवाज़ सुन रहा हूँ...",
    "chat.speaking": "AI बोल रहा है...",
    "chat.micUnsupported": "आपके ब्राउज़र में वॉइस इनपुट सपोर्ट नहीं है",
    "chat.autoSpeechOn": "स्वचालित वॉइस चालू है",
    "chat.autoSpeechOff": "स्वचालित वॉइस बंद है",
    "chat.sug.1": "AQI 200 का क्या मतलब है?",
    "chat.sug.2": "प्रदूषण की शिकायत कैसे करें?",
    "chat.sug.3": "दिल्ली की हवा इतनी खराब क्यों है?",
    "chat.sug.4": "स्मॉग और धुएं से कैसे बचें?",
    "chat.sug.5": "पराली जलाने के क्या नुकसान हैं?",
    "chat.sug.6": "क्या आज बाहर जाना सुरक्षित है?",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("nirvayu_language");
      if (saved === "en" || saved === "hi") return saved;
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("nirvayu_language", lang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
