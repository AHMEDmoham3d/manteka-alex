import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import type { ExamPeriod } from '../lib/supabase';
import { LogOut, Search, UserCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CoachDashboard() {
  const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);

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

      alert('تم تسجيل اللاعب بنجاح!');
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
      alert('حدث خطأ أثناء التسجيل');
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

      alert('تم إلغاء تسجيل اللاعب بنجاح!');
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === player.id ? { ...p, registered: false } : p
        )
      );
      
      setRegisteredPlayers(prev => prev.filter(r => r.player_id !== player.id));
    } catch (error) {
      console.error('Error unregistering player:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل');
    }
  };

  const downloadRegisteredPlayers = () => {
    if (registeredPlayers.length === 0) {
      alert('لا يوجد لاعبين مسجلين للتحميل');
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
        'العمر': playerData?.age || 'غير محدد',
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
        'العمر': `تاريخ التحميل: ${new Date().toLocaleDateString('ar-EG')}`,
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
      { wch: 10 }, // العمر
      { wch: 15 }, // تاريخ التسجيل
      { wch: 20 }, // رقم تسجيل اللاعب
      { wch: 20 }, // رقم تسجيل المدرب
      { wch: 30 }  // فترة الاختبار
    ];
    ws['!cols'] = wscols;

    // إنشاء مصنف وإضافة الورقة
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين المسجلين');

    // توليد اسم الملف
    const fileName = `لاعبين_مسجلين_${coach?.full_name || 'مدرب'}_${new Date().toISOString().split('T')[0]}.xlsx`;

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

        if (activeExamData) {
          // جلب تسجيلات الاختبارات الحالية للمدرب
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

          setPlayers(
            playersList.map(p => ({
              ...p,
              registered: registeredIds.includes(p.id),
            }))
          );
        } else {
          setPlayers(playersList);
        }
        
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم المدرب
              </h1>
              {coach && (
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-600">
                    المدرب: <span className="font-medium text-gray-900">{coach.full_name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    المؤسسة: <span className="font-medium text-gray-900">{coach.organization?.name}</span>
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeExam && registeredPlayers.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                اللاعبين المسجلين في الاختبار الحالي
              </h3>
              <div className="flex items-center gap-4">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {registeredPlayers.length} لاعب
                </span>
                <button
                  onClick={downloadRegisteredPlayers}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  تحميل قائمة اللاعبين
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">اسم اللاعب</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الحزام الأخير</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ الميلاد</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">تاريخ التسجيل</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {registeredPlayers.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{reg.player_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(reg.last_belt || 'white')}`}>
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
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg transition"
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
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">جميع اللاعبين</h2>
                <p className="text-sm text-gray-600 mt-1">
                  عدد اللاعبين: {filteredPlayers.length}
                </p>
              </div>
              {activeExam && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-blue-700 font-medium">فترة اختبار نشطة</p>
                  <p className="text-sm text-blue-600">
                    {activeExam.start_date} إلى {activeExam.end_date}
                  </p>
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن لاعب (الاسم، الحزام)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{player.full_name}</h3>
                          <p className="text-sm text-gray-600">
                            {player.age ? `العمر: ${player.age} سنة` : 'لا يوجد عمر'}
                          </p>
                        </div>
                      </div>
                      {player.registered && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          <CheckCircle className="w-3 h-3" />
                          مسجل
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">الحزام:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(
                            player.belt || 'white'
                          )}`}
                        >
                          {getBeltName(player.belt || 'white')}
                        </span>
                      </div>

                      {player.birth_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">تاريخ الميلاد:</span>
                          <span className="text-sm text-gray-900">{formatDate(player.birth_date)}</span>
                        </div>
                      )}

                      {activeExam && (
                        <div className="pt-2 flex gap-2">
                          {!player.registered ? (
                            <button
                              onClick={() => registerPlayer(player)}
                              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                            >
                              تسجيل للاختبار
                            </button>
                          ) : (
                            <button
                              onClick={() => unregisterPlayer(player)}
                              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                            >
                              إلغاء التسجيل
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