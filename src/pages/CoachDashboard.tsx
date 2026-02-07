import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import type { ExamPeriod, SecondaryRegistrationPeriod } from '../lib/supabase';
import { LogOut, Search, UserCircle, CheckCircle, XCircle, Download, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CoachDashboard() {
  const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [secondaryRegisteredPlayers, setSecondaryRegisteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeSecondaryRegistration, setActiveSecondaryRegistration] = useState<SecondaryRegistrationPeriod | null>(null);

  const registerPlayer = async (player: Player) => {
    if (!activeExam || !user) return;

    try {
      const { error, data } = await supabase
        .from('exam_registrations')
        .insert({
          exam_period_id: activeExam.id,
          player_id: player.id,
          coach_id: user.id,
          player_name: player.full_name,
          birth_date: player.birth_date || null,
          last_belt: player.belt || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      alert('تم تسجيل اللاعب في الاختبار بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, registered: true } : p
        )
      );
      
      if (data) {
        setRegisteredPlayers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error registering player:', error);
      alert('حدث خطأ أثناء التسجيل في الاختبار');
    }
  };

  const unregisterPlayer = async (player: Player) => {
    if (!activeExam || !user) return;

    try {
      const { error } = await supabase
        .from('exam_registrations')
        .delete()
        .match({
          exam_period_id: activeExam.id,
          player_id: player.id,
          coach_id: user.id,
        });

      if (error) throw error;

      alert('تم إلغاء تسجيل اللاعب من الاختبار بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, registered: false } : p
        )
      );
      
      setRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل من الاختبار');
    }
  };

  const registerPlayerSecondary = async (player: Player) => {
    if (!activeSecondaryRegistration || !user) return;

    try {
      const { error, data } = await supabase
        .from('secondary_registrations')
        .insert({
          secondary_period_id: activeSecondaryRegistration.id,
          player_id: player.id,
          coach_id: user.id,
          player_name: player.full_name,
          birth_date: player.birth_date || null,
          last_belt: player.belt || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      alert('تم تسجيل اللاعب في التسجيل الثانوي بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, secondaryRegistered: true } : p
        )
      );
      
      if (data) {
        setSecondaryRegisteredPlayers(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error registering player for secondary registration:', error);
      alert('حدث خطأ أثناء التسجيل في التسجيل الثانوي');
    }
  };

  const unregisterPlayerSecondary = async (player: Player) => {
    if (!activeSecondaryRegistration || !user) return;

    try {
      const { error } = await supabase
        .from('secondary_registrations')
        .delete()
        .match({
          secondary_period_id: activeSecondaryRegistration.id,
          player_id: player.id,
          coach_id: user.id,
        });

      if (error) throw error;

      alert('تم إلغاء تسجيل اللاعب من التسجيل الثانوي بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, secondaryRegistered: false } : p
        )
      );
      
      setSecondaryRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player from secondary registration:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل من التسجيل الثانوي');
    }
  };

  const downloadRegisteredPlayers = () => {
    if (registeredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في الاختبار للتحميل');
      return;
    }

    // تحضير البيانات للتصدير
    const exportData = registeredPlayers.map((player, index) => {
      const playerData = players.find(p => p.id === player.player_id);
      return {
        'م': index + 1,
        'اسم اللاعب': player.player_name,
        'الحزام الأخير': getBeltName(player.last_belt || 'white'),
        'تاريخ الميلاد': player.birth_date ? formatDate(player.birth_date) : 'غير محدد',
        'رقم الملف': playerData?.file_number || 'غير محدد',
        'تاريخ التسجيل': formatDate(player.created_at),
        'رقم تسجيل اللاعب': player.player_id,
        'رقم تسجيل المدرب': player.coach_id || user?.id,
        'فترة الاختبار': activeExam ? `${activeExam.start_date} إلى ${activeExam.end_date}` : 'غير محدد'
      };
    });

    // إضافة معلومات إضافية
    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد اللاعبين: ${registeredPlayers.length}`,
        'الحزام الأخير': `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
        'تاريخ الميلاد': `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'تاريخ التسجيل': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'رقم تسجيل اللاعب': '',
        'رقم تسجيل المدرب': '',
        'فترة الاختبار': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    // إنشاء ورقة عمل
    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    // ضبط عرض الأعمدة
    const wscols = [
      { wch: 5 },  // م
      { wch: 25 }, // اسم اللاعب
      { wch: 15 }, // الحزام الأخير
      { wch: 15 }, // تاريخ الميلاد
      { wch: 15 }, // رقم الملف
      { wch: 15 }, // تاريخ التسجيل
      { wch: 20 }, // رقم تسجيل اللاعب
      { wch: 20 }, // رقم تسجيل المدرب
      { wch: 30 }  // فترة الاختبار
    ];
    ws['!cols'] = wscols;

    // إنشاء مصنف وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين المسجلين في الاختبار');

    // توليد اسم الملف
    const fileName = `لاعبين_مسجلين_اختبار_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // تحميل الملف
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  const downloadSecondaryRegisteredPlayers = () => {
    if (secondaryRegisteredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين في التسجيل الثانوي للتحميل');
      return;
    }

    // تحضير البيانات للتصدير
    const exportData = secondaryRegisteredPlayers.map((player, index) => {
      const playerData = players.find(p => p.id === player.player_id);
      return {
        'م': index + 1,
        'اسم اللاعب': player.player_name,
        'الحزام الأخير': getBeltName(player.last_belt || 'white'),
        'تاريخ الميلاد': player.birth_date ? formatDate(player.birth_date) : 'غير محدد',
        'رقم الملف': playerData?.file_number || 'غير محدد',
        'تاريخ التسجيل': formatDate(player.created_at),
        'رقم تسجيل اللاعب': player.player_id,
        'رقم تسجيل المدرب': player.coach_id || user?.id,
        'فترة التسجيل الثانوي': activeSecondaryRegistration ? `${activeSecondaryRegistration.start_date} إلى ${activeSecondaryRegistration.end_date}` : 'غير محدد'
      };
    });

    // إضافة معلومات إضافية
    const summary = [
      {},
      {
        'م': 'ملخص',
        'اسم اللاعب': `إجمالي عدد اللاعبين: ${secondaryRegisteredPlayers.length}`,
        'الحزام الأخير': `اسم المدرب: ${coach?.full_name || 'غير محدد'}`,
        'تاريخ الميلاد': `المؤسسة: ${coach?.organization?.name || 'غير محدد'}`,
        'رقم الملف': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
        'تاريخ التسجيل': `وقت التحميل: ${new Date().toLocaleTimeString('ar-EG')}`,
        'رقم تسجيل اللاعب': '',
        'رقم تسجيل المدرب': '',
        'فترة التسجيل الثانوي': ''
      },
      {}
    ];

    const finalData = [...exportData, ...summary];

    // إنشاء ورقة عمل
    const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
    
    // ضبط عرض الأعمدة
    const wscols = [
      { wch: 5 },  // م
      { wch: 25 }, // اسم اللاعب
      { wch: 15 }, // الحزام الأخير
      { wch: 15 }, // تاريخ الميلاد
      { wch: 15 }, // رقم الملف
      { wch: 15 }, // تاريخ التسجيل
      { wch: 20 }, // رقم تسجيل اللاعب
      { wch: 20 }, // رقم تسجيل المدرب
      { wch: 30 }  // فترة التسجيل الثانوي
    ];
    ws['!cols'] = wscols;

    // إنشاء مصنف وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين المسجلين في التسجيل الثانوي');

    // توليد اسم الملف
    const fileName = `لاعبين_مسجلين_ثانوي_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // تحميل الملف
    XLSX.writeFile(wb, fileName);
    
    alert(`تم تحميل ملف ${fileName} بنجاح`);
  };

  useEffect(() => {
    const loadCoachData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: coachData } = await supabase
          .from('profiles')
          .select('*, organization:organizations(*)')
          .eq('id', user.id)
          .maybeSingle();

        setCoach(coachData || null);

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('coach_id', user.id)
          .order('full_name');

        const playersList = playersData || [];

        // التحقق من وجود فترة اختبار نشطة
        const today = new Date().toISOString().split('T')[0];
        const { data: activeExamData } = await supabase
          .from('exam_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();

        setActiveExam(activeExamData);

        // جلب فترة التسجيل الثانوي النشطة
        const { data: activeSecondaryData } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();

        setActiveSecondaryRegistration(activeSecondaryData);

        // جلب تسجيلات الاختبارات الحالية للمدرب
        if (activeExamData) {
          const { data: registrations } = await supabase
            .from('exam_registrations')
            .select(`
              id,
              player_id,
              player_name,
              birth_date,
              last_belt,
              created_at,
              coach_id
            `)
            .eq('coach_id', user.id)
            .eq('exam_period_id', activeExamData.id);

          setRegisteredPlayers(registrations || []);

          const registeredIds = registrations?.map(r => r.player_id) || [];

          // تحديث حالة تسجيل الاختبار للاعبين
          playersList.forEach(player => {
            player.registered = registeredIds.includes(player.id);
          });
        }

        // جلب تسجيلات التسجيل الثانوي الحالية للمدرب
        if (activeSecondaryData) {
          const { data: secondaryRegs } = await supabase
            .from('secondary_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('secondary_period_id', activeSecondaryData.id);

          setSecondaryRegisteredPlayers(secondaryRegs || []);

          const secondaryRegisteredIds = secondaryRegs?.map(r => r.player_id) || [];

          // تحديث حالة تسجيل التسجيل الثانوي للاعبين
          playersList.forEach(player => {
            player.secondaryRegistered = secondaryRegisteredIds.includes(player.id);
          });
        }

        setPlayers(playersList);
        setFilteredPlayers(playersList);
      } catch (error) {
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCoachData();
  }, [user]);

  useEffect(() => {
    filterPlayers();
  }, [searchTerm, players]);

  const filterPlayers = () => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (player) =>
        player.full_name.toLowerCase().includes(term) ||
        player.belt?.toLowerCase().includes(term)
    );
    setFilteredPlayers(filtered);
  };

  const getBeltColor = (belt: string) => {
    const colors: Record<string, string> = {
      white: 'bg-gray-200 text-gray-800',
      yellow: 'bg-yellow-200 text-yellow-800',
      orange: 'bg-orange-200 text-orange-800',
      green: 'bg-green-200 text-green-800',
      blue: 'bg-blue-200 text-blue-800',
      brown: 'bg-amber-700 text-white',
      black: 'bg-gray-900 text-white',
    };
    return colors[belt] || 'bg-gray-200 text-gray-800';
  };

  const getBeltName = (belt: string) => {
    const names: Record<string, string> = {
      white: 'أبيض',
      yellow: 'أصفر',
      orange: 'برتقالي',
      green: 'أخضر',
      blue: 'أزرق',
      brown: 'بني',
      black: 'أسود',
    };
    return names[belt] || belt;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-gradient-to-r from-white via-blue-50 to-indigo-50 border-b border-slate-200/60 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <UserCircle className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  لوحة تحكم المدرب
                </h1>
              </div>
              {coach && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border border-slate-200/50">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm"></div>
                    <p className="text-base text-slate-700 font-semibold">
                      المدرب: <span className="text-slate-900 font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{coach.full_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/70 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg border border-slate-200/50">
                    <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm"></div>
                    <p className="text-base text-slate-700 font-semibold">
                      المؤسسة: <span className="text-slate-900 font-bold text-xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{coach.organization?.name}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl transition-all duration-300 font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 border border-red-400/30"
            >
              <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              <span className="hidden sm:inline text-lg">تسجيل الخروج</span>
              <span className="sm:hidden text-lg">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* قسم اللاعبين المسجلين في الاختبار */}
        {activeExam && registeredPlayers.length > 0 && (
          <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    اللاعبين المسجلين في الاختبار الحالي
                  </h3>
                  <p className="text-gray-600 text-base font-medium mt-1">
                    فترة الاختبار: {activeExam.start_date} إلى {activeExam.end_date}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <div className="bg-green-50 border border-green-200 px-6 py-3 rounded-lg">
                  <span className="text-green-800 text-lg font-semibold">
                    {registeredPlayers.length} لاعب مسجل
                  </span>
                </div>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline text-base">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden text-base">تحميل</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-lg">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">اسم اللاعب</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">الحزام الأخير</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">تاريخ الميلاد</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">تاريخ التسجيل</th>
                    <th className="py-4 px-6 text-right text-sm font-bold text-slate-700 border-b border-slate-300">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {registeredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-md">
                            <UserCircle className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="font-semibold text-slate-800">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-2 rounded-xl text-sm font-bold shadow-md border-2 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayer(player);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105"
                        >
                          <XCircle className="w-4 h-4" />
                          إلغاء التسجيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {registeredPlayers.map((reg) => (
                <div key={reg.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayer(player);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-sm">تاريخ الميلاد:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium text-sm">تاريخ التسجيل:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {formatDate(reg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم اللاعبين المسجلين في التسجيل الثانوي */}
        {activeSecondaryRegistration && secondaryRegisteredPlayers.length > 0 && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                اللاعبين المسجلين في التسجيل الثانوي
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
                  <span className="text-amber-800 text-base font-semibold">
                    {secondaryRegisteredPlayers.length} لاعب مسجل
                  </span>
                </div>
                <button
                  onClick={downloadSecondaryRegisteredPlayers}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors duration-200 font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden text-sm">تحميل</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">اسم اللاعب</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">الحزام الأخير</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">تاريخ الميلاد</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">تاريخ التسجيل</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700 border-b">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {secondaryRegisteredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayerSecondary(player);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-all duration-200"
                        >
                          <XCircle className="w-4 h-4" />
                          إلغاء التسجيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {secondaryRegisteredPlayers.map((reg) => (
                <div key={reg.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayerSecondary(player);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium text-sm">تاريخ الميلاد:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium text-sm">تاريخ التسجيل:</span>
                      <span className="text-gray-900 font-medium text-sm">
                        {formatDate(reg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم جميع اللاعبين */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">جميع اللاعبين</h2>
                <p className="text-gray-600 text-sm mt-1">
                  عدد اللاعبين: <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded border border-gray-300">{filteredPlayers.length}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {activeExam && (
                  <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                    <p className="text-blue-900 font-semibold text-sm">فترة اختبار نشطة</p>
                    <p className="text-blue-700 text-xs">
                      {activeExam.start_date} إلى {activeExam.end_date}
                    </p>
                  </div>
                )}
                {activeSecondaryRegistration && (
                  <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
                    <p className="text-amber-900 font-semibold text-sm">فترة تسجيل ثانوي نشطة</p>
                    <p className="text-amber-700 text-xs">
                      {activeSecondaryRegistration.start_date} إلى {activeSecondaryRegistration.end_date}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن لاعب (الاسم، الحزام)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-base"
              />
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6 shadow-xl"></div>
                <p className="text-slate-700 text-xl font-bold">جاري التحميل...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-2 border-slate-300">
                  <UserCircle className="w-16 h-16 text-slate-500" />
                </div>
                <p className="text-slate-800 text-2xl font-bold">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
                <p className="text-slate-600 mt-3 font-medium">ابدأ بإضافة لاعبين جدد للمدرب</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Header with Avatar and Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">{player.full_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">رقم الملف:</span>
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700 font-medium">
                              {player.file_number || 'غير محدد'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {player.registered && (
                          <span className="flex items-center gap-1 bg-green-50 text-green-800 px-2 py-1 rounded text-xs font-medium border border-green-200">
                            <CheckCircle className="w-3 h-3" />
                            اختبار
                          </span>
                        )}
                        {player.secondaryRegistered && (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded text-xs font-medium border border-amber-200">
                            <BookOpen className="w-3 h-3" />
                            ثانوي
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Player Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">الحزام:</span>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getBeltColor(player.belt || 'white')}`}>
                          {getBeltName(player.belt || 'white')}
                        </span>
                      </div>

                      {player.birth_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">تاريخ الميلاد:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(player.birth_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Exam Registration Button */}
                      {activeExam && (
                        <div className="flex gap-2">
                          {!player.registered ? (
                            <button
                              onClick={() => registerPlayer(player)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors duration-200"
                            >
                              <CheckCircle className="w-4 h-4" />
                              تسجيل للاختبار
                            </button>
                          ) : (
                            <button
                              onClick={() => unregisterPlayer(player)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                            >
                              <XCircle className="w-4 h-4" />
                              إلغاء من الاختبار
                            </button>
                          )}
                        </div>
                      )}

                      {/* Secondary Registration Button */}
                      {activeSecondaryRegistration && (
                        <div className="flex gap-2">
                          {!player.secondaryRegistered ? (
                            <button
                              onClick={() => registerPlayerSecondary(player)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded transition-colors duration-200"
                            >
                              <BookOpen className="w-4 h-4" />
                              تسجيل ثانوي
                            </button>
                          ) : (
                            <button
                              onClick={() => unregisterPlayerSecondary(player)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors duration-200"
                            >
                              <XCircle className="w-4 h-4" />
                              إلغاء الثانوي
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}