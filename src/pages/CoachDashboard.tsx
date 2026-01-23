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
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 shadow-2xl border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                لوحة تحكم المدرب
              </h1>
              {coach && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-100 text-lg">
                      المدرب: <span className="font-bold text-white">{coach.full_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <p className="text-blue-100 text-lg">
                      المؤسسة: <span className="font-bold text-white">{coach.organization?.name}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 font-semibold"
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
          <div className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-green-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                اللاعبين المسجلين في الاختبار الحالي
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                  {registeredPlayers.length} لاعب
                </span>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden">تحميل</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">اسم اللاعب</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">الحزام الأخير</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">تاريخ الميلاد</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">تاريخ التسجيل</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registeredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-green-50 transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                            <UserCircle className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getBeltColor(reg.last_belt || 'white')} shadow-sm`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayer(player);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                <div key={reg.id} className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                        <UserCircle className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayer(player);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">تاريخ الميلاد:</span>
                      <span className="font-medium text-gray-900">{reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
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
          <div className="mb-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-lg border border-orange-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-orange-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
                اللاعبين المسجلين في التسجيل الثانوي
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                  {secondaryRegisteredPlayers.length} لاعب
                </span>
                <button
                  onClick={downloadSecondaryRegisteredPlayers}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">تحميل قائمة اللاعبين</span>
                  <span className="sm:hidden">تحميل</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">اسم اللاعب</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">الحزام الأخير</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">تاريخ الميلاد</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">تاريخ التسجيل</th>
                    <th className="py-4 px-6 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {secondaryRegisteredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-orange-50 transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-sm">
                            <UserCircle className="w-6 h-6 text-orange-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getBeltColor(reg.last_belt || 'white')} shadow-sm`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {formatDate(reg.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => {
                            const player = players.find(p => p.id === reg.player_id);
                            if (player) unregisterPlayerSecondary(player);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                <div key={reg.id} className="bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-sm">
                        <UserCircle className="w-7 h-7 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{reg.player_name}</h4>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${getBeltColor(reg.last_belt || 'white')}`}>
                          {getBeltName(reg.last_belt || 'white')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const player = players.find(p => p.id === reg.player_id);
                        if (player) unregisterPlayerSecondary(player);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      إلغاء
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">تاريخ الميلاد:</span>
                      <span className="font-medium text-gray-900">{reg.birth_date ? formatDate(reg.birth_date) : 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
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
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-6 text-white">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">جميع اللاعبين</h2>
                <p className="text-blue-100 text-lg">
                  عدد اللاعبين: <span className="font-semibold text-white">{filteredPlayers.length}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {activeExam && (
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30">
                    <p className="text-white font-semibold text-sm">فترة اختبار نشطة</p>
                    <p className="text-blue-100 text-sm">
                      {activeExam.start_date} إلى {activeExam.end_date}
                    </p>
                  </div>
                )}
                {activeSecondaryRegistration && (
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30">
                    <p className="text-white font-semibold text-sm">فترة تسجيل ثانوي نشطة</p>
                    <p className="text-orange-100 text-sm">
                      {activeSecondaryRegistration.start_date} إلى {activeSecondaryRegistration.end_date}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative mt-6">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-200 w-6 h-6" />
              <input
                type="text"
                placeholder="ابحث عن لاعب (الاسم، الحزام)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-14 pl-6 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 text-lg"
              />
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 text-lg">جاري التحميل...</p>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-600 text-xl font-medium">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
                <p className="text-gray-500 mt-2">ابدأ بإضافة لاعبين جدد للمدرب</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 group"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <UserCircle className="w-9 h-9 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 text-xl truncate group-hover:text-blue-600 transition-colors duration-300">{player.full_name}</h3>
                          <p className="text-sm text-gray-600 font-medium">
                            رقم الملف: <span className="text-blue-600">{player.file_number || 'غير محدد'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {player.registered && (
                          <span className="flex items-center gap-1.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md animate-pulse">
                            <CheckCircle className="w-3.5 h-3.5" />
                            مسجل اختبار
                          </span>
                        )}
                        {player.secondaryRegistered && (
                          <span className="flex items-center gap-1.5 bg-gradient-to-r from-orange-400 to-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md animate-pulse">
                            <BookOpen className="w-3.5 h-3.5" />
                            مسجل ثانوي
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm font-semibold text-gray-700">الحزام:</span>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${getBeltColor(
                            player.belt || 'white'
                          )}`}
                        >
                          {getBeltName(player.belt || 'white')}
                        </span>
                      </div>

                      {player.birth_date && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <span className="text-sm font-semibold text-gray-700">تاريخ الميلاد:</span>
                          <span className="text-sm text-gray-900 font-bold">{formatDate(player.birth_date)}</span>
                        </div>
                      )}

                      {/* أزرار التسجيل */}
                      <div className="space-y-3 pt-3">
                        {/* زر تسجيل الاختبار */}
                        {activeExam && (
                          <div className="flex gap-3">
                            {!player.registered ? (
                              <button
                                onClick={() => registerPlayer(player)}
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                              >
                                تسجيل للاختبار
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayer(player)}
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                              >
                                إلغاء التسجيل من الاختبار
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
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                              >
                                تسجيل ثانوي
                              </button>
                            ) : (
                              <button
                                onClick={() => unregisterPlayerSecondary(player)}
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                              >
                                إلغاء التسجيل الثانوي
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