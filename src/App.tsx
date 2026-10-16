/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Send,
  Terminal,
  FileText,
  Layout,
  Code2,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Plus,
  Settings,
  User,
  CheckCircle2,
  Download,
  Search,
  Bell,
  Home,
  FolderKanban,
  Zap,
  Key,
  Receipt,
  HelpCircle,
  Check,
  ArrowLeft,
  Lock,
  RefreshCcw,
  Paperclip,
  FolderOpen
} from 'lucide-react';

type StitchScreen = 'dashboard' | 'creation-mode' | 'subscription-check' | 'checkout' | 'subscription-success' | 'ai-keys' | 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4' | 'gate-5';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<StitchScreen>('dashboard');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({
    1: [
      { id: '1', sender: 'user', text: 'أريد نظام لإدارة عيادة طبية تشمل إدارة المرضى والمواعيد والفواتير.', time: '10:15' },
      { id: '2', sender: 'ai', text: 'رائع! سأقوم بإعداد وثيقة متطلبات مبدئية للمشروع. هل تريد دعم إشعارات للمواعيد؟ وهل يوجد أكثر من فرع للعيادة؟', time: '10:16' },
      { id: '3', sender: 'user', text: 'نعم، أريد إشعارات واتساب للمرضى، ويوجد فرع واحد فقط.', time: '10:17' },
      { id: '4', sender: 'ai', text: 'تم إضافة إشعارات واتساب إلى المتطلبات. يمكنك مراجعة المستند على الجانب الأيمن.', time: '10:18' }
    ],
    2: [
      { id: '1', sender: 'user', text: 'أريد تصميم واجهة حديثة لنظام إدارة العيادات.', time: '10:20' },
      { id: '2', sender: 'ai', text: 'سأقوم بإنشاء تصميم أولي للشاشات الرئيسية لنظام إدارة العيادات الطبية.', time: '10:21' },
      { id: '3', sender: 'user', text: 'غير لون القائمة الجانبية واجعل البطاقات أكثر بساطة.', time: '10:22' },
      { id: '4', sender: 'ai', text: 'تم تحديث التصميم، يمكنك معاينة الشاشات الجديدة على الجانب الأيمن.', time: '10:23' }
    ],
    3: [
      { id: '1', sender: 'ai', text: 'ابدأ بإنشاء مشروع تطبيق الويب لنظام إدارة العيادات.', time: '10:30' },
      { id: '2', sender: 'ai', text: 'تم إنشاء هيكل المشروع وإعداد الملفات الأساسية. يمكنك معاينة التطبيق الآن.', time: '10:32' },
      { id: '3', sender: 'user', text: 'أضف حقل البحث في صفحة المرضى.', time: '10:34' },
      { id: '4', sender: 'ai', text: 'تم إضافة حقل البحث في صفحة المرضى. يمكنك معاينة التحديثات على الجانب الأيمن.', time: '10:35' }
    ],
    4: [
      { id: '1', sender: 'ai', text: 'سأقوم بتشغيل الاختبارات والتحقق من جودة التطبيق.', time: '10:40' },
      { id: '2', sender: 'ai', text: 'تم تشغيل الاختبارات. يوجد بعض الأخطاء التي تحتاج إلى إصلاح.', time: '10:42' },
      { id: '3', sender: 'user', text: 'قم بإصلاح الأخطاء وأعد تشغيل الاختبارات.', time: '10:44' },
      { id: '4', sender: 'ai', text: 'تم إصلاح الأخطاء وإعادة تشغيل الاختبارات وجميعها نجحت الآن.', time: '10:46' }
    ],
    5: [
      { id: '1', sender: 'ai', text: 'سأقوم بتجهيز حزمة المشروع النهائية بجميع الملفات والوثائق المطلوبة.', time: '11:00' },
      { id: '2', sender: 'ai', text: 'تم إنشاء حزمة المشروع. يمكنك مراجعة محتوياتها.', time: '11:02' }
    ]
  });

  const getGateNumber = () => {
    switch (activeScreen) {
      case 'gate-1': return 1;
      case 'gate-2': return 2;
      case 'gate-3': return 3;
      case 'gate-4': return 4;
      case 'gate-5': return 5;
      default: return 1;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const gNum = getGateNumber();
    const newMsg: ChatMessage = { id: String(Date.now()), sender: 'user', text: chatInput, time: '11:10' };
    setChatMessages(prev => ({
      ...prev,
      [gNum]: [...(prev[gNum] || []), newMsg]
    }));
    setChatInput('');

    setTimeout(() => {
      const replyMsg: ChatMessage = { id: String(Date.now() + 1), sender: 'ai', text: 'تم استلام توجيهك وتحديث المخرجات بنجاح.', time: '11:11' };
      setChatMessages(prev => ({
        ...prev,
        [gNum]: [...(prev[gNum] || []), replyMsg]
      }));
    }, 700);
  };

  const advanceGate = () => {
    if (activeScreen === 'gate-1') setActiveScreen('gate-2');
    else if (activeScreen === 'gate-2') setActiveScreen('gate-3');
    else if (activeScreen === 'gate-3') setActiveScreen('gate-4');
    else if (activeScreen === 'gate-4') setActiveScreen('gate-5');
    else setActiveScreen('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased flex flex-col select-none" dir="rtl">
      {/* Top Switcher Bar for Reviewing All Screens */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700">OGroup AI Factory</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-semibold">المعاينة المطابقة 100% لتصميمات Google Stitch (القائمة الجانبية على اليسار كما في المخطط)</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveScreen('dashboard')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'dashboard' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            1. لوحة التحكم
          </button>
          <button onClick={() => setActiveScreen('creation-mode')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'creation-mode' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            2. اختيار الطريقة
          </button>
          <button onClick={() => setActiveScreen('subscription-check')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'subscription-check' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            3. فحص الاشتراك
          </button>
          <button onClick={() => setActiveScreen('checkout')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'checkout' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            4. صفحة الدفع
          </button>
          <button onClick={() => setActiveScreen('subscription-success')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'subscription-success' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            5. نجاح الاشتراك
          </button>
          <button onClick={() => setActiveScreen('ai-keys')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'ai-keys' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            6. مفاتيح AI
          </button>
          <button onClick={() => setActiveScreen('gate-1')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'gate-1' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            7. بوابة المتطلبات
          </button>
          <button onClick={() => setActiveScreen('gate-2')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'gate-2' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            8. بوابة التصميم
          </button>
          <button onClick={() => setActiveScreen('gate-3')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'gate-3' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            9. بوابة البرمجة
          </button>
          <button onClick={() => setActiveScreen('gate-4')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'gate-4' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            10. بوابة الفحص
          </button>
          <button onClick={() => setActiveScreen('gate-5')} className={`px-2.5 py-1 rounded transition ${activeScreen === 'gate-5' ? 'font-bold bg-white text-orange-600 shadow-sm' : 'font-medium text-slate-600'}`}>
            11. بوابة التسليم
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW (Exact Stitch layout matching image.png: Sidebar on LEFT) */}
      {/* ========================================================================= */}
      {activeScreen === 'dashboard' && (
        <div className="flex-1 flex overflow-hidden bg-slate-50">
          {/* Sidebar on the LEFT as shown in the Stitch screenshot */}
          <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between py-6 px-4">
            <div>
              {/* Brand Logo Header */}
              <div className="flex items-center gap-2.5 pb-6 border-b border-slate-100 mb-6">
                <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-lg tracking-tight leading-tight flex items-center gap-1">
                    <span className="text-orange-600">OGroup</span>
                    <span className="text-xs bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">AI</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold tracking-wider">FACTORY WORKFLOW</div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2 text-sm font-semibold">
                <button onClick={() => setActiveScreen('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-orange-600 bg-orange-50 border border-orange-100 text-right">
                  <Home className="w-5 h-5 text-orange-600" />
                  <span>الرئيسية</span>
                </button>
                <button onClick={() => setActiveScreen('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition text-right">
                  <FolderKanban className="w-5 h-5 text-slate-400" />
                  <span>مشاريعي</span>
                </button>
                <div className="pt-2 pb-2">
                  <button onClick={() => setActiveScreen('creation-mode')} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-md text-xs transition">
                    <Plus className="w-4 h-4" />
                    <span>إنشاء مشروع جديد</span>
                  </button>
                </div>
                <button onClick={() => setActiveScreen('ai-keys')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition text-right">
                  <Key className="w-5 h-5 text-slate-400" />
                  <span>مفاتيح الذكاء الاصطناعي</span>
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-1 text-sm font-semibold">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-50 text-right">
                <Settings className="w-5 h-5 text-slate-400" />
                <span>الإعدادات</span>
              </button>
            </div>
          </aside>

          {/* Main Dashboard Canvas */}
          <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>مرحباً محمد</span>
                  <span>👋</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">حوّل فكرتك إلى برنامج حقيقي باستخدام الذكاء الاصطناعي</p>
              </div>
              <button onClick={() => setActiveScreen('creation-mode')} className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg transition">
                <Plus className="w-5 h-5" />
                <span>إنشاء مشروع جديد</span>
              </button>
            </div>

            {/* Metrics Row matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black text-slate-800">3</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">مشاريعي</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg">3</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black text-blue-600">1</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">قيد التنفيذ</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">1</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black text-emerald-600">2</div>
                  <div className="text-xs font-bold text-slate-500 mt-1">مكتملة</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">2</div>
              </div>
            </div>

            {/* Recent Projects Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-extrabold text-slate-800 text-base">أحدث المشاريع</h2>
                <span className="text-xs font-bold text-orange-600 cursor-pointer">عرض الكل</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">ع</div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">نظام إدارة عيادة طبية</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">تم التحديث منذ ساعتين • بوابة المتطلبات</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full font-bold bg-blue-50 text-blue-600 border border-blue-200">قيد التنفيذ</span>
                    <button onClick={() => setActiveScreen('gate-1')} className="font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition">
                      متابعة البناء ←
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATION MODE VIEW */}
      {/* ========================================================================= */}
      {activeScreen === 'creation-mode' && (
        <main className="flex-1 py-10 px-4 max-w-4xl mx-auto w-full flex flex-col justify-center items-center">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-3">كيف تريد بناء مشروعك؟</h1>
            <p className="text-slate-500">اختر الطريقة المناسبة لهذا المشروع. يمكنك اختيار طريقة مختلفة في كل مشروع جديد.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div onClick={() => setActiveScreen('gate-1')} className="bg-white border-2 border-orange-500 rounded-3xl p-8 shadow-xl cursor-pointer flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 font-bold text-xl">🏭</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">مصنعنا</h2>
                <p className="text-slate-500 text-sm mb-6">نستخدم وكلاء الذكاء الاصطناعي ومفاتيحنا لبناء مشروعك بالكامل دون الحاجة لأي مفاتيح خارجية.</p>
                <div className="text-3xl font-extrabold text-orange-600 mb-6">100 <span className="text-sm font-bold text-slate-700">دينار أردني</span></div>
              </div>
              <button className="w-full py-3.5 bg-orange-500 text-white font-black rounded-2xl shadow-md">اختيار مصنعنا</button>
            </div>
            <div onClick={() => setActiveScreen('subscription-check')} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm cursor-pointer flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 mb-6 font-bold text-xl">🔑</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">استخدم مفاتيحك الخاصة</h2>
                <p className="text-slate-500 text-sm mb-6">اربط مفاتيح الذكاء الاصطناعي الخاصة بك (OpenAI, Anthropic, Gemini) واستخدم المنصة لبناء مشاريعك.</p>
                <div className="text-3xl font-extrabold text-slate-900 mb-6">50 <span className="text-sm font-bold text-slate-700">دينار أردني / شهرياً</span></div>
              </div>
              <button className="w-full py-3.5 bg-white text-slate-800 border-2 border-slate-200 font-bold rounded-2xl">اختيار مفاتيحي الخاصة</button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBSCRIPTION CHECK VIEW */}
      {/* ========================================================================= */}
      {activeScreen === 'subscription-check' && (
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 flex flex-col justify-center items-center">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 max-w-3xl mx-auto w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mx-auto font-bold text-2xl">🔑</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">تحتاج إلى اشتراك نشط</h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                لاستخدام مفاتيحك الخاصة في بناء المشاريع، يجب أن يكون لديك اشتراك شهري نشط بقيمة <span className="font-bold text-slate-800">50 دينار أردني</span>.
              </p>
            </div>
            <div className="pt-4 max-w-md mx-auto space-y-3">
              <button onClick={() => setActiveScreen('checkout')} className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-md transition">
                الاشتراك الآن - 50 دينار أردني شهرياً
              </button>
              <button onClick={() => setActiveScreen('creation-mode')} className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                العودة لاختيار الطريقة
              </button>
            </div>
          </section>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. CHECKOUT VIEW */}
      {/* ========================================================================= */}
      {activeScreen === 'checkout' && (
        <main className="flex-1 py-8 md:py-12 px-4 max-w-4xl mx-auto w-full flex flex-col justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200">
              <section className="p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-b from-white via-orange-50/20 to-orange-50/40">
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 mb-3 font-bold text-xl">👑</div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">الاشتراك الشهري - مفاتيحك الخاصة</h1>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">احصل على وصول كامل للمنصة واستخدم مفاتيح الذكاء الاصطناعي الخاصة بك.</p>
                  </div>
                  <div className="text-center py-5 px-4 my-5 bg-white rounded-xl border border-orange-100 shadow-sm">
                    <div className="text-3xl sm:text-4xl font-extrabold text-orange-600">50 <span className="text-xl">دينار أردني</span></div>
                    <div className="text-xs text-slate-400 mt-1">تجديد شهري تلقائي</div>
                  </div>
                </div>
              </section>

              <section className="p-8 sm:p-10 flex flex-col justify-between bg-white">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-6 text-center">إتمام الاشتراك</h2>
                  <form onSubmit={(e) => { e.preventDefault(); setActiveScreen('subscription-success'); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">اسم حامل البطاقة</label>
                      <input type="text" defaultValue="محمد أحمد" className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">رقم البطاقة</label>
                      <input type="text" defaultValue="1234 5678 9012 3456" className="w-full text-sm font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="MM / YY" className="text-center text-sm font-mono px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg" />
                      <input type="password" placeholder="CVV" className="text-center text-sm font-mono px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg" />
                    </div>
                    <div className="pt-3">
                      <button type="submit" className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-black rounded-xl shadow-md transition flex items-center justify-center gap-2">
                        <span>تأكيد الاشتراك الشهري</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {/* 5. Subscription Success */}
      {activeScreen === 'subscription-success' && (
        <main className="flex-1 py-12 px-4 max-w-2xl mx-auto w-full flex flex-col justify-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md font-bold text-3xl">✓</div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <span>حالة الاشتراك: نشط ومعتمد</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">تم تفعيل اشتراكك بنجاح!</h1>
            <p className="text-slate-600 text-base max-w-lg mx-auto">
              يمكنك الآن استخدام مفاتيحك الخاصة في بناء المشاريع وربط نماذج الذكاء الاصطناعي.
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <button onClick={() => setActiveScreen('ai-keys')} className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md">
              إدارة مفاتيح الذكاء الاصطناعي
            </button>
            <button onClick={() => setActiveScreen('gate-1')} className="w-full py-3 bg-white border border-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-50">
              الانتقال لبوابات البناء
            </button>
          </div>
        </main>
      )}

      {/* 6. AI Keys */}
      {activeScreen === 'ai-keys' && (
        <div className="flex-1 flex overflow-hidden bg-slate-50">
          <main className="flex-1 bg-white p-6 sm:p-10 flex flex-col justify-between max-w-6xl mx-auto my-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">مفاتيح الذكاء الاصطناعي</h1>
                <button onClick={() => alert('إضافة مفتاح جديد')} className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-base font-bold py-2.5 px-6 rounded-xl shadow-md transition">
                  <Plus className="w-5 h-5" />
                  <span>إضافة مفتاح جديد</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-right border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase border-b border-slate-100">
                      <th className="py-4 px-6">المزود</th>
                      <th className="py-4 px-6">النموذج</th>
                      <th className="py-4 px-6">مستخدم في</th>
                      <th className="py-4 px-6 text-center">الحالة</th>
                      <th className="py-4 px-6">آخر استخدام</th>
                      <th className="py-4 px-6 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-4 px-6 font-bold text-slate-800">Google Gemini</td>
                      <td className="py-4 px-6 text-slate-600 text-xs font-mono">gemini-2.5-flash</td>
                      <td className="py-4 px-6">جميع البوابات</td>
                      <td className="py-4 px-6 text-center"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">متصل</span></td>
                      <td className="py-4 px-6 text-slate-500 text-xs font-mono">2026-10-16</td>
                      <td className="py-4 px-6 text-center"><button className="text-slate-400 hover:text-slate-600 font-bold">•••</button></td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="py-4 px-6 font-bold text-slate-800">OpenAI</td>
                      <td className="py-4 px-6 text-slate-600 text-xs font-mono">gpt-4o</td>
                      <td className="py-4 px-6">بوابة البرمجة</td>
                      <td className="py-4 px-6 text-center"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">متصل</span></td>
                      <td className="py-4 px-6 text-slate-500 text-xs font-mono">2026-10-15</td>
                      <td className="py-4 px-6 text-center"><button className="text-slate-400 hover:text-slate-600 font-bold">•••</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-6 flex justify-between items-center">
              <button onClick={() => setActiveScreen('dashboard')} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl">العودة للوحة التحكم</button>
              <button onClick={() => setActiveScreen('gate-3')} className="px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm">الانتقال لبوابة البرمجة</button>
            </div>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7-11. GATES 1 TO 5 WORKSPACES (EXACT STITCH LAYOUT: Sidebar on LEFT) */}
      {/* ========================================================================= */}
      {(activeScreen === 'gate-1' || activeScreen === 'gate-2' || activeScreen === 'gate-3' || activeScreen === 'gate-4' || activeScreen === 'gate-5') && (
        <div className="flex h-[calc(100vh-45px)] w-screen overflow-hidden bg-slate-50">
          {/* Main Sidebar FIRST in DOM = appears on the LEFT in RTL */}
          <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 justify-between py-4 px-3 select-none">
            <div>
              <div className="flex items-center gap-2.5 px-3 py-2 mb-6 cursor-pointer" onClick={() => setActiveScreen('dashboard')}>
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm font-bold">O</div>
                <div className="leading-none">
                  <span className="font-bold text-lg tracking-tight text-slate-800">OGroup</span>
                  <span className="font-bold text-lg text-orange-600">AI</span>
                  <span className="text-xs block font-semibold text-slate-500 uppercase tracking-widest mt-0.5">FACTORY WORKFLOW</span>
                </div>
              </div>

              <nav className="space-y-1.5 text-sm font-semibold">
                <button onClick={() => setActiveScreen('dashboard')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-right">
                  <Home className="w-5 h-5 text-slate-400" />
                  <span>الرئيسية</span>
                </button>
                <button onClick={() => setActiveScreen('dashboard')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-right">
                  <FolderKanban className="w-5 h-5 text-slate-400" />
                  <span>مشاريعي</span>
                </button>
                <button onClick={() => setActiveScreen('creation-mode')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-sm font-bold text-right">
                  <Plus className="w-5 h-5 text-orange-600" />
                  <span>إنشاء مشروع جديد</span>
                </button>
                <button onClick={() => setActiveScreen('ai-keys')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-right">
                  <Key className="w-5 h-5 text-slate-400" />
                  <span>وكلاء الذكاء الاصطناعي</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Workspace Header */}
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-800">نظام إدارة العيادات الطبية</h1>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>تم الحفظ تلقائياً</span>
                </span>
              </div>

              {/* Workflow Stepper (5 to 1 right-to-left) */}
              <div className="hidden md:flex items-center gap-3">
                {[
                  { view: 'gate-5', num: 5, name: 'التسليم' },
                  { view: 'gate-4', num: 4, name: 'الفحص' },
                  { view: 'gate-3', num: 3, name: 'البرمجة' },
                  { view: 'gate-2', num: 2, name: 'التصميم' },
                  { view: 'gate-1', num: 1, name: 'المتطلبات' }
                ].map(st => {
                  const isCurrent = activeScreen === st.view;
                  return (
                    <button
                      key={st.view}
                      onClick={() => setActiveScreen(st.view as StitchScreen)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                        isCurrent ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{st.name}</span>
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{st.num}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 pl-1 pr-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-xs">أ</div>
                  <span className="text-sm font-bold text-slate-700 hidden sm:inline">أحمد محمد</span>
                </div>
                <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                </button>
              </div>
            </header>

            {/* Two-Column Workspace: Left AI Chat, Right Artifact */}
            <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-100/70">
              {/* FIRST IN DOM: AI Chat Agent (Appears on the RIGHT in RTL) */}
              <section className="w-2/5 min-w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-xs">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-sm">
                      {activeScreen === 'gate-1' && 'وكيل المتطلبات'}
                      {activeScreen === 'gate-2' && 'وكيل التصميم'}
                      {activeScreen === 'gate-3' && 'وكيل البرمجة'}
                      {activeScreen === 'gate-4' && 'وكيل الفحص'}
                      {activeScreen === 'gate-5' && 'وكيل التسليم'}
                    </h2>
                    <p className="text-xs text-slate-400">مساعدك الذكي في تجهيز وتحقيق هذه البوابة</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {(chatMessages[getGateNumber()] || []).map(msg => (
                    <div key={msg.id} className={`flex flex-col items-start ${msg.sender === 'user' ? 'mr-auto' : 'ml-auto'}`}>
                      <div className={`px-4 py-3 rounded-2xl leading-relaxed max-w-sm ${msg.sender === 'user' ? 'bg-blue-50 text-slate-800 border border-blue-100 rounded-tr-none' : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1"><Paperclip className="w-4 h-4" /></button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button type="submit" className="w-8 h-8 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center transition shadow-sm">
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </form>
              </section>

              {/* SECOND IN DOM: Live Artifact Workspace (Appears on the LEFT in RTL) */}
              <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden p-6 overflow-y-auto space-y-6">
                {activeScreen === 'gate-1' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <span>وثيقة المتطلبات (PRD) - نظام إدارة العيادات</span>
                      </h3>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">معتمدة</span>
                    </div>
                    <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                      <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-1">
                        <div className="font-bold text-slate-900 text-sm">1. نظرة عامة على المشروع</div>
                        <p>نظام متكامل لإدارة العيادات الطبية يهدف إلى تنظيم العمليات اليومية للعيادة، بما في ذلك إدارة المرضى، المواعيد، الفواتير، والسجلات الطبية، مع دعم إشعارات واتساب للمرضى.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeScreen === 'gate-2' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-orange-600" />
                        <span>معاينة واجهات التصميم ومخطط الشاشات (Wireframes)</span>
                      </h3>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Google Stitch Verified</span>
                    </div>
                    <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-4">
                      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 text-right">
                        <div className="flex justify-between border-b pb-2 font-bold text-xs text-blue-900">
                          <span>عيادة الشفاء التخصصية</span>
                          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-xs font-bold">
                          [ تقويم الحجوزات والمواعيد التفاعلية ]
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeScreen === 'gate-3' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-orange-600" />
                        <span>بوابة البرمجة - محرر الأكواد ومعاينة التطبيق</span>
                      </h3>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Build Success</span>
                    </div>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto text-left" dir="ltr">
                      <span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-emerald-300">'react'</span>;<br /><br />
                      <span className="text-blue-400">export default function</span> <span className="text-yellow-300">ClinicApp</span>() &#123;<br />
                      &nbsp;&nbsp;<span className="text-purple-400">return</span> &lt;<span className="text-teal-300">div</span> className="p-6"&gt;نظام إدارة العيادات الطبية&lt;/<span className="text-teal-300">div</span>&gt;;<br />
                      &#125;
                    </div>
                  </div>
                )}

                {activeScreen === 'gate-4' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-orange-600" />
                        <span>بوابة الفحص وضمان الجودة (Test Suite 100%)</span>
                      </h3>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">All Passed</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <div className="text-2xl font-black text-emerald-700">24</div>
                        <div className="text-xs text-emerald-600 mt-1">اختبار ناجح</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <div className="text-2xl font-black text-emerald-700">0</div>
                        <div className="text-xs text-emerald-600 mt-1">أخطاء حرجة</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <div className="text-2xl font-black text-emerald-700">100%</div>
                        <div className="text-xs text-emerald-600 mt-1">تغطية الكود</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeScreen === 'gate-5' && (
                  <div className="space-y-6">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="font-bold text-slate-800 text-sm">حزمة المشروع النهائية</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-xs">
                        <div className="w-20 h-24 bg-gradient-to-b from-orange-400 to-orange-600 rounded-xl shadow-md flex flex-col items-center justify-center text-white font-black text-xl mb-4">
                          ZIP
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">clinic-management.zip</h3>
                        <p className="text-xs text-slate-400 mb-4">24.5 MB</p>
                        <button onClick={() => alert('تم تنزيل حزمة المشروع بنجاح.')} className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm">
                          <Download className="w-4 h-4" />
                          <span>تحميل المشروع (ZIP)</span>
                        </button>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-2 text-xs font-medium text-slate-600">
                        <h4 className="font-bold text-slate-700 mb-2">محتويات الحزمة</h4>
                        <div className="font-mono text-slate-700">src/</div>
                        <div className="font-mono text-slate-700">backend/</div>
                        <div className="font-mono text-slate-700">database/</div>
                        <div className="font-mono text-slate-500">README.md</div>
                        <div className="font-mono text-slate-500">environment.example</div>
                        <div className="text-red-500">نص تعليمات التشغيل.pdf</div>
                        <div className="text-red-500">نص تعليمات النشر.pdf</div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
                      <span className="text-sm font-extrabold text-emerald-800">اكتمل المشروع بنجاح! ✓</span>
                      <p className="text-xs text-emerald-700">تم تجهيز حزمة المشروع وجميع الوثائق المطلوبة.</p>
                      <button onClick={() => setActiveScreen('dashboard')} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs">
                        العودة إلى لوحة التحكم
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </main>

            {/* Bottom Action Footer */}
            <footer className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
              <button onClick={() => alert('طلب تعديل مرسل للوكيل')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2">
                <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>طلب تعديل</span>
              </button>
              <button onClick={advanceGate} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2">
                <span>اعتماد والانتقال إلى البوابة التالية</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
