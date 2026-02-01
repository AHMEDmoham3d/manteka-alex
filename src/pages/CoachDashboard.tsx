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
    <div className="min-h-screen bg-slate-900" dir="rtl">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
                لوحة تحكم المدرب
              </h1>
              {coach && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-slate-300 font-medium">
                    المدرب: <span className="text-white font-semibold">{coach.full_name}</span>
                  </p>
                  <p className="text-sm text-slate-300 font-medium">
                    المؤسسة: <span className="text-white font-semibold">{coach.organization?.name}</span>
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 font-medium border border-slate-600 shadow-md hover:shadow-lg"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
              <span className="sm:hidden">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* قسم اللاعبين المسجلين في الاختبار */}
        {activeExam && registeredPlayers.length > 0 && (
          <div className="mb-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-6">
              <h3 className="text-xl font-serif font-bold text-white flex items-center gap-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                اللاعبين المسجلين في الاختبار الحالي
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <span className="bg-emerald-900/50 text-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-700">
                  {registeredPlayers.length} لاعب مسجل
                </span>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl border border-blue-600"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden">تحميل</span>
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
                  {registeredPlayers.map((reg) => (
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
                            if (player) unregisterPlayer(player);
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
              {registeredPlayers.map((reg) => (
                <div key={reg.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className="w-10 h-10 text-gray-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{reg.player_name}</h4>
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayer(player);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ الميلاد:</span>
                      <span className="font-medium text-gray-900">{reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ التسجيل:</span>
                      <span className="font-medium text-gray-900">{formatDate(reg.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم اللاعبين المسجلين في التسجيل الثانوي */}
        {activeSecondaryRegistration && secondaryRegisteredPlayers.length > 0 && (
          <div className="mb-8 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-6">
              <h3 className="text-xl font-serif font-bold text-white flex items-center gap-4">
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                اللاعبين المسجلين في التسجيل الثانوي
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <span className="bg-amber-900/50 text-amber-200 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-700">
                  {secondaryRegisteredPlayers.length} لاعب مسجل
                </span>
                <button
                  onClick={downloadSecondaryRegisteredPlayers}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl border border-amber-600"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden">تحميل</span>
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
                <div key={reg.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className="w-10 h-10 text-gray-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{reg.player_name}</h4>
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayerSecondary(player);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ الميلاد:</span>
                      <span className="font-medium text-gray-900">{reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">تاريخ التسجيل:</span>
                      <span className="font-medium text-gray-900">{formatDate(reg.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قسم جميع اللاعبين */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">جميع اللاعبين</h2>
                <p className="text-gray-600 text-sm mt-1">
                  عدد اللاعبين: <span className="font-medium text-gray-900 bg-white px-2 py-1 rounded border">{filteredPlayers.length}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {activeExam && (
                  <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-md">
                    <p className="text-blue-900 font-medium text-sm">فترة اختبار نشطة</p>
                    <p className="text-blue-700 text-xs">
                      {activeExam.start_date} إلى {activeExam.end_date}
                    </p>
                  </div>
                )}
                {activeSecondaryRegistration && (
                  <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-md">
                    <p className="text-orange-900 font-medium text-sm">فترة تسجيل ثانوي نشطة</p>
                    <p className="text-orange-700 text-xs">
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
                className="w-full pr-10 pl-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-slate-300 text-xl font-medium">جاري التحميل...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl border border-slate-500">
                  <UserCircle className="w-14 h-14 text-slate-400" />
                </div>
                <p className="text-slate-200 text-2xl font-semibold">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
                <p className="text-slate-400 mt-3 font-medium">ابدأ بإضافة لاعبين جدد للمدرب</p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-700 rounded-xl p-6 shadow-2xl border border-slate-600 hover:shadow-3xl hover:border-slate-500 transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center shadow-lg border border-slate-500">
                          <UserCircle className="w-7 h-7 text-slate-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-white text-lg truncate mb-1">{player.full_name}</h3>
                          <p className="text-sm text-slate-300 font-medium">
                            رقم الملف: <span className="bg-slate-600 px-2 py-1 rounded text-xs text-slate-200 border border-slate-500">{player.file_number || 'غير محدد'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {player.registered && (
                          <span className="flex items-center gap-2 bg-emerald-900/50 text-emerald-200 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-700 shadow-md">
                            <CheckCircle className="w-4 h-4" />
                            اختبار
                          </span>
                        )}
                        {player.secondaryRegistered && (
                          <span className="flex items-center gap-2 bg-amber-900/50 text-amber-200 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-700 shadow-md">
                            <BookOpen className="w-4 h-4" />
                            ثانوي
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">الحزام:</span>
                        <span
                          className={`px-3 py-2 rounded-lg text-sm font-bold shadow-md border ${getBeltColor(
                            player.belt || 'white'
                          )}`}
                        >
                          {getBeltName(player.belt || 'white')}
                        </span>
                      </div>

                      {player.birth_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">تاريخ الميلاد:</span>
                          <span className="text-sm font-semibold text-white bg-slate-600 px-3 py-1 rounded-lg border border-slate-500">{formatDate(player.birth_date)}</span>
                        </div>
                      )}

                      {/* أزرار التسجيل */}
                      <div className="space-y-3 pt-4">
                        {/* زر تسجيل الاختبار */}
                        {activeExam && (
                          <div className="flex gap-3">
                            {!player.registered ? (
                              <button
                                onClick={() => registerPlayer(player)}
                                className="flex-1 px-4 py-3 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-blue-600"
                              >
                                تسجيل للاختبار
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayer(player)}
                                className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-red-600"
                              >
                                إلغاء من الاختبار
                              </button>
                            )}
                          </div>
                        )}

                        {/* زر تسجيل التسجيل الثانوي */}
                        {activeSecondaryRegistration && (
                          <div className="flex gap-3">
                            {!player.secondaryRegistered ? (
                              <button
                                onClick={() => registerPlayerSecondary(player)}
                                className="flex-1 px-4 py-3 bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-amber-600"
                              >
                                تسجيل ثانوي
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayerSecondary(player)}
                                className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-red-600"
                              >
                                إلغاء الثانوي
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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